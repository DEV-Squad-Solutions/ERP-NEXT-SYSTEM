using System.Reflection;
using MiniErp.Application.Features.Ai;
using MiniErp.Application.Features.Anomalies;
using MiniErp.Application.Features.Dashboard;
using MiniErp.Application.Features.Forecasting;

namespace MiniErp.Tests.Ai;

/// <summary>
/// Company isolation by construction: nothing a caller (or the AI) sends can name a company.
/// The company always comes from the authenticated user inside the services.
/// </summary>
public sealed class AiIsolationTests
{
    private static bool NamesCompany(Type t) =>
        t.GetProperties().Any(p => p.Name.Contains("Company", StringComparison.OrdinalIgnoreCase));

    [Fact]
    public void Request_models_cannot_carry_a_company()
    {
        Assert.False(NamesCompany(typeof(AiAskRequest)));
        Assert.False(NamesCompany(typeof(DashboardFilterRequest)));
    }

    [Fact]
    public void Tool_registry_has_no_free_form_query_or_company_parameter()
    {
        foreach (var m in typeof(IAiToolRegistry).GetMethods())
        {
            foreach (var p in m.GetParameters())
            {
                Assert.DoesNotContain("company", p.Name!, StringComparison.OrdinalIgnoreCase);
                Assert.DoesNotContain("sql", p.Name!, StringComparison.OrdinalIgnoreCase);
                Assert.DoesNotContain("query", p.Name!, StringComparison.OrdinalIgnoreCase);
            }
        }
    }

    [Fact]
    public void Analytics_services_take_no_company_argument()
    {
        foreach (var type in new[] { typeof(IAnomalyService), typeof(IForecastService), typeof(IAiAssistantService) })
        {
            foreach (var m in type.GetMethods())
            {
                Assert.DoesNotContain(m.GetParameters(), p =>
                    p.Name!.Contains("company", StringComparison.OrdinalIgnoreCase));
            }
        }
    }

    [Fact]
    public async Task Unknown_tool_is_rejected_not_executed()
    {
        var registry = new AiToolRegistry(null!, null!);
        var r = await registry.ExecuteAsync("DropAllTables", new DashboardFilterRequest());
        Assert.NotNull(r.Error);
        Assert.Null(r.Data);
    }

    [Fact]
    public void Ai_endpoints_require_admin_role()
    {
        foreach (var name in new[] { "AiController", "AnomaliesController", "ForecastsController" })
        {
            var t = typeof(MiniErp.Api.Controllers.ApiControllerBase).Assembly.GetTypes().Single(x => x.Name == name);
            var auths = t.GetCustomAttributes<Microsoft.AspNetCore.Authorization.AuthorizeAttribute>(false).ToList();
            Assert.Contains(auths, a => a.Roles != null && a.Roles.Contains("Admin"));
        }
    }
}
