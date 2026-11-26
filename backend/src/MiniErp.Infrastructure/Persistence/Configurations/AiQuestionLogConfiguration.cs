using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using MiniErp.Domain.Entities.Ai;

namespace MiniErp.Infrastructure.Persistence.Configurations;

public sealed class AiQuestionLogConfiguration : IEntityTypeConfiguration<AiQuestionLog>
{
    public void Configure(EntityTypeBuilder<AiQuestionLog> builder)
    {
        builder.ToTable("AiQuestionLogs");
        builder.HasKey(log => log.Id);
        builder.Property(log => log.Question).HasMaxLength(500).IsRequired();
        builder.Property(log => log.Answer).HasMaxLength(4000);
        builder.Property(log => log.Provider).HasMaxLength(50);
        builder.HasIndex(log => new { log.CompanyId, log.UserId, log.AskedOn });
    }
}
