using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using MiniErp.Domain.Entities.Auditing;

namespace MiniErp.Infrastructure.Persistence.Configurations;

public sealed class AuditLogConfiguration : IEntityTypeConfiguration<AuditLog>
{
    public void Configure(EntityTypeBuilder<AuditLog> builder)
    {
        builder.ToTable("AuditLogs");
        builder.HasKey(log => log.Id);
        builder.Property(log => log.UserId).HasMaxLength(450).IsRequired();
        builder.Property(log => log.UserName).HasMaxLength(300).IsRequired();
        builder.Property(log => log.Role).HasMaxLength(100).IsRequired();
        builder.Property(log => log.Action).HasMaxLength(20).IsRequired();
        builder.Property(log => log.EntityType).HasMaxLength(100).IsRequired();
        builder.Property(log => log.EntityId).HasMaxLength(100).IsRequired();
        builder.Property(log => log.Summary).HasMaxLength(300).IsRequired();
        builder.Property(log => log.ClientIp).HasMaxLength(64);
        builder.HasIndex(log => new { log.CompanyId, log.OccurredOn });
        builder.HasIndex(log => new { log.CompanyId, log.UserId });
    }
}
