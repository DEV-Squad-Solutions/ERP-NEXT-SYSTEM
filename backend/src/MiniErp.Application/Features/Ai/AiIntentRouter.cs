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

    private static readonly string[] AuditWords =
    [
        "مين عدل", "مين حذف", "مين غير", "مين عمل", "مين اضاف", "مين انشا", "من قام", "من الذي", "من الذى", "سجل التدقيق", "سجل العمليات",
        "who edited", "who deleted", "who changed", "who created", "who modified", "who added", "who updated", "audit"
    ];
    private static readonly string[] PayslipWords = ["راتب", "مرتب", "قسيم", "اجر", "payslip", "salary", "payroll", "wage"];
    private static readonly string[] EmployeeWords = ["موظف", "employee"];
    private static readonly string[] PartnerWords = ["عميل", "مورد", "زبون", "customer", "supplier", "partner", "client", "vendor"];
    private static readonly string[] BalanceWords =
        ["رصيد", "حساب", "كشف", "مديون", "مستحق", "دفعه", "سداد", "مدفوع", "balance", "statement", "account", "owe", "payment", "paid", "due"];
    private static readonly string[] InvoiceWords = ["فاتوره", "فواتير", "invoice"];
    private static readonly string[] ItemWords = ["صنف", "منتج", "بضاعه", "item", "product"];
    private static readonly string[] StockWords = ["رصيد", "مخزون", "كميه", "متوفر", "موجود", "stock", "quantity", "balance", "available", "inventory"];

    // Latin words match from a word start ("aging" must not hit "packaging"); Arabic words match anywhere (prefixes attach to them).
    private static bool Has(string q, string w)
    {
        var n = Normalize(w);
        return n.All(c => c is >= 'a' and <= 'z' or ' ')
            ? System.Text.RegularExpressions.Regex.IsMatch(q, @"(?<![a-z])" + System.Text.RegularExpressions.Regex.Escape(n))
            : q.Contains(n, StringComparison.Ordinal);
    }

    private static bool Any(string q, string[] words) => words.Any(w => Has(q, w));

    /// <summary>Entity lookup tools for a question, in order. Empty when the question is about company-wide figures.</summary>
    public static IReadOnlyList<string> RouteEntities(string question, IReadOnlyCollection<string> availableTools)
    {
        var q = Normalize(question);
        var picked = new List<string>();
        // Ranking and trend questions ("top customers") are company-wide analytics, not a record lookup.
        if (!Any(q, AuditWords) && Any(q, AnalyticsWords)) return picked;
        if (Any(q, AuditWords)) picked.Add("GetAuditTrail");
        else
        {
            var payslip = Any(q, PayslipWords);
            var employee = Any(q, EmployeeWords);
            var partner = Any(q, PartnerWords);
            var balance = Any(q, BalanceWords);
            var invoice = Any(q, InvoiceWords);
            if (payslip) picked.Add("GetEmployeePayslip");
            if (employee && (balance || !payslip)) picked.Add("GetEmployeeSummary");
            if (invoice && !employee) picked.Add("GetPartnerInvoices");
            if (partner && (balance || !invoice) ) picked.Add("GetPartnerSummary");
            if (Any(q, ItemWords) && Any(q, StockWords)) picked.Add("GetItemStock");
            // "balance of X" with no type word: look in partners and employees and let the answer say which matched.
            if (picked.Count == 0 && balance && !Any(q, ["الشهر", "الشركه", "خزين", "خزن", "cash", "company", "total", "اجمالي"]) && NameLike(question))
            {
                picked.Add("GetPartnerSummary");
                picked.Add("GetEmployeeSummary");
            }
        }

        return picked.Distinct().Where(availableTools.Contains).ToList();
    }

    private static bool NameLike(string question) => AiNameResolver.NameTokens(question).Count > 0;

    public static IReadOnlyList<string> Route(string question, IReadOnlyCollection<string> availableTools)
    {
        var q = Normalize(question);
        var picked = new List<string> { Overview };
        if (Any(q, AnalyticsWords)) picked.Add(Analytics);
        if (Any(q, KpiWords)) picked.Add(Kpis);
        return picked.Where(availableTools.Contains).ToList();
    }

    private static string Normalize(string? s) =>
        (s ?? string.Empty).ToLowerInvariant().Replace('أ', 'ا').Replace('إ', 'ا').Replace('آ', 'ا').Replace('ة', 'ه').Replace('ى', 'ي');
}
