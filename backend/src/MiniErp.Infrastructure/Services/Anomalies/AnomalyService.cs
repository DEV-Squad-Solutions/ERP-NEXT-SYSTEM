using Microsoft.EntityFrameworkCore;
using MiniErp.Application.Common.Abstractions;
using MiniErp.Application.Common.Results;
using MiniErp.Application.Features.Anomalies;
using MiniErp.Domain.Enums;
using MiniErp.Infrastructure.Persistence;

namespace MiniErp.Infrastructure.Services.Anomalies;

public sealed class AnomalyService(
    ApplicationDbContext dbContext,
    ICurrentCompanyContext company) : IAnomalyService, IScopedService
{
    public async Task<Result<AnomalyReport>> DetectAsync(CancellationToken cancellationToken = default)
    {
        var companyId = company.CompanyId;
        var rows = await dbContext.Invoices
            .AsNoTracking()
            .Where(i => i.CompanyId == companyId
                && (i.InvoiceType == InvoiceType.Sales || i.InvoiceType == InvoiceType.Purchase))
            .Select(i => new { i.InvoiceNumber, i.InvoiceDate, i.BaseTotal, i.InvoiceType })
            .ToListAsync(cancellationToken);

        var points = rows
            .Select(r => new AnomalyPoint(r.InvoiceNumber, r.InvoiceDate, r.BaseTotal, r.InvoiceType.ToString()))
            .ToList();
        return Result<AnomalyReport>.Success(AnomalyDetector.Detect(points));
    }
}
