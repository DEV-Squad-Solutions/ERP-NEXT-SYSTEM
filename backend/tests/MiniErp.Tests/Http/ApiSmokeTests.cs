using System.Net;
using Xunit.Abstractions;

namespace MiniErp.Tests.Http;

public sealed class ApiSmokeTests(ITestOutputHelper output)
{
    [Fact]
    public async Task Admin_can_read_dashboard_and_anonymous_cannot()
    {
        await using var host = await ApiHost.CreateAsync(output);
        var anon = host.CreateClient();
        Assert.Equal(HttpStatusCode.Unauthorized, (await anon.GetAsync("/api/v1/dashboard")).StatusCode);
        var admin = await host.ClientForAsync("manager1");
        var res = await admin.GetAsync("/api/v1/dashboard");
        output.WriteLine($"dashboard: {(int)res.StatusCode} {(await res.Content.ReadAsStringAsync())[..Math.Min(200, (await res.Content.ReadAsStringAsync()).Length)]}");
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
    }
}
