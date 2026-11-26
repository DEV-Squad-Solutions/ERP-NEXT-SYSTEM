using MiniErp.Application.Common.Abstractions;
using MiniErp.Application.Common.Results;

namespace MiniErp.Application.Features.Forecasting;

public sealed record MonthlyAmount(int Year, int Month, decimal Amount);

public sealed record ForecastMonth(int Year, int Month, decimal Expected, decimal Low, decimal High);

public sealed record ForecastReport(
    string Metric,
    int MonthsOfHistory,
    bool Produced,
    string Method,
    IReadOnlyList<ForecastMonth> Months,
    string? Note);

public interface IForecastService : IScopedService
{
    Task<Result<ForecastReport>> ForecastSalesAsync(CancellationToken cancellationToken = default);
}

/// <summary>
/// Deterministic linear-trend forecast over complete months. Refuses when history is too short.
/// The range is the residual spread, so a noisy history gives a wide range. It is an estimate, not a promise.
/// </summary>
public static class ForecastCalculator
{
    public const int MinMonths = 6;
    public const int Horizon = 3;
    public const string MethodName = "least-squares linear trend over monthly totals, range = +/- 1.5 x residual std dev";

    public static ForecastReport Forecast(string metric, IReadOnlyList<MonthlyAmount> history)
    {
        var data = history.OrderBy(h => h.Year).ThenBy(h => h.Month).ToList();
        if (data.Count < MinMonths)
        {
            return new ForecastReport(metric, data.Count, false, MethodName, [],
                $"Not enough history: {data.Count} complete months, at least {MinMonths} are needed. No forecast produced.");
        }

        var n = data.Count;
        var xs = Enumerable.Range(0, n).Select(i => (double)i).ToArray();
        var ys = data.Select(d => (double)d.Amount).ToArray();
        var xm = xs.Average();
        var ym = ys.Average();
        var sxx = xs.Sum(x => (x - xm) * (x - xm));
        var slope = sxx == 0 ? 0 : xs.Zip(ys, (x, y) => (x - xm) * (y - ym)).Sum() / sxx;
        var intercept = ym - (slope * xm);
        var resid = Math.Sqrt(xs.Zip(ys, (x, y) => Math.Pow(y - (intercept + (slope * x)), 2)).Sum() / Math.Max(1, n - 2));

        var last = data[^1];
        var months = new List<ForecastMonth>();
        for (var k = 1; k <= Horizon; k++)
        {
            var date = new DateOnly(last.Year, last.Month, 1).AddMonths(k);
            var expected = Math.Max(0, intercept + (slope * (n - 1 + k)));
            var low = Math.Max(0, expected - (1.5 * resid));
            var high = expected + (1.5 * resid);
            months.Add(new ForecastMonth(
                date.Year, date.Month,
                Math.Round((decimal)expected, 2), Math.Round((decimal)low, 2), Math.Round((decimal)high, 2)));
        }

        return new ForecastReport(metric, n, true, MethodName, months, "Estimate only. Based on past totals, not on orders or events.");
    }
}
