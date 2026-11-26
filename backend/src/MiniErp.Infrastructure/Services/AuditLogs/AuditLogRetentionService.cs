using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using MiniErp.Application.Common.Abstractions;
using MiniErp.Application.Features.AuditLogs;
using MiniErp.Domain.Entities.Auditing;
using MiniErp.Infrastructure.Persistence;

namespace MiniErp.Infrastructure.Services.AuditLogs;

public sealed class AuditLogRetentionService(
    ApplicationDbContext dbContext,
    TimeProvider timeProvider,
    ILogger<AuditLogRetentionService> logger)
    : IAuditLogRetentionService, IScopedService
{
    public async Task<int> PurgeExpiredAsync(CancellationToken cancellationToken = default)
    {
        var now = timeProvider.GetUtcNow().UtcDateTime;
        var companies = await dbContext.CompanySettings.IgnoreQueryFilters().AsNoTracking()
            .Where(s => s.AuditLogRetentionDays != null)
            .Select(s => new { s.CompanyId, Days = s.AuditLogRetentionDays!.Value })
            .ToListAsync(cancellationToken);

        var total = 0;
        foreach (var company in companies)
        {
            var cutoff = now.AddDays(-company.Days);
            var removed = await dbContext.AuditLogs
                .Where(l => l.CompanyId == company.CompanyId && !l.IsPermanent && l.OccurredOn < cutoff)
                .ExecuteDeleteAsync(cancellationToken);
            if (removed == 0)
            {
                continue;
            }

            total += removed;
            dbContext.AuditLogs.Add(new AuditLog
            {
                CompanyId = company.CompanyId,
                OccurredOn = now,
                UserId = "system",
                UserName = "النظام",
                Role = "System",
                Action = "Settings",
                EntityType = "AuditLogPurge",
                EntityId = company.CompanyId.ToString(),
                Summary = $"حذف تلقائي لـ {removed} سجل أقدم من {company.Days} يوم",
                IsPermanent = true
            });
            await dbContext.SaveChangesAsync(cancellationToken);
            logger.LogInformation("Audit log purge removed {Count} entries for company {CompanyId}.", removed, company.CompanyId);
        }

        return total;
    }
}
