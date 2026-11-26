using MiniErp.Application.Features.Dashboard;
using MiniErp.Application.Features.Kpis;
using MiniErp.Domain.Enums;

namespace MiniErp.Tests.Kpis;

public sealed class KpiServiceTests
{
    private static DashboardResponse Dashboard(
        decimal salesNet = 1000, decimal salesOutstanding = 300,
        decimal purchasesOutstanding = 200, decimal inventory = 500,
        decimal cash = 400, decimal cost = 600, decimal? profit = 400, decimal? margin = 40,
        int pending = 0, bool otherCurrency = false)
    {
        var cashes = new List<DashboardCashBalance> { new(CurrencyCode.EGP, 2, cash) };
        if (otherCurrency)
        {
            cashes.Add(new DashboardCashBalance(CurrencyCode.USD, 1, 50));
        }

        return new DashboardResponse(
            1, "2026", new DateOnly(2026, 1, 1), new DateOnly(2026, 12, 31), CurrencyCode.EGP,
            new DashboardMoneySummary(1100, 100, salesNet, salesOutstanding),
            new DashboardMoneySummary(900, 50, 850, purchasesOutstanding),
            new DashboardProfitabilitySummary(salesNet, cost, profit, margin, pending, 0),
            new DashboardInventorySummary(inventory, 6, 6, 0, 0),
            new DashboardEntityCounts(7, 0, 0, 16),
            new DashboardInvoiceStatusSummary(5, 1, 2, 1, 75),
            cashes,
            new DashboardAccountingSummary(true, 0, 0, 0, 0, 0),
            [], []);
    }

    private static decimal? Value(KpiResponse r, string code) => r.Items.Single(i => i.Code == code).Value;

    [Fact]
    public void Build_MapsDashboardFiguresWithoutRecalculatingThem()
    {
        var r = KpiService.Build(Dashboard());

        Assert.Equal(1000, Value(r, "net_sales"));
        Assert.Equal(850, Value(r, "net_purchases"));
        Assert.Equal(600, Value(r, "cogs"));
        Assert.Equal(400, Value(r, "gross_profit"));
        Assert.Equal(40, Value(r, "gross_margin"));
        Assert.Equal(300, Value(r, "receivables"));
        Assert.Equal(200, Value(r, "payables"));
        Assert.Equal(75, Value(r, "overdue_receivables"));
    }

    [Fact]
    public void Build_ComputesWorkingCapitalAndCurrentRatioFromDocumentedFormula()
    {
        var r = KpiService.Build(Dashboard());

        // cash 400 + receivables 300 + inventory 500 = 1200; minus payables 200 = 1000
        Assert.Equal(1000, Value(r, "working_capital"));
        Assert.Equal(6.00m, Value(r, "current_ratio"));
    }

    [Fact]
    public void Build_CurrentRatioIsUnavailableWhenThereAreNoPayables()
    {
        var r = KpiService.Build(Dashboard(purchasesOutstanding: 0));

        Assert.Null(Value(r, "current_ratio"));
    }

    [Fact]
    public void Build_DoesNotInventExpenseOrNetProfit()
    {
        var r = KpiService.Build(Dashboard());

        Assert.Null(Value(r, "operating_expenses"));
        Assert.Null(Value(r, "net_profit"));
        Assert.All(
            r.Items.Where(i => i.Value is null && i.Code is "operating_expenses" or "net_profit"),
            i => Assert.False(string.IsNullOrWhiteSpace(i.Note)));
    }

    [Fact]
    public void Build_KeepsOtherCurrencyCashOutOfTheBaseCurrencyTotal()
    {
        var r = KpiService.Build(Dashboard(otherCurrency: true));

        Assert.Equal(400, Value(r, "cash_balance"));
        Assert.False(string.IsNullOrWhiteSpace(r.Items.Single(i => i.Code == "cash_balance").Note));
    }

    [Fact]
    public void Build_FlagsIncompleteCostWhenInvoicesArePending()
    {
        var r = KpiService.Build(Dashboard(pending: 3, profit: null, margin: null));

        Assert.Null(Value(r, "gross_profit"));
        Assert.Contains("3", r.Items.Single(i => i.Code == "cogs").Note);
    }
}
