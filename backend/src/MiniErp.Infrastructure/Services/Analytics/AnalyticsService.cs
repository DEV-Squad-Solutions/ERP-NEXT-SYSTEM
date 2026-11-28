using Microsoft.EntityFrameworkCore;
using MiniErp.Application.Common.Abstractions;
using MiniErp.Application.Common.Results;
using MiniErp.Application.Features.Analytics;
using MiniErp.Domain.Enums;
using MiniErp.Infrastructure.Persistence;

namespace MiniErp.Infrastructure.Services.Analytics;

public sealed class AnalyticsService(
    ApplicationDbContext dbContext,
    ICurrentCompanyContext company,
    TimeProvider timeProvider) : IAnalyticsService
{
    private const int MaxTop = 100;

    public async Task<Result<AnalyticsOverview>> GetOverviewAsync(
        AnalyticsQuery query,
        CancellationToken cancellationToken = default)
    {
        var companyId = company.CompanyId;
        var today = DateOnly.FromDateTime(timeProvider.GetUtcNow().UtcDateTime);
        var to = query.ToDate ?? today;
        var from = query.FromDate ?? to.AddMonths(-12).AddDays(1);
        if (from > to)
        {
            return Result<AnalyticsOverview>.Failure(Error.Validation(
                "Analytics.InvalidRange",
                "تاريخ البداية يجب ألا يكون بعد تاريخ النهاية.",
                nameof(AnalyticsQuery.FromDate)));
        }

        var top = Math.Clamp(query.Top, 1, MaxTop);

        var invoices = dbContext.Invoices.AsNoTracking()
            .Where(i => i.CompanyId == companyId && i.InvoiceDate >= from && i.InvoiceDate <= to);

        // Items: net revenue = sales lines minus sales-return lines.
        var lineRows = await dbContext.InvoiceLines.AsNoTracking()
            .Where(l => l.CompanyId == companyId && l.ItemId != null &&
                        (l.Invoice.InvoiceType == InvoiceType.Sales || l.Invoice.InvoiceType == InvoiceType.SalesReturn) &&
                        l.Invoice.InvoiceDate >= from && l.Invoice.InvoiceDate <= to)
            .Select(l => new
            {
                ItemId = l.ItemId!.Value,
                IsReturn = l.Invoice.InvoiceType == InvoiceType.SalesReturn,
                l.Quantity,
                l.BaseTotal
            })
            .ToListAsync(cancellationToken);

        var itemTotals = lineRows
            .GroupBy(r => r.ItemId)
            .Select(g => new
            {
                ItemId = g.Key,
                Quantity = g.Sum(r => r.IsReturn ? -r.Quantity : r.Quantity),
                Revenue = g.Sum(r => r.IsReturn ? -r.BaseTotal : r.BaseTotal)
            })
            .ToList();
        var totalRevenue = itemTotals.Sum(r => r.Revenue);

        var itemNames = await dbContext.Items.AsNoTracking()
            .Where(i => i.CompanyId == companyId)
            .Select(i => new { i.Id, i.Name, i.IsActive })
            .ToListAsync(cancellationToken);
        var nameOf = itemNames.ToDictionary(i => i.Id, i => i.Name);

        AnalyticsItemRow ItemRow(int id, decimal qty, decimal revenue) => new(
            id,
            nameOf.GetValueOrDefault(id, "#" + id),
            qty,
            revenue,
            totalRevenue > 0m ? Math.Round(revenue / totalRevenue * 100m, 2) : 0m);

        var topItems = itemTotals.OrderByDescending(r => r.Revenue).ThenBy(r => r.ItemId)
            .Take(top).Select(r => ItemRow(r.ItemId, r.Quantity, r.Revenue)).ToList();

        // Slow items: active items with no sales at all in the period (then the lowest sellers).
        var soldIds = itemTotals.Where(r => r.Revenue > 0m || r.Quantity > 0m).Select(r => r.ItemId).ToHashSet();
        var slowItems = itemNames.Where(i => i.IsActive && !soldIds.Contains(i.Id))
            .OrderBy(i => i.Name).Take(top)
            .Select(i => ItemRow(i.Id, 0m, 0m)).ToList();

        // Partners.
        var partnerRows = await invoices
            .Where(i => i.InvoiceType == InvoiceType.Sales || i.InvoiceType == InvoiceType.Purchase)
            .Select(i => new
            {
                i.BusinessPartnerId,
                i.InvoiceType,
                i.BaseTotal,
                Outstanding = i.BaseTotal - i.BasePaidAmountAtInvoiceRate
            })
            .ToListAsync(cancellationToken);
        var partnerNames = await dbContext.BusinessPartners.AsNoTracking()
            .Where(p => p.CompanyId == companyId).Select(p => new { p.Id, p.Name })
            .ToDictionaryAsync(p => p.Id, p => p.Name, cancellationToken);

        List<AnalyticsPartnerRow> Partners(InvoiceType type) => partnerRows
            .Where(r => r.InvoiceType == type)
            .GroupBy(r => r.BusinessPartnerId)
            .Select(g => new AnalyticsPartnerRow(
                g.Key,
                partnerNames.GetValueOrDefault(g.Key, "#" + g.Key),
                g.Count(),
                g.Sum(r => r.BaseTotal),
                g.Sum(r => Math.Max(r.Outstanding, 0m))))
            .OrderByDescending(r => r.Total).ThenBy(r => r.PartnerId)
            .Take(top).ToList();

        // Monthly trend (net of returns).
        var monthRows = await invoices
            .Select(i => new { i.InvoiceDate.Year, i.InvoiceDate.Month, i.InvoiceType, i.BaseTotal })
            .ToListAsync(cancellationToken);
        var months = monthRows.GroupBy(r => (r.Year, r.Month)).OrderBy(g => g.Key.Year).ThenBy(g => g.Key.Month)
            .Select(g => (g.Key.Year, g.Key.Month,
                Sales: g.Sum(r => r.InvoiceType == InvoiceType.Sales ? r.BaseTotal : r.InvoiceType == InvoiceType.SalesReturn ? -r.BaseTotal : 0m),
                Purchases: g.Sum(r => r.InvoiceType == InvoiceType.Purchase ? r.BaseTotal : r.InvoiceType == InvoiceType.PurchaseReturn ? -r.BaseTotal : 0m)))
            .ToList();
        var trend = new List<AnalyticsMonthRow>();
        for (var i = 0; i < months.Count; i++)
        {
            decimal? change = i > 0 && months[i - 1].Sales > 0m
                ? Math.Round((months[i].Sales - months[i - 1].Sales) / months[i - 1].Sales * 100m, 2)
                : null;
            trend.Add(new AnalyticsMonthRow(months[i].Year, months[i].Month, months[i].Sales, months[i].Purchases, change));
        }

        // Aging: unpaid part of invoices dated up to the end date, by days past due.
        var open = await dbContext.Invoices.AsNoTracking()
            .Where(i => i.CompanyId == companyId && i.InvoiceDate <= to &&
                        (i.InvoiceType == InvoiceType.Sales || i.InvoiceType == InvoiceType.Purchase) &&
                        i.BaseTotal - i.BasePaidAmountAtInvoiceRate > 0m)
            .Select(i => new
            {
                i.InvoiceType,
                i.InvoiceDate,
                i.DueDate,
                Outstanding = i.BaseTotal - i.BasePaidAmountAtInvoiceRate
            })
            .ToListAsync(cancellationToken);

        AnalyticsAgingBuckets Buckets(InvoiceType type)
        {
            decimal notDue = 0, d30 = 0, d60 = 0, d90 = 0, over = 0;
            foreach (var r in open.Where(x => x.InvoiceType == type))
            {
                var due = r.DueDate ?? r.InvoiceDate;
                var late = to.DayNumber - due.DayNumber;
                if (late <= 0) notDue += r.Outstanding;
                else if (late <= 30) d30 += r.Outstanding;
                else if (late <= 60) d60 += r.Outstanding;
                else if (late <= 90) d90 += r.Outstanding;
                else over += r.Outstanding;
            }

            return new AnalyticsAgingBuckets(notDue, d30, d60, d90, over);
        }

        var baseCurrency = await dbContext.Invoices.AsNoTracking()
            .Where(i => i.CompanyId == companyId).Select(i => i.Currency.ToString()).FirstOrDefaultAsync(cancellationToken) ?? "EGP";

        return Result<AnalyticsOverview>.Success(new AnalyticsOverview(
            new AnalyticsPeriod(from, to, baseCurrency),
            topItems,
            slowItems,
            Partners(InvoiceType.Sales),
            Partners(InvoiceType.Purchase),
            trend,
            new AnalyticsAging(to, Buckets(InvoiceType.Sales), Buckets(InvoiceType.Purchase))));
    }
}
