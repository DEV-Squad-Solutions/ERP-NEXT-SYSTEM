using MiniErp.Application.Features.Ai;

namespace MiniErp.Tests.Ai;

public sealed class AiIntentRouterTests
{
    private static readonly string[] All = ["GetCompanyOverview", "GetAnalytics", "GetKpis"];

    [Theory]
    [InlineData("كام مبيعات الشهر ده؟", "GetCompanyOverview")]
    [InlineData("what is my cash balance", "GetCompanyOverview")]
    [InlineData("مين أكتر عميل اشترى؟", "GetCompanyOverview,GetAnalytics")]
    [InlineData("top customers this quarter", "GetCompanyOverview,GetAnalytics")]
    [InlineData("اعمار الديون", "GetCompanyOverview,GetAnalytics")]
    [InlineData("ايه مؤشرات الأداء؟", "GetCompanyOverview,GetKpis")]
    [InlineData("show kpi formulas and best items", "GetCompanyOverview,GetAnalytics,GetKpis")]
    [InlineData("", "GetCompanyOverview")]
    public void Router_is_deterministic_and_picks_only_needed_tools(string q, string expected)
    {
        Assert.Equal(expected, string.Join(',', AiIntentRouter.Route(q, All)));
        Assert.Equal(expected, string.Join(',', AiIntentRouter.Route(q, All)));
    }

    [Fact]
    public void Router_never_returns_a_tool_that_is_not_registered()
    {
        Assert.Equal(["GetCompanyOverview"], AiIntentRouter.Route("top customers kpi", ["GetCompanyOverview"]));
    }
}
