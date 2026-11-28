namespace MiniErp.Application.Features.Ai;

/// <summary>
/// Deterministic intent router: maps a question (Arabic or English) to the read-only tools that can
/// answer it. No model, no network, same question always gives the same tools. The overview tool is
/// always included because the built-in analyst and the fallback answer are built from it.
/// </summary>
public static class AiIntentRouter
{
    public const string Overview = "GetCompanyOverview";
    public const string Analytics = "GetAnalytics";
    public const string Kpis = "GetKpis";

    private static readonly string[] AnalyticsWords =
    [
        "اكثر", "أكثر", "افضل", "أفضل", "اعلى", "أعلى", "راكد", "بطيء", "ابطا", "أبطأ", "اشهر", "أشهر",
        "اكتر", "اقل", "نمو", "مديون", "لم يبع", "عمر", "ترتيب", "اتجاه", "تطور", "مقارن", "شهري", "تقادم", "اعمار", "أعمار",
        "growth", "dead", "top", "best", "slow", "trend", "aging", "ageing", "most", "highest", "rank", "monthly"
    ];

    private static readonly string[] KpiWords =
    [
        "مؤشر", "مؤشرات", "معادل", "كفاءة", "kpi", "formula", "ratio", "indicator"
    ];

    public static IReadOnlyList<string> Route(string question, IReadOnlyCollection<string> availableTools)
    {
        var q = Normalize(question);
        var picked = new List<string> { Overview };
        if (AnalyticsWords.Any(w => q.Contains(Normalize(w), StringComparison.Ordinal))) picked.Add(Analytics);
        if (KpiWords.Any(w => q.Contains(Normalize(w), StringComparison.Ordinal))) picked.Add(Kpis);
        return picked.Where(availableTools.Contains).ToList();
    }

    private static string Normalize(string? s) =>
        (s ?? string.Empty).ToLowerInvariant().Replace('أ', 'ا').Replace('إ', 'ا').Replace('آ', 'ا').Replace('ة', 'ه').Replace('ى', 'ي');
}
