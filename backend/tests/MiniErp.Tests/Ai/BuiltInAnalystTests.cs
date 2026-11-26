using MiniErp.Application.Features.Ai;
using MiniErp.Application.Features.Dashboard;
using MiniErp.Domain.Enums;

namespace MiniErp.Tests.Ai;

public sealed class BuiltInAnalystTests
{
    private static DashboardResponse Sample() => new(
        1, "2026", new DateOnly(2026, 1, 1), new DateOnly(2026, 12, 31), default,
        new DashboardMoneySummary(1000m, 100m, 900m, 300m),
        new DashboardMoneySummary(500m, 0m, 500m, 100m),
        new DashboardProfitabilitySummary(900m, 600m, 300m, 33.33m, 0, 0m),
        new DashboardInventorySummary(777m, 10, 8, 2, 0),
        new DashboardEntityCounts(5, 3, 0, 12),
        new DashboardInvoiceStatusSummary(4, 2, 3, 1, 250m),
        [],
        new DashboardAccountingSummary(true, 0, 0, 0, 0, 0),
        [new DashboardMonthlyActivity(2026, 1, 100m, 50m), new DashboardMonthlyActivity(2026, 2, 150m, 40m)],
        []);

    [Fact]
    public void Sales_question_quotes_system_figures_and_collection_ratio()
    {
        var a = BuiltInAnalyst.Answer("كم صافي المبيعات؟", Sample());
        Assert.Contains("900.00", a);
        Assert.Contains("300.00", a);
        Assert.Contains("33.3%", a);
    }

    [Fact]
    public void Trend_question_compares_last_two_months()
    {
        var a = BuiltInAnalyst.Answer("اتجاه المبيعات الشهري", Sample());
        Assert.Contains("زادت 50%", a);
    }

    [Fact]
    public void Unknown_question_gives_summary_and_topic_hints()
    {
        var a = BuiltInAnalyst.Answer("xyz", Sample());
        Assert.Contains("الملخص", a);
        Assert.Contains("يمكنك السؤال عن", a);
    }
}
