using MiniErp.Domain.Common.Entities;

namespace MiniErp.Domain.Entities;

public sealed class Item : AuditableEntity
{
    public int Id { get; set; }

    public int CompanyId { get; set; }

    public int ItemUnitId { get; set; }

    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public string? Description { get; set; }

    public bool IsActive { get; set; } = true;

    public Company Company { get; set; } = null!;

    public ItemUnit ItemUnit { get; set; } = null!;
}
