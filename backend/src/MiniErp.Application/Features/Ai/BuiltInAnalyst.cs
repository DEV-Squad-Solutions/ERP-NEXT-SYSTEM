using System.Globalization;
using System.Text;
using MiniErp.Application.Features.Analytics;
using MiniErp.Application.Features.Dashboard;

namespace MiniErp.Application.Features.Ai;

/// <summary>
/// Built-in analyst that runs inside the server. No external service, no key, no data leaves the
/// system. It only quotes figures the dashboard service already computed and adds simple, explicit
/// comparisons (ratios, month over month). It never recalculates ledger figures.
/// </summary>
public static class BuiltInAnalyst
{
    public const string ProviderName = "built-in";

    public static string Answer(string question, DashboardResponse d)
    {
        var q = Normalize(question);
        var cur = d.BaseCurrency.ToString();
        var sb = new StringBuilder();
        sb.Append($"الفترة: {d.FromDate:yyyy-MM-dd} إلى {d.ToDate:yyyy-MM-dd} ({d.FiscalYearName}).\n");

        var matched = false;
        void Section(bool on, Action add)
        {
            if (!on) return;
            matched = true;
            add();
        }

        Section(Has(q, "مبيعات", "بيع", "ايراد", "sales", "revenue"), () =>
        {
            sb.Append($"المبيعات: الإجمالي {M(d.Sales.Total, cur)}، المرتجعات {M(d.Sales.Returns, cur)}، الصافي {M(d.Sales.Net, cur)}، المتبقي تحصيله {M(d.Sales.Outstanding, cur)}.\n");
            if (d.Sales.Net > 0)
                sb.Append($"نسبة المتبقي تحصيله من صافي المبيعات {P(d.Sales.Outstanding, d.Sales.Net)}.\n");
        });

        Section(Has(q, "مشتريات", "شراء", "purchase"), () =>
        {
            sb.Append($"المشتريات: الإجمالي {M(d.Purchases.Total, cur)}، المرتجعات {M(d.Purchases.Returns, cur)}، الصافي {M(d.Purchases.Net, cur)}، المتبقي سداده {M(d.Purchases.Outstanding, cur)}.\n");
        });

        Section(Has(q, "ربح", "هامش", "تكلف", "profit", "margin"), () =>
        {
            var p = d.Profitability;
            sb.Append($"الربحية: صافي الإيراد {M(p.NetRevenue, cur)}، التكلفة المعترف بها {M(p.RecognizedCost, cur)}");
            sb.Append(p.GrossProfit is { } gp
                ? $"، مجمل الربح {M(gp, cur)}"
                : "، مجمل الربح غير متاح لأن هناك تكاليف معلقة");
            if (p.GrossMarginPercentage is { } gm) sb.Append($"، الهامش {gm.ToString("0.##", CultureInfo.InvariantCulture)}%");
            sb.Append(".\n");
            if (p.PendingInvoiceCount > 0)
                sb.Append($"تنبيه: {p.PendingInvoiceCount} فاتورة تكلفتها لم تُحسب بعد، فالربح قد يتغير.\n");
        });

        Section(Has(q, "خزين", "نقد", "رصيد", "سيول", "cash", "balance"), () =>
        {
            if (d.CashBalances.Count == 0) sb.Append("لا توجد خزائن مسجلة.\n");
            foreach (var c in d.CashBalances)
                sb.Append($"النقدية: رصيد {c.CashboxCount} خزينة بعملة {c.Currency} هو {c.CurrentBalance:N2}.\n");
        });

        Section(Has(q, "مخزون", "صنف", "بضاع", "inventory", "stock"), () =>
        {
            var i = d.Inventory;
            sb.Append($"المخزون: القيمة الحالية {M(i.CurrentInventoryValue, cur)}، الأصناف النشطة {i.ActiveItemCount}، منها {i.ItemsWithStockCount} بها رصيد و{i.ZeroStockItemCount} رصيدها صفر.\n");
        });

        Section(Has(q, "متاخر", "متأخر", "تحصيل", "عميل", "عملاء", "مستحق", "دين", "overdue", "receivable"), () =>
        {
            var s = d.InvoiceStatus;
            sb.Append($"الفواتير: مدفوعة {s.PaidCount}، مدفوعة جزئيًا {s.PartiallyPaidCount}، غير مدفوعة {s.UnpaidCount}، متأخرة (مبيعات ومشتريات) {s.OverdueCount} بقيمة {M(s.OverdueAmount, cur)}.\n");
        });

        Section(Has(q, "شهر", "اتجاه", "تطور", "مقارن", "trend", "month"), () =>
        {
            var months = d.MonthlyActivity.OrderBy(m => m.Year).ThenBy(m => m.Month).ToList();
            if (months.Count == 0) { sb.Append("لا توجد حركة شهرية في الفترة.\n"); return; }
            var last = months[^1];
            sb.Append($"آخر شهر ({last.Year}/{last.Month:00}): مبيعات {M(last.Sales, cur)} ومشتريات {M(last.Purchases, cur)}.\n");
            if (months.Count > 1)
            {
                var prev = months[^2];
                sb.Append(prev.Sales > 0
                    ? $"مقارنة بالشهر السابق ({prev.Year}/{prev.Month:00}): المبيعات {Change(last.Sales, prev.Sales)}.\n"
                    : "لا يوجد شهر سابق بمبيعات للمقارنة.\n");
                var best = months.OrderByDescending(m => m.Sales).First();
                sb.Append($"أعلى شهر مبيعات: {best.Year}/{best.Month:00} بقيمة {M(best.Sales, cur)}.\n");
            }
        });

        Section(Has(q, "تنبيه", "مشكل", "خطأ", "قيد", "alert", "issue"), () =>
        {
            if (d.Alerts.Count == 0 && d.Accounting.IssueCount == 0) sb.Append("لا توجد تنبيهات حاليًا.\n");
            foreach (var a in d.Alerts) sb.Append($"تنبيه ({a.Severity}): {a.Message} (العدد {a.Count}).\n");
            if (d.Accounting.IssueCount > 0)
                sb.Append($"المحاسبة: {d.Accounting.IssueCount} ملاحظة (قيود غير متوازنة {d.Accounting.UnbalancedJournals}، مصادر بلا قيد {d.Accounting.MissingJournalSources}).\n");
        });

        if (!matched || Has(q, "ملخص", "نظرة", "عام", "حال", "summary", "overview"))
        {
            sb.Append($"الملخص: صافي المبيعات {M(d.Sales.Net, cur)}، صافي المشتريات {M(d.Purchases.Net, cur)}، ");
            sb.Append($"المتبقي تحصيله {M(d.Sales.Outstanding, cur)}، قيمة المخزون {M(d.Inventory.CurrentInventoryValue, cur)}، ");
            sb.Append($"عدد الفواتير {d.Counts.InvoiceCount}، العملاء والموردون {d.Counts.BusinessPartnerCount}، الموظفون {d.Counts.EmployeeCount}.\n");
            if (d.InvoiceStatus.OverdueCount > 0)
                sb.Append($"يستحق الانتباه: {d.InvoiceStatus.OverdueCount} فاتورة متأخرة (مبيعات ومشتريات) بقيمة {M(d.InvoiceStatus.OverdueAmount, cur)}.\n");
            if (!matched)
                sb.Append("يمكنك السؤال عن: المبيعات، المشتريات، الربحية، النقدية، المخزون، الفواتير المتأخرة، الاتجاه الشهري، التنبيهات.\n");
        }

        sb.Append("الأرقام من حسابات النظام مباشرة، والمحلل المدمج يعرضها فقط ولا يعيد حسابها.");
        return sb.ToString();
    }

    /// <summary>
    /// Extra answer for data-analysis questions (top items, customers, suppliers, aging, trend).
    /// Quotes the analytics service figures only. Returns null when the question is not about them.
    /// </summary>
    public static string? AnalyticsAnswer(string question, AnalyticsOverview a)
    {
        var q = Normalize(question);
        var sb = new StringBuilder();
        var cur = a.Period.Currency;

        if (Has(q, "اكثر صنف", "اكتر صنف", "افضل صنف", "الاصناف الاكثر", "top item", "best sell", "best-sell"))
        {
            sb.Append("أعلى الأصناف مبيعًا (صافي بعد المرتجعات): ");
            sb.Append(a.TopItems.Count == 0
                ? "لا توجد مبيعات في الفترة.\n"
                : string.Join("، ", a.TopItems.Select(i => $"{i.Name} {M(i.Revenue, cur)} ({i.SharePercent.ToString("0.#", CultureInfo.InvariantCulture)}%)")) + ".\n");
        }

        if (Has(q, "راكد", "بطيء", "اقل صنف", "لم يبع", "slow", "dead stock"))
        {
            sb.Append(a.SlowItems.Count == 0
                ? "كل الأصناف النشطة لها مبيعات في الفترة.\n"
                : "أصناف نشطة بدون أي مبيعات في الفترة: " + string.Join("، ", a.SlowItems.Select(i => i.Name)) + ".\n");
        }

        if (Has(q, "افضل عميل", "اكبر عميل", "اكثر عميل", "اكتر عميل", "top customer", "best customer"))
        {
            sb.Append(a.TopCustomers.Count == 0
                ? "لا توجد مبيعات لعملاء في الفترة.\n"
                : "أكبر العملاء: " + string.Join("، ", a.TopCustomers.Select(c => $"{c.Name} {M(c.Total, cur)} (متبقي {M(c.Outstanding, cur)})")) + ".\n");
        }

        if (Has(q, "اكبر مورد", "اكثر مورد", "اكتر مورد", "افضل مورد", "top supplier"))
        {
            sb.Append(a.TopSuppliers.Count == 0
                ? "لا توجد مشتريات من موردين في الفترة.\n"
                : "أكبر الموردين: " + string.Join("، ", a.TopSuppliers.Select(c => $"{c.Name} {M(c.Total, cur)} (متبقي {M(c.Outstanding, cur)})")) + ".\n");
        }

        if (Has(q, "اعمار", "عمر الدين", "عمر الديون", "aging", "مديونيات"))
        {
            var r = a.Aging.Receivables;
            var p = a.Aging.Payables;
            sb.Append($"أعمار الديون حتى {a.Aging.AsOf:yyyy-MM-dd}: مستحقات العملاء {M(r.Total, cur)} (لم تستحق {M(r.NotDue, cur)}، 1-30 يوم {M(r.Days1To30, cur)}، 31-60 {M(r.Days31To60, cur)}، 61-90 {M(r.Days61To90, cur)}، أكثر من 90 {M(r.Over90, cur)}).\n");
            sb.Append($"مستحقات الموردين {M(p.Total, cur)} (لم تستحق {M(p.NotDue, cur)}، 1-30 يوم {M(p.Days1To30, cur)}، 31-60 {M(p.Days31To60, cur)}، 61-90 {M(p.Days61To90, cur)}، أكثر من 90 {M(p.Over90, cur)}).\n");
        }

        if (Has(q, "اتجاه المبيعات", "تحليل المبيعات", "نمو", "growth", "sales trend"))
        {
            if (a.Trend.Count == 0) sb.Append("لا توجد حركة شهرية في الفترة.\n");
            else
            {
                var last = a.Trend[^1];
                sb.Append($"آخر شهر ({last.Year}/{last.Month:00}): صافي المبيعات {M(last.Sales, cur)}");
                if (last.SalesChangePercent is { } ch)
                    sb.Append($"، التغيير عن الشهر السابق {ch.ToString("0.#", CultureInfo.InvariantCulture)}%");
                sb.Append(".\n");
            }
        }

        return sb.Length == 0 ? null : sb.ToString();
    }

    private static string Normalize(string s) =>
        (s ?? string.Empty).ToLowerInvariant().Replace('أ', 'ا').Replace('إ', 'ا').Replace('آ', 'ا').Replace('ة', 'ه').Replace('ى', 'ي');

    private static bool Has(string q, params string[] words) =>
        words.Any(w => q.Contains(Normalize(w), StringComparison.Ordinal));

    private static string M(decimal v, string cur) => $"{v:N2} {cur}";

    private static string P(decimal part, decimal whole) =>
        whole == 0 ? "غير متاحة" : $"{(part / whole * 100m).ToString("0.#", CultureInfo.InvariantCulture)}%";

    private static string Change(decimal now, decimal before)
    {
        var pct = (now - before) / before * 100m;
        var text = Math.Abs(pct).ToString("0.#", CultureInfo.InvariantCulture);
        return pct >= 0 ? $"زادت {text}%" : $"نقصت {text}%";
    }
}
