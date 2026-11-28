using MiniErp.Application.Common.Results;
using MiniErp.Domain.Enums;

namespace MiniErp.Application.Features.InvoicePriceChanges;

public sealed record InvoicePriceChangeItem(int ItemId, decimal NewPrice);

/// <summary>
/// Bulk change of unit prices of one or more items on existing invoice lines inside a date
/// period. Prices are in <see cref="Currency"/>; only invoices in that currency are touched.
/// </summary>
public sealed record InvoicePriceChangePreviewRequest(
    IReadOnlyList<InvoicePriceChangeItem>? Items,
    DateOnly FromDate,
    DateOnly ToDate,
    CurrencyCode Currency,
    InvoiceType? InvoiceType = null,
    bool IncludePosted = false);

/// <summary>
/// Same filters as the preview. ExpectedInvoiceCount must equal the number of invoices the
/// preview reported as eligible, so the apply never touches more than was reviewed.
/// IncludePosted needs ConfirmIncludePosted.
/// </summary>
public sealed record InvoicePriceChangeApplyRequest(
    IReadOnlyList<InvoicePriceChangeItem>? Items,
    DateOnly FromDate,
    DateOnly ToDate,
    CurrencyCode Currency,
    int ExpectedInvoiceCount,
    InvoiceType? InvoiceType = null,
    bool IncludePosted = false,
    bool ConfirmIncludePosted = false);

public enum InvoicePriceChangeSkipReason
{
    HasPayments = 1,
    ClosedPeriod = 2,
    HasLinkedReturns = 3,
    ReturnInvoice = 4,
    PriceAlreadyEqual = 5,
    PaidAmountExceedsNewTotal = 6
}

public sealed record InvoicePriceChangeInvoiceRow(
    int InvoiceId,
    string InvoiceNumber,
    DateOnly InvoiceDate,
    InvoiceType InvoiceType,
    int LinesAffected,
    bool HasPayments,
    decimal OldTotal,
    decimal NewTotal,
    decimal TotalDelta);

public sealed record InvoicePriceChangeSkippedRow(
    int InvoiceId,
    string InvoiceNumber,
    DateOnly InvoiceDate,
    InvoicePriceChangeSkipReason Reason);

public sealed record InvoicePriceChangeItemRow(
    int ItemId,
    string ItemName,
    decimal NewPrice,
    int InvoicesAffected,
    int LinesAffected,
    decimal TotalDelta);

public sealed record InvoicePriceChangePreviewResponse(
    CurrencyCode Currency,
    int InvoicesEligible,
    int LinesEligible,
    decimal TotalDelta,
    bool IncludePosted,
    int PaidInvoicesAffected,
    decimal PaidInvoicesTotalDelta,
    decimal CashboxAmountChange,
    int PaidInvoicesNotIncluded,
    IReadOnlyList<InvoicePriceChangeItemRow> Items,
    IReadOnlyList<InvoicePriceChangeInvoiceRow> Invoices,
    IReadOnlyList<InvoicePriceChangeSkippedRow> Skipped);

public sealed record InvoicePriceChangeApplyResponse(
    int InvoicesChanged,
    int LinesChanged,
    decimal TotalDelta,
    bool IncludePosted,
    int PaidInvoicesChanged,
    IReadOnlyList<InvoicePriceChangeItemRow> Items,
    IReadOnlyList<InvoicePriceChangeInvoiceRow> Invoices,
    IReadOnlyList<InvoicePriceChangeSkippedRow> Skipped);

public interface IInvoicePriceChangeService
{
    Task<Result<InvoicePriceChangePreviewResponse>> PreviewAsync(
        InvoicePriceChangePreviewRequest request,
        CancellationToken cancellationToken = default);

    Task<Result<InvoicePriceChangeApplyResponse>> ApplyAsync(
        InvoicePriceChangeApplyRequest request,
        CancellationToken cancellationToken = default);
}

public static class InvoicePriceChangeErrors
{
    public static Error Invalid(string description, string field) =>
        Error.Validation("InvoicePriceChange.Invalid", description, field);

    public static Error DuplicateItem(int itemId) =>
        Error.Validation(
            "InvoicePriceChange.DuplicateItem",
            $"الصنف رقم {itemId} مكرر في الطلب.",
            "Items");

    public static Error ItemNotFound(int itemId) =>
        Error.NotFound(
            "InvoicePriceChange.ItemNotFound",
            $"الصنف رقم {itemId} غير موجود.",
            "ItemId");

    public static Error ConfirmationRequired() =>
        Error.Validation(
            "InvoicePriceChange.ConfirmationRequired",
            "تعديل الفواتير المسددة أو المرحلة يحتاج تأكيدا صريحا (ConfirmIncludePosted).",
            "ConfirmIncludePosted");

    public static Error PreviewChanged(int expected, int actual) =>
        Error.Conflict(
            "InvoicePriceChange.PreviewChanged",
            $"عدد الفواتير المؤهلة الآن {actual} وليس {expected}. أعد المعاينة قبل التطبيق.",
            "ExpectedInvoiceCount");

    public static Error InvoiceFailed(string invoiceNumber, string detail, bool rolledBack) =>
        Error.Failure(
            "InvoicePriceChange.InvoiceFailed",
            rolledBack
                ? $"تعذر تعديل الفاتورة {invoiceNumber}: {detail}. تمت إعادة الفواتير التي عُدلت قبلها إلى أسعارها السابقة."
                : $"تعذر تعديل الفاتورة {invoiceNumber}: {detail}. تعذرت إعادة بعض الفواتير السابقة، راجع سجل التدقيق.");
}
