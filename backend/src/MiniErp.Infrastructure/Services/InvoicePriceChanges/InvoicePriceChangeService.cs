using System.Text.Json;
using Mapster;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using MiniErp.Application.Common.Abstractions;
using MiniErp.Application.Common.Results;
using MiniErp.Application.Features.InvoicePriceChanges;
using MiniErp.Application.Features.Invoices;
using MiniErp.Domain.Entities.Auditing;
using MiniErp.Domain.Entities.Invoicing;
using MiniErp.Domain.Enums;
using MiniErp.Infrastructure.Persistence;
using MiniErp.Infrastructure.Services.AuditLogs;
using static MiniErp.Application.Features.InvoicePriceChanges.InvoicePriceChangeErrors;

namespace MiniErp.Infrastructure.Services.InvoicePriceChanges;

/// <summary>
/// Changes unit prices of one or more items on existing invoice lines. Each invoice is rewritten
/// once through <see cref="IInvoiceService.UpdateAsync"/>, so totals, stock cost, journal entries,
/// partner statements and fiscal-year rules follow the normal edit path. The run is all or nothing:
/// if one invoice fails, the invoices already changed are put back to their old prices.
/// Paid invoices are only touched with IncludePosted. Returns are never touched.
/// </summary>
public sealed class InvoicePriceChangeService(
    ApplicationDbContext dbContext,
    ICurrentCompanyContext currentCompanyContext,
    IInvoiceService invoiceService,
    IInvoiceQueryService invoiceQueryService,
    IHttpContextAccessor httpContextAccessor,
    TimeProvider timeProvider,
    IFiscalYearPeriodGuard? fiscalYearPeriodGuard = null)
    : IInvoicePriceChangeService, IScopedService
{
    private const int MaximumItems = 50;

    private readonly int companyId = currentCompanyContext.CompanyId;

    private sealed record Classified(
        IReadOnlyList<InvoicePriceChangeItemRow> Items,
        IReadOnlyList<InvoicePriceChangeInvoiceRow> Eligible,
        IReadOnlyList<InvoicePriceChangeSkippedRow> Skipped,
        int LinesEligible,
        int PaidNotIncluded,
        decimal CashboxAmountChange);

    private sealed record Step(IReadOnlyDictionary<int, decimal> OldPrices, decimal NewTotal);

    public async Task<Result<InvoicePriceChangePreviewResponse>> PreviewAsync(
        InvoicePriceChangePreviewRequest request,
        CancellationToken cancellationToken = default)
    {
        var classified = await ClassifyAsync(
            request.Items, request.FromDate, request.ToDate, request.Currency,
            request.InvoiceType, request.IncludePosted, cancellationToken);
        if (classified.IsFailure)
        {
            return Result<InvoicePriceChangePreviewResponse>.Failure(classified.Errors);
        }

        var c = classified.Value;
        return Result<InvoicePriceChangePreviewResponse>.Success(
            new InvoicePriceChangePreviewResponse(
                Currency: request.Currency,
                InvoicesEligible: c.Eligible.Count,
                LinesEligible: c.LinesEligible,
                TotalDelta: c.Eligible.Sum(row => row.TotalDelta),
                IncludePosted: request.IncludePosted,
                PaidInvoicesAffected: c.Eligible.Count(row => row.HasPayments),
                PaidInvoicesTotalDelta: c.Eligible.Where(row => row.HasPayments).Sum(row => row.TotalDelta),
                CashboxAmountChange: c.CashboxAmountChange,
                PaidInvoicesNotIncluded: c.PaidNotIncluded,
                Items: c.Items,
                Invoices: c.Eligible,
                Skipped: c.Skipped));
    }

    public async Task<Result<InvoicePriceChangeApplyResponse>> ApplyAsync(
        InvoicePriceChangeApplyRequest request,
        CancellationToken cancellationToken = default)
    {
        if (request.IncludePosted && !request.ConfirmIncludePosted)
        {
            return Result<InvoicePriceChangeApplyResponse>.Failure(ConfirmationRequired());
        }

        var classified = await ClassifyAsync(
            request.Items, request.FromDate, request.ToDate, request.Currency,
            request.InvoiceType, request.IncludePosted, cancellationToken);
        if (classified.IsFailure)
        {
            return Result<InvoicePriceChangeApplyResponse>.Failure(classified.Errors);
        }

        var c = classified.Value;
        if (c.Eligible.Count != request.ExpectedInvoiceCount)
        {
            return Result<InvoicePriceChangeApplyResponse>.Failure(
                PreviewChanged(request.ExpectedInvoiceCount, c.Eligible.Count));
        }

        var prices = request.Items!.ToDictionary(i => i.ItemId, i => i.NewPrice);
        var done = new List<(int InvoiceId, IReadOnlyDictionary<int, decimal> OldPrices)>();
        var changedRows = new List<InvoicePriceChangeInvoiceRow>();
        foreach (var row in c.Eligible)
        {
            var step = await ChangePricesAsync(row.InvoiceId, prices, restore: null, cancellationToken);
            if (step.IsFailure)
            {
                var rolledBack = await RollBackAsync(done, cancellationToken);
                return Result<InvoicePriceChangeApplyResponse>.Failure(
                    InvoiceFailed(row.InvoiceNumber, step.Error.Description, rolledBack));
            }

            done.Add((row.InvoiceId, step.Value.OldPrices));
            changedRows.Add(row with
            {
                NewTotal = step.Value.NewTotal,
                TotalDelta = step.Value.NewTotal - row.OldTotal
            });
            await WriteAuditAsync(row, request, prices, step.Value.OldPrices, cancellationToken);
        }

        return Result<InvoicePriceChangeApplyResponse>.Success(
            new InvoicePriceChangeApplyResponse(
                InvoicesChanged: changedRows.Count,
                LinesChanged: changedRows.Sum(row => row.LinesAffected),
                TotalDelta: changedRows.Sum(row => row.TotalDelta),
                IncludePosted: request.IncludePosted,
                PaidInvoicesChanged: changedRows.Count(row => row.HasPayments),
                Items: c.Items,
                Invoices: changedRows,
                Skipped: c.Skipped));
    }

    /// <summary>
    /// Rewrites one invoice. With <paramref name="restore"/> the lines at the given positions get
    /// those exact prices (used to undo); otherwise lines of the listed items get the new price.
    /// </summary>
    private async Task<Result<Step>> ChangePricesAsync(
        int invoiceId,
        IReadOnlyDictionary<int, decimal> prices,
        IReadOnlyDictionary<int, decimal>? restore,
        CancellationToken cancellationToken)
    {
        dbContext.ChangeTracker.Clear();
        var current = await invoiceQueryService.GetByIdAsync(invoiceId, cancellationToken: cancellationToken);
        if (current.IsFailure)
        {
            return Result<Step>.Failure(current.Errors);
        }

        var update = current.Value.Adapt<InvoiceUpdateRequest>();
        var oldPrices = new Dictionary<int, decimal>();
        var lines = update.Lines.ToArray();
        for (var i = 0; i < lines.Length; i++)
        {
            if (restore is not null)
            {
                if (restore.TryGetValue(i, out var back))
                {
                    lines[i] = lines[i] with { Price = back };
                }
            }
            else if (lines[i].ItemId is int itemId && prices.TryGetValue(itemId, out var price) &&
                     lines[i].Price != price)
            {
                oldPrices[i] = lines[i].Price;
                lines[i] = lines[i] with { Price = price };
            }
        }

        // A cash invoice must stay fully paid, so its payment follows the new total.
        var paidAmount = update.PaidAmount;
        if (update.PaymentTerm == PaymentTerm.Cash && update.PaidAmount > 0m)
        {
            var subtotal = 0m;
            foreach (var line in lines)
            {
                if (!InvoiceAmountRules.TryCalculate(
                        line.Count ?? 0, line.Weight ?? 0m, line.Price, out _, out var lineTotal))
                {
                    return Result<Step>.Failure(Invalid("قيم سطر الفاتورة غير صالحة.", "Lines"));
                }

                subtotal += lineTotal;
            }

            paidAmount = decimal.Round(
                subtotal - update.DiscountAmount, InvoiceAmountRules.MoneyScale, MidpointRounding.AwayFromZero);
        }

        var result = await invoiceService.UpdateAsync(
            invoiceId,
            update with { Lines = lines, PaidAmount = paidAmount, RowVersion = current.Value.RowVersion },
            cancellationToken);
        return result.IsFailure
            ? Result<Step>.Failure(result.Errors)
            : Result<Step>.Success(new Step(oldPrices, result.Value.Total));
    }

    private async Task<bool> RollBackAsync(
        List<(int InvoiceId, IReadOnlyDictionary<int, decimal> OldPrices)> done,
        CancellationToken cancellationToken)
    {
        var ok = true;
        for (var i = done.Count - 1; i >= 0; i--)
        {
            var back = await ChangePricesAsync(
                done[i].InvoiceId, new Dictionary<int, decimal>(), done[i].OldPrices, cancellationToken);
            ok &= back.IsSuccess;
        }

        return ok;
    }

    private async Task WriteAuditAsync(
        InvoicePriceChangeInvoiceRow row,
        InvoicePriceChangeApplyRequest request,
        IReadOnlyDictionary<int, decimal> prices,
        IReadOnlyDictionary<int, decimal> oldPrices,
        CancellationToken cancellationToken)
    {
        var (userId, role, _, ip) = AuditActor.ReadClaims(httpContextAccessor.HttpContext);
        dbContext.AuditLogs.Add(new AuditLog
        {
            CompanyId = companyId,
            OccurredOn = timeProvider.GetUtcNow().UtcDateTime,
            UserId = userId,
            UserName = await AuditActor.ResolveNameAsync(dbContext, userId, cancellationToken),
            Role = role,
            Action = "PriceChange",
            EntityType = "Invoice",
            EntityId = row.InvoiceId.ToString(),
            Summary = $"تعديل أسعار أصناف في الفاتورة {row.InvoiceNumber}" +
                (request.IncludePosted ? " (مع تضمين الفواتير المسددة)" : string.Empty),
            Details = JsonSerializer.Serialize(new
            {
                invoiceNumber = row.InvoiceNumber,
                includePosted = request.IncludePosted,
                invoiceHadPayments = row.HasPayments,
                lines = oldPrices.Select(pair => new { lineIndex = pair.Key, oldPrice = pair.Value }),
                newPrices = prices.Select(pair => new { itemId = pair.Key, newPrice = pair.Value }),
                oldTotal = row.OldTotal,
                newTotal = row.NewTotal,
                from = request.FromDate,
                to = request.ToDate
            }),
            ClientIp = ip,
            IsPermanent = true
        });
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    private async Task<Result<Classified>> ClassifyAsync(
        IReadOnlyList<InvoicePriceChangeItem>? items,
        DateOnly from,
        DateOnly to,
        CurrencyCode currency,
        InvoiceType? invoiceType,
        bool includePosted,
        CancellationToken cancellationToken)
    {
        if (items is null || items.Count == 0)
            return Result<Classified>.Failure(Invalid("يجب تحديد صنف واحد على الأقل.", "Items"));
        if (items.Count > MaximumItems)
            return Result<Classified>.Failure(Invalid($"الحد الأقصى {MaximumItems} صنفا في الطلب.", "Items"));
        var prices = new Dictionary<int, decimal>();
        foreach (var item in items)
        {
            if (item.ItemId <= 0)
                return Result<Classified>.Failure(Invalid("يجب تحديد صنف صالح.", "Items"));
            if (!prices.TryAdd(item.ItemId, item.NewPrice))
                return Result<Classified>.Failure(DuplicateItem(item.ItemId));
            if (item.NewPrice <= 0 ||
                decimal.Round(item.NewPrice, InvoiceAmountRules.MoneyScale) != item.NewPrice ||
                item.NewPrice >= 1_000_000_000_000m)
                return Result<Classified>.Failure(Invalid(
                    "السعر الجديد يجب أن يكون أكبر من صفر وبخانتين عشريتين كحد أقصى.", "Items"));
        }

        if (from > to)
            return Result<Classified>.Failure(Invalid("تاريخ البداية يجب ألا يكون بعد تاريخ النهاية.", "FromDate"));
        if (!Enum.IsDefined(currency))
            return Result<Classified>.Failure(Invalid("العملة غير صالحة.", "Currency"));
        if (invoiceType is not (null or InvoiceType.Sales or InvoiceType.Purchase))
            return Result<Classified>.Failure(Invalid("النوع يجب أن يكون بيع أو شراء.", "InvoiceType"));

        dbContext.ChangeTracker.Clear();
        var ids = prices.Keys.ToList();
        var names = await dbContext.Items
            .AsNoTracking()
            .Where(i => ids.Contains(i.Id) && i.CompanyId == companyId)
            .Select(i => new { i.Id, i.Name })
            .ToDictionaryAsync(i => i.Id, i => i.Name, cancellationToken);
        foreach (var id in ids)
        {
            if (!names.ContainsKey(id))
                return Result<Classified>.Failure(ItemNotFound(id));
        }

        var query = dbContext.Invoices
            .AsNoTracking()
            .Include(i => i.Lines)
            .Where(i => i.CompanyId == companyId &&
                        i.InvoiceDate >= from && i.InvoiceDate <= to &&
                        i.Currency == currency &&
                        i.Lines.Any(l => l.ItemId != null && ids.Contains(l.ItemId.Value)));
        if (invoiceType is { } type)
            query = query.Where(i => i.InvoiceType == type);
        var invoices = await query
            .OrderBy(i => i.InvoiceDate).ThenBy(i => i.Id)
            .ToListAsync(cancellationToken);

        var lineIds = invoices.SelectMany(i => i.Lines)
            .Where(l => l.ItemId != null && ids.Contains(l.ItemId.Value))
            .Select(l => l.Id).ToList();
        var linkedSourceInvoiceIds = lineIds.Count == 0
            ? new HashSet<int>()
            : (await dbContext.InvoiceLines
                .AsNoTracking()
                .Where(l => l.SourceInvoiceLineId != null && lineIds.Contains(l.SourceInvoiceLineId.Value))
                .Select(l => l.SourceInvoiceLine!.InvoiceId)
                .Distinct()
                .ToListAsync(cancellationToken)).ToHashSet();

        var eligible = new List<InvoicePriceChangeInvoiceRow>();
        var skipped = new List<InvoicePriceChangeSkippedRow>();
        var perItem = ids.ToDictionary(id => id, _ => (Invoices: 0, Lines: 0, Delta: 0m));
        var linesEligible = 0;
        var paidNotIncluded = 0;
        var cashChange = 0m;
        foreach (var invoice in invoices)
        {
            InvoicePriceChangeSkipReason? reason = null;
            var matched = invoice.Lines
                .Where(l => l.ItemId is int id && prices.ContainsKey(id))
                .ToList();
            if (invoice.InvoiceType is InvoiceType.SalesReturn or InvoiceType.PurchaseReturn)
                reason = InvoicePriceChangeSkipReason.ReturnInvoice;
            else if (linkedSourceInvoiceIds.Contains(invoice.Id))
                reason = InvoicePriceChangeSkipReason.HasLinkedReturns;
            else if (fiscalYearPeriodGuard is not null &&
                     (await fiscalYearPeriodGuard.EnsureOpenAsync(
                         invoice.InvoiceDate, "InvoiceDate", cancellationToken)).IsFailure)
                reason = InvoicePriceChangeSkipReason.ClosedPeriod;
            else if (matched.All(l => l.Price == prices[l.ItemId!.Value]))
                reason = InvoicePriceChangeSkipReason.PriceAlreadyEqual;

            if (reason is { } r)
            {
                skipped.Add(Skip(invoice, r));
                continue;
            }

            var subtotal = 0m;
            var changed = 0;
            var lineDeltas = new List<(int ItemId, decimal Delta)>();
            foreach (var line in invoice.Lines)
            {
                if (line.ItemId is not int itemId || !prices.TryGetValue(itemId, out var newPrice) ||
                    line.Price == newPrice)
                {
                    subtotal += line.Total;
                    continue;
                }

                if (!InvoiceAmountRules.TryCalculate(line.Count, line.Weight, newPrice, out _, out var total))
                    return Result<Classified>.Failure(Invalid(
                        $"السعر الجديد لا يناسب الفاتورة {invoice.InvoiceNumber}.", "Items"));
                subtotal += total;
                changed++;
                lineDeltas.Add((itemId, total - line.Total));
            }

            var newTotal = decimal.Round(
                subtotal - invoice.DiscountAmount, InvoiceAmountRules.MoneyScale, MidpointRounding.AwayFromZero);
            var hasPayments = invoice.PaidAmount > 0m;
            if (hasPayments && !includePosted)
            {
                paidNotIncluded++;
                skipped.Add(Skip(invoice, InvoicePriceChangeSkipReason.HasPayments));
                continue;
            }

            if (hasPayments && invoice.PaymentTerm == PaymentTerm.Credit && newTotal <= invoice.PaidAmount)
            {
                skipped.Add(Skip(invoice, InvoicePriceChangeSkipReason.PaidAmountExceedsNewTotal));
                continue;
            }

            if (hasPayments && invoice.PaymentTerm == PaymentTerm.Cash)
                cashChange += newTotal - invoice.Total;
            linesEligible += changed;
            foreach (var group in lineDeltas.GroupBy(d => d.ItemId))
            {
                var current = perItem[group.Key];
                perItem[group.Key] = (
                    current.Invoices + 1,
                    current.Lines + group.Count(),
                    current.Delta + group.Sum(d => d.Delta));
            }

            eligible.Add(new InvoicePriceChangeInvoiceRow(
                InvoiceId: invoice.Id, InvoiceNumber: invoice.InvoiceNumber, InvoiceDate: invoice.InvoiceDate,
                InvoiceType: invoice.InvoiceType, LinesAffected: changed, HasPayments: hasPayments,
                OldTotal: invoice.Total, NewTotal: newTotal, TotalDelta: newTotal - invoice.Total));
        }

        var itemRows = items
            .Select(item => new InvoicePriceChangeItemRow(
                ItemId: item.ItemId,
                ItemName: names[item.ItemId],
                NewPrice: item.NewPrice,
                InvoicesAffected: perItem[item.ItemId].Invoices,
                LinesAffected: perItem[item.ItemId].Lines,
                TotalDelta: perItem[item.ItemId].Delta))
            .ToList();
        return Result<Classified>.Success(
            new Classified(itemRows, eligible, skipped, linesEligible, paidNotIncluded, cashChange));
    }

    private static InvoicePriceChangeSkippedRow Skip(Invoice invoice, InvoicePriceChangeSkipReason reason) =>
        new(InvoiceId: invoice.Id, InvoiceNumber: invoice.InvoiceNumber,
            InvoiceDate: invoice.InvoiceDate, Reason: reason);
}
