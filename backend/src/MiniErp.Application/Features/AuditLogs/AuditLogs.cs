using MiniErp.Application.Common.Models;
using MiniErp.Application.Common.Results;

namespace MiniErp.Application.Features.AuditLogs;

public sealed record AuditLogResponse(
    long Id,
    DateTime OccurredOn,
    string UserId,
    string UserName,
    string Role,
    string Action,
    string EntityType,
    string EntityId,
    string Summary,
    string? Details);

public sealed class AuditLogFilterRequest
{
    public string? UserId { get; init; }

    public string? Role { get; init; }

    public string? Action { get; init; }

    public string? EntityType { get; init; }

    public DateTime? FromDate { get; init; }

    public DateTime? ToDate { get; init; }

    public string? Search { get; init; }
}

public sealed record AuditLogUserOption(string UserId, string UserName);

public sealed record AuditLogFiltersResponse(
    IReadOnlyList<AuditLogUserOption> Users,
    IReadOnlyList<string> Roles,
    IReadOnlyList<string> Actions,
    IReadOnlyList<string> EntityTypes);

public sealed record AuditLogRetentionResponse(
    int? RetentionDays,
    IReadOnlyList<int> AllowedDays);

public sealed record AuditLogRetentionRequest(int? RetentionDays);

public static class AuditLogRetentionOptions
{
    /// <summary>Allowed retention periods in days. Null (off) is always allowed.</summary>
    public static readonly IReadOnlyList<int> AllowedDays = [30, 90, 180, 365];
}

public static class AuditLogErrors
{
    public static Error InvalidRetention() =>
        Error.Validation(
            "AuditLogs.InvalidRetention",
            "مدة الاحتفاظ يجب أن تكون 30 أو 90 أو 180 أو 365 يوما، أو إيقاف الحذف التلقائي.",
            nameof(AuditLogRetentionRequest.RetentionDays));

    public static Error CompanyNotFound() =>
        Error.NotFound("AuditLogs.CompanyNotFound", "الشركة غير موجودة.");
}

public interface IAuditLogService
{
    Task<Result<PagedResponse<AuditLogResponse>>> GetAllAsync(
        PaginationRequest pagination,
        AuditLogFilterRequest? filters = null,
        CancellationToken cancellationToken = default);

    Task<Result<AuditLogFiltersResponse>> GetFiltersAsync(
        CancellationToken cancellationToken = default);

    Task<Result<AuditLogRetentionResponse>> GetRetentionAsync(
        CancellationToken cancellationToken = default);

    Task<Result<AuditLogRetentionResponse>> SetRetentionAsync(
        AuditLogRetentionRequest request,
        CancellationToken cancellationToken = default);
}

public interface IAuditLogRetentionService
{
    /// <summary>Deletes expired, non-permanent entries per company. Returns the number removed.</summary>
    Task<int> PurgeExpiredAsync(CancellationToken cancellationToken = default);
}
