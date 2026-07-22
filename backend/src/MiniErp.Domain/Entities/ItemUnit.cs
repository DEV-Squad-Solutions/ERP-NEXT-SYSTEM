using MiniErp.Domain.Common.Entities;

namespace MiniErp.Domain.Entities;

public sealed class ItemUnit : AuditableEntity
{
    public int Id { get; set; }

    public int CompanyId { get; set; }

    public Company Company { get; set; } = null!;

    public string Name { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;

    public ICollection<Item> Items { get; set; } = [];
}
