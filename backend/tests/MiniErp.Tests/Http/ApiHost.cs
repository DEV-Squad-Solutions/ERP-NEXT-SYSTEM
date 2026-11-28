using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Hosting;
using MiniErp.Api.Startup;
using MiniErp.Infrastructure.Persistence;
using MiniErp.Infrastructure.Persistence.Interceptors;
using MiniErp.Tests.Seeding;
using Xunit.Abstractions;

namespace MiniErp.Tests.Http;

/// <summary>
/// Boots the real API (all controllers, auth, middleware) over a seeded throw-away SQLite database.
/// Test only: no SQL Server, no Hangfire, no real data.
/// </summary>
internal sealed class ApiHost : WebApplicationFactory<Program>
{
    public const string Password = "Dry-Run-Pass-1!";
    private readonly SqliteConnection _connection;

    static ApiHost()
    {
        // Minimal hosting reads configuration eagerly, so these must be real environment variables.
        Environment.SetEnvironmentVariable("ConnectionStrings__DefaultConnection", "Server=unused;Database=unused");
        Environment.SetEnvironmentVariable("Jwt__SigningKey", new string('k', 64));
        Environment.SetEnvironmentVariable("Seed__Enabled", "false");
        Environment.SetEnvironmentVariable("Database__ApplyMigrationsOnStartup", "false");
    }

    public ApiHost(SqliteConnection connection) => _connection = connection;

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");
        builder.ConfigureAppConfiguration((_, config) => config.AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["ConnectionStrings:DefaultConnection"] = "Server=unused;Database=unused",
            ["Jwt:SigningKey"] = new string('k', 64),
            ["Seed:Enabled"] = "false",
            ["Database:ApplyMigrationsOnStartup"] = "false",
        }));
        builder.ConfigureServices(services =>
        {
            foreach (var d in services.Where(d => d.ServiceType == typeof(IHostedService)).ToList()) services.Remove(d);
            services.RemoveAll<DbContextOptions<ApplicationDbContext>>();
            services.RemoveAll<DbContextOptions>();
            services.RemoveAll<ApplicationDbContext>();
            foreach (var d in services.Where(d => d.ServiceType.IsGenericType && d.ServiceType.Name.StartsWith("IDbContextOptionsConfiguration") && d.ServiceType.GenericTypeArguments[0] == typeof(ApplicationDbContext)).ToList()) services.Remove(d);
            services.AddDbContext<ApplicationDbContext>((sp, o) =>
                o.UseSqlite(_connection).AddInterceptors(sp.GetRequiredService<AuditableEntityInterceptor>(), new RowVersionEmulator()));
        });
    }

    public static async Task<ApiHost> CreateAsync(ITestOutputHelper output, int items = 10)
    {
        var (provider, connection, _) = await VolumeSeedFixture.CreateAsync(items, output);
        var host = new ApiHost(connection);
        var status = host.Services.GetRequiredService<StartupDatabaseStatus>();
        typeof(StartupDatabaseStatus).GetMethod("MarkReady", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance)!.Invoke(status, null);
        _ = provider;
        return host;
    }

    /// <summary>Logs in with a seeded user and returns a client carrying its access token for the first company.</summary>
    public async Task<HttpClient> ClientForAsync(string userName)
    {
        var client = CreateClient();
        var login = await client.PostAsJsonAsync("/api/v1/auth/login", new { userName, password = Password });
        login.EnsureSuccessStatusCode();
        var body = await login.Content.ReadFromJsonAsync<JsonElement>();
        var token = body.GetProperty("accessToken").ValueKind == JsonValueKind.String ? body.GetProperty("accessToken").GetString() : null;
        if (token is null)
        {
            var companyId = body.GetProperty("companies")[0].GetProperty("id").GetInt32();
            var sel = await client.PostAsJsonAsync("/api/v1/auth/select-company",
                new { selectionToken = body.GetProperty("selectionToken").GetString(), companyId });
            sel.EnsureSuccessStatusCode();
            token = (await sel.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("accessToken").GetString();
        }
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return client;
    }
}
