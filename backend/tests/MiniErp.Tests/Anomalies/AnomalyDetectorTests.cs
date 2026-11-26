using MiniErp.Application.Features.Anomalies;

namespace MiniErp.Tests.Anomalies;

public sealed class AnomalyDetectorTests
{
    private static List<AnomalyPoint> Series(params decimal[] amounts) =>
        amounts.Select((a, i) => new AnomalyPoint($"S-{i}", new DateOnly(2026, 11, 1).AddDays(i), a, "Sales")).ToList();

    [Fact]
    public void Short_history_flags_nothing()
    {
        var r = AnomalyDetector.Detect(Series(100, 100, 5000));
        Assert.False(r.HasEnoughHistory);
        Assert.Empty(r.Items);
        Assert.NotNull(r.Note);
    }

    [Fact]
    public void Outlier_is_flagged_pending_review()
    {
        var r = AnomalyDetector.Detect(Series(100, 105, 98, 102, 101, 99, 103, 100, 5000));
        Assert.True(r.HasEnoughHistory);
        var item = Assert.Single(r.Items);
        Assert.Equal("S-8", item.Reference);
        Assert.Equal("PendingReview", item.ReviewStatus);
    }

    [Fact]
    public void Normal_series_has_no_flags()
    {
        var r = AnomalyDetector.Detect(Series(100, 105, 98, 102, 101, 99, 103, 100, 104));
        Assert.Empty(r.Items);
    }

    [Fact]
    public void Identical_values_with_one_deviation_flags_that_one()
    {
        var r = AnomalyDetector.Detect(Series(100, 100, 100, 100, 100, 100, 100, 100, 900));
        Assert.Single(r.Items);
    }

    [Fact]
    public void Empty_input_is_safe()
    {
        var r = AnomalyDetector.Detect([]);
        Assert.False(r.HasEnoughHistory);
        Assert.Empty(r.Items);
    }
}
