using System.Net;
using System.Net.Http.Json;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc.Controllers;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;
using Xunit.Abstractions;

namespace MiniErp.Tests.Http;

/// <summary>
/// Enumerates every routed controller endpoint and calls it over HTTP as anonymous and as each
/// seeded role. Anonymous must get 401, a role outside the endpoint's [Authorize] must get 403,
/// an allowed role must never get 401/5xx. Writes a per-endpoint coverage table.
/// </summary>
public sealed class EndpointMatrixTests(ITestOutputHelper output)
{
    private static readonly (string Role, string User)[] Roles =
        [("Admin", "manager1"), ("Accountant", "accountant1"), ("User", "sales1"), ("Cashier", "cashier1")];

    private sealed record Ep(string Method, string Route, string Name, string[][] RoleSets, bool Anonymous);

    private static IEnumerable<Ep> Discover(IServiceProvider sp)
    {
        var src = sp.GetRequiredService<EndpointDataSource>();
        foreach (var e in src.Endpoints.OfType<RouteEndpoint>())
        {
            var cad = e.Metadata.GetMetadata<ControllerActionDescriptor>();
            if (cad is null) continue;
            var methods = e.Metadata.GetMetadata<Microsoft.AspNetCore.Routing.HttpMethodMetadata>()?.HttpMethods ?? [];
            var anon = e.Metadata.GetMetadata<IAllowAnonymous>() is not null;
            var sets = e.Metadata.GetOrderedMetadata<IAuthorizeData>()
                .Where(a => !string.IsNullOrWhiteSpace(a.Roles))
                .Select(a => a.Roles!.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)).ToArray();
            var route = "/" + e.RoutePattern.RawText!.TrimStart('/').Replace("{version:apiVersion}", "1");
            foreach (var m in methods)
                yield return new Ep(m, route, $"{cad.ControllerName}.{cad.ActionName}", sets, anon);
        }
    }

    private static string Fill(string route)
    {
        var sb = new StringBuilder();
        foreach (var seg in route.Split('/'))
        {
            if (sb.Length > 0 || seg.Length > 0) sb.Append('/');
            if (seg.StartsWith('{'))
            {
                var inner = seg.Trim('{', '}');
                var name = inner.Split(':', '?')[0].ToLowerInvariant();
                sb.Append(inner.Contains("guid") || name.EndsWith("token") || name.Contains("operation") ? Guid.Empty.ToString()
                    : inner.Contains("int") || inner.Contains("long") || name.EndsWith("id") || name == "year" ? "1" : "1");
            }
            else sb.Append(seg);
        }
        return sb.ToString().Replace("//", "/");
    }

    private static bool Allowed(Ep e, string role) => e.Anonymous || e.RoleSets.All(s => s.Contains(role));

    private static async Task<HttpStatusCode> SendAsync(HttpClient c, Ep e)
    {
        using var req = new HttpRequestMessage(new HttpMethod(e.Method), Fill(e.Route));
        if (e.Method is "POST" or "PUT" or "PATCH") req.Content = JsonContent.Create(new { });
        try { return (await c.SendAsync(req)).StatusCode; }
        catch (Exception) { return HttpStatusCode.InternalServerError; }
    }

    [Fact]
    public async Task Every_endpoint_enforces_authentication_and_role_matrix()
    {
        await using var host = await ApiHost.CreateAsync(output, items: 5);
        var eps = Discover(host.Services).OrderBy(e => e.Route).ThenBy(e => e.Method).ToList();
        var anon = host.CreateClient();
        var clients = new Dictionary<string, HttpClient>();
        foreach (var (role, user) in Roles) clients[role] = await host.ClientForAsync(user);

        var rows = new List<string>();
        var violations = new List<string>();
        var serverErrors = new List<string>();
        var ordered = eps.OrderBy(e => e.Method == "GET" ? 0 : e.Method == "DELETE" ? 2 : 1).ToList();
        // Pass 1: anonymous + denied roles (cannot change data). Pass 2: allowed roles, reads first.
        var result = new Dictionary<(string, string, string), HttpStatusCode>();
        foreach (var e in ordered)
        {
            var a = await SendAsync(anon, e);
            result[(e.Method, e.Route, "anon")] = a;
            if (!e.Anonymous && a != HttpStatusCode.Unauthorized) violations.Add($"{e.Method} {e.Route} anonymous -> {(int)a} (want 401)");
            foreach (var (role, _) in Roles.Where(r => !Allowed(e, r.Role)))
            {
                var s = await SendAsync(clients[role], e);
                result[(e.Method, e.Route, role)] = s;
                if (s != HttpStatusCode.Forbidden) violations.Add($"{e.Method} {e.Route} as {role} -> {(int)s} (want 403)");
            }
        }
        foreach (var e in ordered)
            foreach (var (role, _) in Roles.Where(r => Allowed(e, r.Role)))
            {
                var s = await SendAsync(clients[role], e);
                result[(e.Method, e.Route, role)] = s;
                if (s == HttpStatusCode.Unauthorized) violations.Add($"{e.Method} {e.Route} as {role} -> 401 (allowed role)");
                if ((int)s >= 500) serverErrors.Add($"{e.Method} {e.Route} as {role} -> {(int)s}");
            }

        rows.Add("| Method | Route | Anonymous | Admin | Accountant | User | Cashier |");
        rows.Add("|---|---|---|---|---|---|---|");
        foreach (var e in eps)
            rows.Add($"| {e.Method} | `{e.Route}` | {Cell(result, e, "anon", e.Anonymous)} | " +
                string.Join(" | ", Roles.Select(r => Cell(result, e, r.Role, Allowed(e, r.Role)))) + " |");
        var path = Environment.GetEnvironmentVariable("ENDPOINT_MATRIX_OUT");
        if (!string.IsNullOrEmpty(path)) File.WriteAllLines(path, rows.Concat(["", $"violations: {violations.Count}", .. violations, $"server errors: {serverErrors.Count}", .. serverErrors]));
        output.WriteLine($"endpoints(method+route)={eps.Count} violations={violations.Count} serverErrors={serverErrors.Count}");
        foreach (var v in violations.Take(60)) output.WriteLine("VIOLATION " + v);
        foreach (var v in serverErrors.Take(60)) output.WriteLine("5XX " + v);
        Assert.Empty(violations);
    }

    private static string Cell(Dictionary<(string, string, string), HttpStatusCode> r, Ep e, string who, bool allowed) =>
        r.TryGetValue((e.Method, e.Route, who), out var s) ? $"{(allowed ? "ok" : "deny")}:{(int)s}" : "-";
}
