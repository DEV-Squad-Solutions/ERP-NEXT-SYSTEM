using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using MiniErp.Application.Common.Abstractions;
using MiniErp.Application.Common.Models;
using MiniErp.Application.Common.Results;
using MiniErp.Application.Features.AuditLogs;
using MiniErp.Domain.Entities.Auditing;
using MiniErp.Infrastructure.Persistence;

namespace MiniErp.Infrastructure.Services.AuditLogs;

public sealed class AuditLogService(
    ApplicationDbContext dbContext,
    ICurrentCompanyContext companyContext,
    IHttpContextAccessor httpContextAccessor,
    TimeProvider timeProvider)
    : IAuditLogService, IScopedService
{
    public async Task<Result<PagedResponse<AuditLogResponse>>> GetAllAsync(
        PaginationRequest pagination,
        AuditLogFilterRequest? filters = null,
        CancellationToken cancellationToken = default)
    {
        filters ??= new AuditLogFilterRequest();
        var companyId = companyContext.CompanyId;
        var query = dbContext.AuditLogs.AsNoTracking().Where(l => l.CompanyId == companyId);

        if (!string.IsNullOrWhiteSpace(filters.UserId))
        {
            query = query.Where(l => l.UserId == filters.UserId);
        }

        if (!string.IsNullOrWhiteSpace(filters.Role))
        {
            query = query.Where(l => l.Role.Contains(filters.Role));
        }

        if (!string.IsNullOrWhiteSpace(filters.Action))
        {
            query = query.Where(l => l.Action == filters.Action);
        }

        if (!string.IsNullOrWhiteSpace(filters.EntityType))
        {
            query = query.Where(l => l.EntityType == filters.EntityType);
        }

        if (filters.FromDate is { } from)
        {
            query = query.Where(l => l.OccurredOn >= from.Date);
        }

        if (filters.ToDate is { } to)
        {
            var end = to.Date.AddDays(1);
            query = query.Where(l => l.OccurredOn < end);
        }

        if (!string.IsNullOrWhiteSpace(filters.Search))
        {
            var term = filters.Search.Trim();
            query = query.Where(l => l.Summary.Contains(term) || l.UserName.Contains(term) || l.EntityId == term);
        }

        var pageSize = Math.Clamp(pagination.PageSize, 1, PaginationRequest.MaxPageSize);
        var page = Math.Max(1, pagination.PageNumber);
        var total = await query.CountAsync(cancellationToken);
        var items = await query
            .OrderByDescending(l => l.OccurredOn)
            .ThenByDescending(l => l.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(l => new AuditLogResponse(
                l.Id, l.OccurredOn, l.UserId, l.UserName, l.Role, l.Action,
                l.EntityType, l.EntityId, l.Summary, l.Details))
            .ToListAsync(cancellationToken);

        return Result<PagedResponse<AuditLogResponse>>.Success(new PagedResponse<AuditLogResponse>(
            items, page, pageSize, total, (int)Math.Ceiling(total / (double)pageSize)));
    }

    public async Task<Result<AuditLogFiltersResponse>> GetFiltersAsync(
        CancellationToken cancellationToken = default)
    {
        var companyId = companyContext.CompanyId;
        var logs = dbContext.AuditLogs.AsNoTracking().Where(l => l.CompanyId == companyId);
        var users = (await logs
            .GroupBy(l => new { l.UserId, l.UserName })
            .Select(g => new { g.Key.UserId, g.Key.UserName })
            .ToListAsync(cancellationToken))
            .GroupBy(u => u.UserId)
            .Select(g => new AuditLogUserOption(g.Key, g.First().UserName))
            .OrderBy(u => u.UserName)
            .ToList();
        var types = await logs.Select(l => l.EntityType).Distinct().OrderBy(t => t).ToListAsync(cancellationToken);

        return Result<AuditLogFiltersResponse>.Success(new AuditLogFiltersResponse(
            users,
            ["Admin", "Accountant", "Cashier", "User"],
            ["Created", "Updated", "Deleted", "Settings"],
            types));
    }

    public async Task<Result<AuditLogRetentionResponse>> GetRetentionAsync(
        CancellationToken cancellationToken = default)
    {
        var companyId = companyContext.CompanyId;
        var days = await dbContext.CompanySettings.AsNoTracking()
            .Where(s => s.CompanyId == companyId)
            .Select(s => s.AuditLogRetentionDays)
            .FirstOrDefaultAsync(cancellationToken);
        return Result<AuditLogRetentionResponse>.Success(
            new AuditLogRetentionResponse(days, AuditLogRetentionOptions.AllowedDays));
    }

    public async Task<Result<AuditLogRetentionResponse>> SetRetentionAsync(
        AuditLogRetentionRequest request,
        CancellationToken cancellationToken = default)
    {
        if (request.RetentionDays is { } d && !AuditLogRetentionOptions.AllowedDays.Contains(d))
        {
            return Result<AuditLogRetentionResponse>.Failure(AuditLogErrors.InvalidRetention());
        }

        var companyId = companyContext.CompanyId;
        var settings = await dbContext.CompanySettings
            .FirstOrDefaultAsync(s => s.CompanyId == companyId, cancellationToken);
        if (settings is null)
        {
            return Result<AuditLogRetentionResponse>.Failure(AuditLogErrors.CompanyNotFound());
        }

        var before = settings.AuditLogRetentionDays;
        if (before != request.RetentionDays)
        {
            settings.AuditLogRetentionDays = request.RetentionDays;
            var (userId, role, _, ip) = AuditActor.ReadClaims(httpContextAccessor.HttpContext);
            dbContext.AuditLogs.Add(new AuditLog
            {
                CompanyId = companyId,
                OccurredOn = timeProvider.GetUtcNow().UtcDateTime,
                UserId = userId,
                UserName = await AuditActor.ResolveNameAsync(dbContext, userId, cancellationToken),
                Role = role,
                Action = "Settings",
                EntityType = "AuditLogRetention",
                EntityId = companyId.ToString(),
                Summary = "تغيير مدة الحذف التلقائي لسجل العمليات",
                Details = JsonSerializer.Serialize(new[]
                {
                    new { field = "AuditLogRetentionDays", from = before?.ToString() ?? "off", to = request.RetentionDays?.ToString() ?? "off" }
                }),
                ClientIp = ip,
                IsPermanent = true
            });
            await dbContext.SaveChangesAsync(cancellationToken);
        }

        return Result<AuditLogRetentionResponse>.Success(
            new AuditLogRetentionResponse(settings.AuditLogRetentionDays, AuditLogRetentionOptions.AllowedDays));
    }
}
