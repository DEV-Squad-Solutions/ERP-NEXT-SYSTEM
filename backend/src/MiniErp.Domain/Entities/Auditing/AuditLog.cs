namespace MiniErp.Domain.Entities.Auditing;

/// <summary>Append-only record of who changed what, and when, inside one company.</summary>
public sealed class AuditLog
{
    public long Id { get; set; }

    public int CompanyId { get; set; }

    public DateTime OccurredOn { get; set; }

    public string UserId { get; set; } = string.Empty;

    /// <summary>Full name copied at write time so it survives later renames.</summary>
    public string UserName { get; set; } = string.Empty;

    public string Role { get; set; } = string.Empty;

    /// <summary>Created, Updated, Deleted or Settings.</summary>
    public string Action { get; set; } = string.Empty;

    public string EntityType { get; set; } = string.Empty;

    public string EntityId { get; set; } = string.Empty;

    public string Summary { get; set; } = string.Empty;

    /// <summary>JSON list of changed fields (old and new values, sensitive values masked).</summary>
    public string? Details { get; set; }

    public string? ClientIp { get; set; }

    /// <summary>Entries of this kind are never removed by the retention job.</summary>
    public bool IsPermanent { get; set; }
}
