using Microsoft.EntityFrameworkCore;
using MiniErp.Application.Common.Abstractions;
using MiniErp.Application.Common.Results;
using MiniErp.Application.Features.InvoiceReports;
using MiniErp.Domain.Enums;
using MiniErp.Infrastructure.Persistence;

namespace MiniErp.Infrastructure.Services.InvoiceReports;

public sealed class InvoiceReportService(
    ApplicationDbContext dbContext,
    ICurrentCompanyContext currentCompanyContext,
    TimeProvider timeProvider)
    : IInvoiceReportService, IScopedService
{
    private readonly int companyId = currentCompanyContext.CompanyId;

    private async Task<string> BaseCurrencyAsync(CancellationToken ct)
    {
        var code = await dbContext.CompanySettings
            .AsNoTracking()
            .Where(s => s.CompanyId == companyId)
            .Select(s => (CurrencyCode?)s.BaseCurrency)
            .FirstOrDefaultAsync(ct) ?? CurrencyCode.EGP;
        return code.ToString();
    }

    public async Task<Result<InvoiceSummaryResponse>> GetSummaryAsync(
        InvoiceSummaryFilterRequest filters,
        CancellationToken cancellationToken = default)
    {
        var today = DateOnly.FromDateTime(timeProvider.GetUtcNow().UtcDateTime);
        var from = filters.FromDate ?? new DateOnly(today.Year, 1, 1);
        var to = filters.ToDate ?? today;
        if (to < from)
        {
            (from, to) = (to, from);
        }

        var rows = await dbContext.Invoices
            .AsNoTracking()
            .Where(i => i.CompanyId == companyId &&
                i.InvoiceDate >= from && i.InvoiceDate <= to)
            .Select(i => new
            {
                i.InvoiceType,
                i.InvoiceDate,
                i.BaseTotal,
                Paid = i.BasePaidAmountAtInvoiceRate
            })
            .ToListAsync(cancellationToken);

        var types = Enum.GetValues<InvoiceType>()
            .Select(type =>
            {
                var set = rows.Where(r => r.InvoiceType == type).ToList();
                var total = set.Sum(r => r.BaseTotal);
                var paid = set.Sum(r => r.Paid);
                return new InvoiceTypeSummary(
                    type.ToString(), set.Count, total, paid,
                    Math.Max(0m, total - paid));
            })
            .ToList();

        decimal TypeTotal(InvoiceType t) =>
            rows.Where(r => r.InvoiceType == t).Sum(r => r.BaseTotal);

        var months = rows
            .GroupBy(r => new { r.InvoiceDate.Year, r.InvoiceDate.Month })
            .OrderBy(g => g.Key.Year).ThenBy(g => g.Key.Month)
            .Select(g => new InvoiceMonthSummary(
                g.Key.Year, g.Key.Month,
                g.Where(r => r.InvoiceType == InvoiceType.Sales).Sum(r => r.BaseTotal) -
                g.Where(r => r.InvoiceType == InvoiceType.SalesReturn).Sum(r => r.BaseTotal),
                g.Where(r => r.InvoiceType == InvoiceType.Purchase).Sum(r => r.BaseTotal) -
                g.Where(r => r.InvoiceType == InvoiceType.PurchaseReturn).Sum(r => r.BaseTotal)))
            .ToList();

        return Result<InvoiceSummaryResponse>.Success(new InvoiceSummaryResponse(
            from, to, await BaseCurrencyAsync(cancellationToken), types, months,
            TypeTotal(InvoiceType.Sales) - TypeTotal(InvoiceType.SalesReturn),
            TypeTotal(InvoiceType.Purchase) - TypeTotal(InvoiceType.PurchaseReturn)));
    }

    public async Task<Result<InvoiceAgingResponse>> GetAgingAsync(
        InvoiceAgingFilterRequest filters,
        CancellationToken cancellationToken = default)
    {
        var today = DateOnly.FromDateTime(timeProvider.GetUtcNow().UtcDateTime);
        var asOf = filters.AsOfDate ?? today;
        var purchases = string.Equals(filters.Kind, "Purchases",
            StringComparison.OrdinalIgnoreCase);
        var type = purchases ? InvoiceType.Purchase : InvoiceType.Sales;

        var rows = await dbContext.Invoices
            .AsNoTracking()
            .Where(i => i.CompanyId == companyId &&
                i.InvoiceType == type &&
                i.InvoiceDate <= asOf &&
                i.Total - i.PaidAmount > 0m)
            .Select(i => new
            {
                i.BusinessPartnerId,
                PartnerName = i.BusinessPartner.Name,
                Due = i.DueDate ?? i.InvoiceDate,
                Open = i.BaseTotal - i.BasePaidAmountAtInvoiceRate
            })
            .ToListAsync(cancellationToken);

        static InvoiceAgingRow Build(int id, string name,
            IEnumerable<(int Late, decimal Open)> items)
        {
            var list = items.ToList();
            decimal Sum(Func<int, bool> f) =>
                list.Where(x => f(x.Late)).Sum(x => Math.Max(0m, x.Open));
            var a = Sum(d => d <= 0);
            var b = Sum(d => d is >= 1 and <= 30);
            var c = Sum(d => d is >= 31 and <= 60);
            var d2 = Sum(d => d is >= 61 and <= 90);
            var e = Sum(d => d > 90);
            return new InvoiceAgingRow(id, name, a, b, c, d2, e, a + b + c + d2 + e);
        }

        var all = rows.Select(r => (r.BusinessPartnerId, r.PartnerName,
            Late: asOf.DayNumber - r.Due.DayNumber, r.Open)).ToList();
        var partnerRows = all
            .GroupBy(r => new { r.BusinessPartnerId, r.PartnerName })
            .Select(g => Build(g.Key.BusinessPartnerId, g.Key.PartnerName,
                g.Select(x => (x.Late, x.Open))))
            .Where(r => r.Total > 0m)
            .OrderByDescending(r => r.Total)
            .ToList();
        var totals = Build(0, "Total", all.Select(x => (x.Late, x.Open)));

        return Result<InvoiceAgingResponse>.Success(new InvoiceAgingResponse(
            purchases ? "Purchases" : "Sales", asOf,
            await BaseCurrencyAsync(cancellationToken), partnerRows, totals));
    }
}
