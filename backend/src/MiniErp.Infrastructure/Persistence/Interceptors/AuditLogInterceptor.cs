using System.Collections.Concurrent;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Logging;
using MiniErp.Domain.Common.Entities;
using MiniErp.Domain.Entities.Auditing;
using MiniErp.Domain.Entities.Companies;
using MiniErp.Infrastructure.Services.AuditLogs;

namespace MiniErp.Infrastructure.Persistence.Interceptors;

/// <summary>
/// Records who created, changed or deleted business records. Runs in two steps because new
/// records only get their id during the save. Log failures never block the business change.
/// </summary>
public sealed class AuditLogInterceptor(
    IHttpContextAccessor httpContextAccessor,
    TimeProvider timeProvider,
    ILogger<AuditLogInterceptor> logger) : SaveChangesInterceptor
{
    private static readonly string[] Ignored =
        ["UpdatedOn", "UpdatedById", "UpdatedByPc", "CreatedOn", "CreatedById", "CreatedByPc",
         "DeletedOn", "DeletedById", "DeletedByPc", "RowVersion", "IsDeleted"];

    private static readonly string[] Sensitive =
        ["password", "hash", "token", "secret", "stamp"];

    // Money and personal values of these records are never copied into the log.
    private static readonly string[] NoValueTypes = ["PayrollEntry", "Employee", "EmployeeMovement"];

    private readonly ConcurrentDictionary<Guid, List<Pending>> pendingByContext = new();

    private sealed record Pending(
        EntityEntry Entry,
        string Action,
        string EntityType,
        string? Details,
        int CompanyId);

    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData,
        InterceptionResult<int> result,
        CancellationToken cancellationToken = default)
    {
        Collect(eventData.Context);
        return base.SavingChangesAsync(eventData, result, cancellationToken);
    }

    public override InterceptionResult<int> SavingChanges(
        DbContextEventData eventData,
        InterceptionResult<int> result)
    {
        Collect(eventData.Context);
        return base.SavingChanges(eventData, result);
    }

    public override async ValueTask<int> SavedChangesAsync(
        SaveChangesCompletedEventData eventData,
        int result,
        CancellationToken cancellationToken = default)
    {
        await Write(eventData.Context, cancellationToken);
        return await base.SavedChangesAsync(eventData, result, cancellationToken);
    }

    public override int SavedChanges(SaveChangesCompletedEventData eventData, int result)
    {
        Write(eventData.Context, CancellationToken.None).GetAwaiter().GetResult();
        return base.SavedChanges(eventData, result);
    }

    public override void SaveChangesFailed(DbContextErrorEventData eventData) =>
        Drop(eventData.Context);

    public override Task SaveChangesFailedAsync(
        DbContextErrorEventData eventData,
        CancellationToken cancellationToken = default)
    {
        Drop(eventData.Context);
        return Task.CompletedTask;
    }

    private void Drop(DbContext? context)
    {
        if (context is not null)
        {
            pendingByContext.TryRemove(context.ContextId.InstanceId, out _);
        }
    }

    private void Collect(DbContext? context)
    {
        if (context is null)
        {
            return;
        }

        try
        {
            var claims = AuditActor.ReadClaims(httpContextAccessor.HttpContext);
            if (claims.UserId == "system")
            {
                return; // seeding and background work are not user operations
            }

            var pending = new List<Pending>();
            foreach (var entry in context.ChangeTracker.Entries())
            {
                if (entry.Entity is AuditLog ||
                    entry.State is not (EntityState.Added or EntityState.Modified or EntityState.Deleted) ||
                    (entry.Entity is not AuditableEntity && entry.Entity is not CompanySettings))
                {
                    continue;
                }

                var type = entry.Entity.GetType().Name;
                var action = entry.State switch
                {
                    EntityState.Added => "Created",
                    EntityState.Deleted => "Deleted",
                    _ => entry.Entity is AuditableEntity { IsDeleted: true } &&
                         entry.Property(nameof(AuditableEntity.IsDeleted)).OriginalValue is false
                        ? "Deleted"
                        : "Updated"
                };

                var companyId = ResolveCompanyId(entry, claims.CompanyId);
                if (companyId <= 0)
                {
                    continue;
                }

                var details = action == "Updated" ? BuildDetails(entry, type) : null;
                if (action == "Updated" && details is null)
                {
                    continue;
                }

                pending.Add(new Pending(entry, action, type, details, companyId));
            }

            if (pending.Count > 0)
            {
                pendingByContext[context.ContextId.InstanceId] = pending;
            }
        }
        catch (Exception exception)
        {
            logger.LogWarning(exception, "Audit log collection failed; the business change continues.");
        }
    }

    private async Task Write(DbContext? context, CancellationToken cancellationToken)
    {
        if (context is not ApplicationDbContext db ||
            !pendingByContext.TryRemove(context.ContextId.InstanceId, out var pending))
        {
            return;
        }

        try
        {
            var (userId, role, _, ip) = AuditActor.ReadClaims(httpContextAccessor.HttpContext);
            var name = await AuditActor.ResolveNameAsync(db, userId, cancellationToken);
            var now = timeProvider.GetUtcNow().UtcDateTime;

            foreach (var item in pending)
            {
                var id = string.Join(
                    ",",
                    item.Entry.Metadata.FindPrimaryKey()?.Properties
                        .Select(p => item.Entry.Property(p.Name).CurrentValue?.ToString()) ?? []);
                db.AuditLogs.Add(new AuditLog
                {
                    CompanyId = item.CompanyId,
                    OccurredOn = now,
                    UserId = userId,
                    UserName = Trim(name, 300),
                    Role = Trim(role, 100),
                    Action = item.Action,
                    EntityType = item.EntityType,
                    EntityId = Trim(id, 100),
                    Summary = Trim(Summarize(item.Entry, item.EntityType, id), 300),
                    Details = item.Details,
                    ClientIp = ip
                });
            }

            // The audit rows themselves are not audited, so this save does not recurse.
            await db.SaveChangesAsync(cancellationToken);
        }
        catch (Exception exception)
        {
            logger.LogWarning(exception, "Audit log write failed; the business change was already saved.");
            foreach (var added in db.ChangeTracker.Entries<AuditLog>().ToList())
            {
                added.State = EntityState.Detached;
            }
        }
    }

    private static int ResolveCompanyId(EntityEntry entry, int claimCompanyId)
    {
        if (entry.Entity is Company company)
        {
            return company.Id;
        }

        if (entry.Entity is CompanySettings settings)
        {
            return settings.CompanyId;
        }

        var property = entry.Metadata.FindProperty("CompanyId");
        if (property is not null && entry.Property("CompanyId").CurrentValue is int value && value > 0)
        {
            return value;
        }

        return claimCompanyId;
    }

    private static string? BuildDetails(EntityEntry entry, string type)
    {
        var changes = new List<object>();
        var hideValues = NoValueTypes.Contains(type);
        foreach (var property in entry.Properties.Where(p => p.IsModified))
        {
            var name = property.Metadata.Name;
            if (Ignored.Contains(name) || property.Metadata.IsPrimaryKey())
            {
                continue;
            }

            if (Equals(property.OriginalValue, property.CurrentValue))
            {
                continue;
            }

            var masked = hideValues ||
                Sensitive.Any(s => name.Contains(s, StringComparison.OrdinalIgnoreCase));
            changes.Add(new
            {
                field = name,
                from = masked ? null : Short(property.OriginalValue),
                to = masked ? null : Short(property.CurrentValue)
            });
        }

        return changes.Count == 0 ? null : Trim(JsonSerializer.Serialize(changes), 4000);
    }

    private static string? Short(object? value) =>
        value is null ? null : Trim(Convert.ToString(value, System.Globalization.CultureInfo.InvariantCulture) ?? string.Empty, 100);

    private static string Summarize(EntityEntry entry, string type, string id)
    {
        foreach (var candidate in new[] { "InvoiceNumber", "VoucherNumber", "Number", "Code", "Name", "FullName" })
        {
            if (entry.Metadata.FindProperty(candidate) is not null &&
                entry.Property(candidate).CurrentValue is string text &&
                !string.IsNullOrWhiteSpace(text))
            {
                return $"{type} {text}";
            }
        }

        return $"{type} #{id}";
    }

    private static string Trim(string value, int max) =>
        value.Length <= max ? value : value[..max];
}
