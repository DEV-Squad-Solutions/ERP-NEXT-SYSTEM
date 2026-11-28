using MiniErp.Application.Common.Abstractions;
using MiniErp.Application.Common.Results;

namespace MiniErp.Application.Features.Analytics;

/// <summary>Date range and list size for the analysis. Dates default to the last 12 months.</summary>
public sealed record AnalyticsQuery(DateOnly? FromDate = null, DateOnly? ToDate = null, int Top = 10);

public sealed record AnalyticsItemRow(int ItemId, string Name, decimal Quantity, decimal Revenue, decimal SharePercent);

public sealed record AnalyticsPartnerRow(int PartnerId, string Name, int InvoiceCount, decimal Total, decimal Outstanding);

public sealed record AnalyticsMonthRow(int Year, int Month, decimal Sales, decimal Purchases, decimal? SalesChangePercent);

public sealed record AnalyticsAgingBuckets(decimal NotDue, decimal Days1To30, decimal Days31To60, decimal Days61To90, decimal Over90)
{
    public decimal Total => NotDue + Days1To30 + Days31To60 + Days61To90 + Over90;
}

public sealed record AnalyticsAging(DateOnly AsOf, AnalyticsAgingBuckets Receivables, AnalyticsAgingBuckets Payables);

public sealed record AnalyticsPeriod(DateOnly FromDate, DateOnly ToDate, string Currency);

public sealed record AnalyticsOverview(
    AnalyticsPeriod Period,
    IReadOnlyList<AnalyticsItemRow> TopItems,
    IReadOnlyList<AnalyticsItemRow> SlowItems,
    IReadOnlyList<AnalyticsPartnerRow> TopCustomers,
    IReadOnlyList<AnalyticsPartnerRow> TopSuppliers,
    IReadOnlyList<AnalyticsMonthRow> Trend,
    AnalyticsAging Aging);

/// <summary>
/// Data analysis computed from the company's own invoices with plain queries.
/// No external service, nothing leaves the server. Amounts are in the company base currency.
/// Returns are subtracted from sales and purchases (net figures).
/// </summary>
public interface IAnalyticsService : IScopedService
{
    Task<Result<AnalyticsOverview>> GetOverviewAsync(AnalyticsQuery query, CancellationToken cancellationToken = default);
}
