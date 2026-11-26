using Microsoft.EntityFrameworkCore;
using MiniErp.Application.Common.Abstractions;
using MiniErp.Application.Common.Results;
using MiniErp.Application.Features.Forecasting;
using MiniErp.Domain.Enums;
using MiniErp.Infrastructure.Persistence;

namespace MiniErp.Infrastructure.Services.Forecasting;

public sealed class ForecastService(
    ApplicationDbContext dbContext,
    ICurrentCompanyContext company,
    TimeProvider timeProvider) : IForecastService, IScopedService
{
    public async Task<Result<ForecastReport>> ForecastSalesAsync(CancellationToken cancellationToken = default)
    {
        var companyId = company.CompanyId;
        var today = DateOnly.FromDateTime(timeProvider.GetUtcNow().UtcDateTime);
        var currentMonthStart = new DateOnly(today.Year, today.Month, 1);

        var rows = await dbContext.Invoices
            .AsNoTracking()
            .Where(i => i.CompanyId == companyId
                && (i.InvoiceType == InvoiceType.Sales || i.InvoiceType == InvoiceType.SalesReturn)
                && i.InvoiceDate < currentMonthStart)
            .Select(i => new { i.InvoiceDate, i.InvoiceType, i.BaseTotal })
            .ToListAsync(cancellationToken);

        // Only complete months. Months with no activity between the first and last month count as zero.
        var grouped = rows
            .GroupBy(r => (r.InvoiceDate.Year, r.InvoiceDate.Month))
            .ToDictionary(
                g => g.Key,
                g => g.Sum(r => r.InvoiceType == InvoiceType.Sales ? r.BaseTotal : -r.BaseTotal));
        var history = new List<MonthlyAmount>();
        if (grouped.Count > 0)
        {
            var first = grouped.Keys.Min();
            var cursor = new DateOnly(first.Year, first.Month, 1);
            while (cursor < currentMonthStart)
            {
                grouped.TryGetValue((cursor.Year, cursor.Month), out var amount);
                history.Add(new MonthlyAmount(cursor.Year, cursor.Month, amount));
                cursor = cursor.AddMonths(1);
            }
        }

        return Result<ForecastReport>.Success(ForecastCalculator.Forecast("NetSales", history));
    }
}
