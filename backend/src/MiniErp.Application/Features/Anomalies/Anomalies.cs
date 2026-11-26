using MiniErp.Application.Common.Abstractions;
using MiniErp.Application.Common.Results;

namespace MiniErp.Application.Features.Anomalies;

public sealed record AnomalyPoint(string Reference, DateOnly Date, decimal Amount, string Kind);

public sealed record AnomalyItem(
    string Kind,
    string Reference,
    DateOnly Date,
    decimal Amount,
    decimal Median,
    decimal Score,
    string Reason,
    string ReviewStatus);

public sealed record AnomalyReport(
    int PointsAnalysed,
    bool HasEnoughHistory,
    string Method,
    IReadOnlyList<AnomalyItem> Items,
    string? Note);

public interface IAnomalyService : IScopedService
{
    Task<Result<AnomalyReport>> DetectAsync(CancellationToken cancellationToken = default);
}

/// <summary>
/// Deterministic robust outlier rule (median and MAD). Nothing is flagged without enough history,
/// and every flag stays PendingReview: a person decides, the system never acts on it.
/// </summary>
public static class AnomalyDetector
{
    public const int MinPoints = 8;
    public const decimal Threshold = 3.5m;
    public const string MethodName = "modified z-score (median/MAD), threshold 3.5";

    public static AnomalyReport Detect(IReadOnlyList<AnomalyPoint> points)
    {
        var items = new List<AnomalyItem>();
        var enough = true;
        foreach (var group in points.GroupBy(p => p.Kind))
        {
            var list = group.ToList();
            if (list.Count < MinPoints)
            {
                enough = false;
                continue;
            }

            var median = Median(list.Select(p => p.Amount).ToList());
            var mad = Median(list.Select(p => Math.Abs(p.Amount - median)).ToList());
            foreach (var p in list)
            {
                decimal score;
                if (mad == 0)
                {
                    if (p.Amount == median) continue;
                    score = Threshold + 1; // everything else is identical: any deviation stands out
                }
                else
                {
                    score = Math.Round(0.6745m * Math.Abs(p.Amount - median) / mad, 2);
                }

                if (score > Threshold)
                {
                    items.Add(new AnomalyItem(
                        p.Kind, p.Reference, p.Date, p.Amount, median, score,
                        $"Amount {p.Amount:0.##} is far from the usual {median:0.##} for {p.Kind}.",
                        "PendingReview"));
                }
            }
        }

        return new AnomalyReport(
            points.Count,
            enough && points.Count > 0,
            MethodName,
            items.OrderByDescending(i => i.Score).ToList(),
            enough && points.Count > 0
                ? null
                : "Not enough history (at least 8 documents per kind) to judge. Nothing was flagged.");
    }

    private static decimal Median(List<decimal> values)
    {
        values.Sort();
        var n = values.Count;
        return n % 2 == 1 ? values[n / 2] : (values[(n / 2) - 1] + values[n / 2]) / 2m;
    }
}
