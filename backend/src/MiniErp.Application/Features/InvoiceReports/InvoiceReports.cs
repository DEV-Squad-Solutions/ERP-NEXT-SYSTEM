using MiniErp.Application.Common.Abstractions;
using MiniErp.Application.Common.Results;

namespace MiniErp.Application.Features.InvoiceReports;

public sealed record InvoiceSummaryFilterRequest(DateOnly? FromDate, DateOnly? ToDate);

public sealed record InvoiceTypeSummary(
    string InvoiceType,
    int Count,
    decimal Total,
    decimal Paid,
    decimal Outstanding);

public sealed record InvoiceMonthSummary(
    int Year,
    int Month,
    decimal SalesTotal,
    decimal PurchasesTotal);

public sealed record InvoiceSummaryResponse(
    DateOnly FromDate,
    DateOnly ToDate,
    string BaseCurrency,
    IReadOnlyList<InvoiceTypeSummary> Types,
    IReadOnlyList<InvoiceMonthSummary> Months,
    decimal NetSales,
    decimal NetPurchases);

public sealed record InvoiceAgingFilterRequest(string? Kind, DateOnly? AsOfDate);

public sealed record InvoiceAgingRow(
    int PartnerId,
    string PartnerName,
    decimal NotDue,
    decimal Days1To30,
    decimal Days31To60,
    decimal Days61To90,
    decimal Over90,
    decimal Total);

public sealed record InvoiceAgingResponse(
    string Kind,
    DateOnly AsOfDate,
    string BaseCurrency,
    IReadOnlyList<InvoiceAgingRow> Rows,
    InvoiceAgingRow Totals);

public interface IInvoiceReportService : IScopedService
{
    Task<Result<InvoiceSummaryResponse>> GetSummaryAsync(
        InvoiceSummaryFilterRequest filters,
        CancellationToken cancellationToken = default);

    Task<Result<InvoiceAgingResponse>> GetAgingAsync(
        InvoiceAgingFilterRequest filters,
        CancellationToken cancellationToken = default);
}
