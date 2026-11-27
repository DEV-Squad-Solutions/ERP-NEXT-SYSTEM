using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using MiniErp.Infrastructure.Identity;

namespace MiniErp.Infrastructure.Persistence.Configurations;

public sealed class RegistrationRequestConfiguration : IEntityTypeConfiguration<RegistrationRequest>
{
    public void Configure(EntityTypeBuilder<RegistrationRequest> builder)
    {
        builder.ToTable("RegistrationRequests");
        builder.HasKey(r => r.Id);
        builder.Property(r => r.FirstName).HasMaxLength(100).IsRequired();
        builder.Property(r => r.LastName).HasMaxLength(100).IsRequired();
        builder.Property(r => r.UserName).HasMaxLength(64).IsRequired();
        builder.Property(r => r.Email).HasMaxLength(256).IsRequired();
        builder.Property(r => r.PhoneNumber).HasMaxLength(32);
        builder.Property(r => r.PasswordHash).HasMaxLength(512).IsRequired();
        builder.Property(r => r.Note).HasMaxLength(500);
        builder.Property(r => r.Status).HasMaxLength(16).IsRequired();
        builder.Property(r => r.RejectReason).HasMaxLength(500);
        builder.HasIndex(r => new { r.Status, r.CreatedOn });
    }
}
