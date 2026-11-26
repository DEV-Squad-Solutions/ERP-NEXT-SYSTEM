using MiniErp.Application.Common.Abstractions;
using MiniErp.Application.Common.Results;
using MiniErp.Application.Features.Dashboard;
using MiniErp.Domain.Enums;

namespace MiniErp.Application.Features.Kpis;

/// <summary>One deterministic business figure with its formula. AI may explain it, never recompute it.</summary>
public sealed record KpiItem(
    string Code,
    string Name,
    decimal? Value,
    string Unit,
    string Formula,
    string? Note);

public sealed record KpiResponse(
    int FiscalYearId,
    string FiscalYearName,
    DateOnly FromDate,
    DateOnly ToDate,
    CurrencyCode BaseCurrency,
    IReadOnlyList<KpiItem> Items);

public interface IKpiService : IScopedService
{
    Task<Result<KpiResponse>> GetAsync(
        DashboardFilterRequest filters,
        CancellationToken cancellationToken = default);
}

/// <summary>
/// Builds KPIs only from the figures the existing dashboard already computes (company scoped from the JWT),
/// so KPIs always agree with the dashboard. KPIs that need data the ERP does not expose here are returned
/// with a null value and a note instead of an invented number.
/// </summary>
public sealed class KpiService(IDashboardService dashboardService) : IKpiService
{
    public async Task<Result<KpiResponse>> GetAsync(
        DashboardFilterRequest filters,
        CancellationToken cancellationToken = default)
    {
        var result = await dashboardService.GetAsync(filters, cancellationToken);
        if (!result.IsSuccess)
        {
            return Result<KpiResponse>.Failure(result.Errors);
        }

        return Result<KpiResponse>.Success(Build(result.Value));
    }

    public static KpiResponse Build(DashboardResponse d)
    {
        var currency = d.BaseCurrency.ToString();
        var baseCash = d.CashBalances
            .Where(c => c.Currency == d.BaseCurrency)
            .Sum(c => c.CurrentBalance);
        var otherCurrencies = d.CashBalances.Any(c => c.Currency != d.BaseCurrency);

        var receivables = d.Sales.Outstanding;
        var payables = d.Purchases.Outstanding;
        var inventory = d.Inventory.CurrentInventoryValue;
        var currentAssets = baseCash + receivables + inventory;

        decimal? margin = d.Profitability.GrossMarginPercentage;
        decimal? currentRatio = payables > 0 ? Math.Round(currentAssets / payables, 2) : null;

        var items = new List<KpiItem>
        {
            new("net_sales", "صافي المبيعات", d.Sales.Net, currency,
                "إجمالي المبيعات - مرتجعات المبيعات", null),
            new("net_purchases", "صافي المشتريات", d.Purchases.Net, currency,
                "إجمالي المشتريات - مرتجعات المشتريات", null),
            new("cogs", "تكلفة البضاعة المباعة", d.Profitability.RecognizedCost, currency,
                "التكلفة المعترف بها للفواتير المسعرة",
                d.Profitability.PendingInvoiceCount > 0
                    ? $"يوجد {d.Profitability.PendingInvoiceCount} فاتورة غير مسعرة، فالتكلفة غير مكتملة."
                    : null),
            new("gross_profit", "مجمل الربح", d.Profitability.GrossProfit, currency,
                "صافي الإيراد - التكلفة المعترف بها",
                d.Profitability.GrossProfit is null ? "غير متاح حتى تسعير الفواتير." : null),
            new("gross_margin", "هامش مجمل الربح", margin, "%",
                "مجمل الربح / صافي الإيراد × 100", margin is null ? "غير متاح." : null),
            new("cash_balance", "رصيد الخزائن بعملة الشركة", baseCash, currency,
                "مجموع أرصدة الخزائن بعملة الشركة الأساسية",
                otherCurrencies ? "توجد خزائن بعملات أخرى لم تُدمج هنا لتجنب التحويل غير الدقيق." : null),
            new("receivables", "العملاء (المستحق)", receivables, currency,
                "المتبقي على فواتير المبيعات", null),
            new("payables", "الموردون (المستحق)", payables, currency,
                "المتبقي على فواتير المشتريات", null),
            new("inventory_value", "قيمة المخزون", inventory, currency,
                "قيمة المخزون الحالية حسب التكلفة", null),
            new("overdue_receivables", "مبالغ متأخرة", d.InvoiceStatus.OverdueAmount, currency,
                "مجموع الفواتير المتأخرة السداد", null),
            new("working_capital", "رأس المال العامل (تقريبي)", currentAssets - payables, currency,
                "الخزائن + العملاء + المخزون - الموردون",
                "تقدير تشغيلي من أرقام لوحة التحكم، وليس قائمة مركز مالي محاسبية."),
            new("current_ratio", "نسبة التداول (تقريبية)", currentRatio, "x",
                "(الخزائن + العملاء + المخزون) / الموردون",
                currentRatio is null ? "غير متاح لعدم وجود التزامات للموردين." : "تقدير تشغيلي وليس قائمة مركز مالي."),
            new("operating_expenses", "المصروفات التشغيلية", null, currency,
                "يتطلب تجميع مصروفات الخزينة حسب الحسابات",
                "غير متاح بعد في هذه المرحلة."),
            new("net_profit", "صافي الربح", null, currency,
                "مجمل الربح - المصروفات التشغيلية",
                "غير متاح قبل ربط المصروفات التشغيلية.")
        };

        return new KpiResponse(
            d.FiscalYearId, d.FiscalYearName, d.FromDate, d.ToDate, d.BaseCurrency, items);
    }
}
