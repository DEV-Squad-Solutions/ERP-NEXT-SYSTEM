using MiniErp.Application.Features.Forecasting;

namespace MiniErp.Tests.Forecasting;

public sealed class ForecastCalculatorTests
{
    private static List<MonthlyAmount> Months(params decimal[] a) =>
        a.Select((v, i) => new MonthlyAmount(2026, 1 + i, v)).ToList();

    [Fact]
    public void Refuses_with_short_history()
    {
        var r = ForecastCalculator.Forecast("NetSales", Months(100, 110, 120));
        Assert.False(r.Produced);
        Assert.Empty(r.Months);
        Assert.NotNull(r.Note);
    }

    [Fact]
    public void Perfect_linear_trend_extends_exactly()
    {
        var r = ForecastCalculator.Forecast("NetSales", Months(100, 200, 300, 400, 500, 600));
        Assert.True(r.Produced);
        Assert.Equal(3, r.Months.Count);
        Assert.Equal(700m, r.Months[0].Expected);
        Assert.Equal(800m, r.Months[1].Expected);
        Assert.Equal(700m, r.Months[0].Low);
        Assert.Equal(2026, r.Months[0].Year);
        Assert.Equal(7, r.Months[0].Month);
    }

    [Fact]
    public void Never_forecasts_negative()
    {
        var r = ForecastCalculator.Forecast("NetSales", Months(600, 500, 400, 300, 200, 100));
        Assert.All(r.Months, m => Assert.True(m.Expected >= 0 && m.Low >= 0));
    }

    [Fact]
    public void Wraps_year_for_december()
    {
        var h = Enumerable.Range(0, 6).Select(i => new MonthlyAmount(2026, 7 + i, 100)).ToList();
        var r = ForecastCalculator.Forecast("NetSales", h);
        Assert.Equal(2027, r.Months[0].Year);
        Assert.Equal(1, r.Months[0].Month);
    }
}
