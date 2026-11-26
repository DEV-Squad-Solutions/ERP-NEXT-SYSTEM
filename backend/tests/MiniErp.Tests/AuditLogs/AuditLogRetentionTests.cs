using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using MiniErp.Domain.Entities.Auditing;
using MiniErp.Infrastructure.Persistence;
using MiniErp.Infrastructure.Services.AuditLogs;

namespace MiniErp.Tests.AuditLogs;

public sealed class AuditLogRetentionTests
{
    [Fact]
    public async Task Purge_DoesNothing_WhenRetentionIsOff()
    {
        await using var db = await TestDb.CreateAsync(company1Days: null, company2Days: null);

        var removed = await db.CreateService().PurgeExpiredAsync();

        Assert.Equal(0, removed);
        Assert.Equal(4, await db.Context.AuditLogs.CountAsync());
    }

    [Fact]
    public async Task Purge_RemovesOnlyOldNonPermanentRowsOfTheConfiguredCompany()
    {
        await using var db = await TestDb.CreateAsync(company1Days: 30, company2Days: null);

        var removed = await db.CreateService().PurgeExpiredAsync();

        Assert.Equal(1, removed);
        var left = await db.Context.AuditLogs.AsNoTracking().ToListAsync();
        // company 1: old normal row gone, old permanent row kept, recent row kept, plus one purge note
        Assert.Contains(left, l => l.CompanyId == 1 && l.IsPermanent && l.EntityType == "AuditLogRetention");
        Assert.Contains(left, l => l.CompanyId == 1 && l.Summary == "recent");
        Assert.DoesNotContain(left, l => l.CompanyId == 1 && l.Summary == "old");
        Assert.Contains(left, l => l.CompanyId == 1 && l.EntityType == "AuditLogPurge" && l.IsPermanent);
        // company 2 has retention off: its old row stays
        Assert.Contains(left, l => l.CompanyId == 2 && l.Summary == "old other company");
    }

    private sealed class TestDb : IAsyncDisposable
    {
        public SqliteConnection Connection { get; private init; } = null!;

        public ApplicationDbContext Context { get; private init; } = null!;

        public AuditLogRetentionService CreateService() =>
            new(Context, TimeProvider.System, NullLogger<AuditLogRetentionService>.Instance);

        public static async Task<TestDb> CreateAsync(int? company1Days, int? company2Days)
        {
            var connection = new SqliteConnection("Data Source=:memory:");
            await connection.OpenAsync();
            var context = new ApplicationDbContext(
                new DbContextOptionsBuilder<ApplicationDbContext>().UseSqlite(connection).Options);
            await context.Database.ExecuteSqlRawAsync(
                """
                CREATE TABLE CompanySettings (CompanyId INTEGER PRIMARY KEY, AuditLogRetentionDays INTEGER NULL);
                CREATE TABLE AuditLogs (
                    Id INTEGER PRIMARY KEY AUTOINCREMENT, CompanyId INTEGER NOT NULL, OccurredOn TEXT NOT NULL,
                    UserId TEXT NOT NULL, UserName TEXT NOT NULL, Role TEXT NOT NULL, Action TEXT NOT NULL,
                    EntityType TEXT NOT NULL, EntityId TEXT NOT NULL, Summary TEXT NOT NULL,
                    Details TEXT NULL, ClientIp TEXT NULL, IsPermanent INTEGER NOT NULL);
                """);
            await context.Database.ExecuteSqlInterpolatedAsync(
                $"INSERT INTO CompanySettings (CompanyId, AuditLogRetentionDays) VALUES (1, {company1Days}), (2, {company2Days})");

            var now = DateTime.UtcNow;
            context.AuditLogs.AddRange(
                Row(1, now.AddDays(-100), "old", false, "Invoice"),
                Row(1, now.AddDays(-100), "old setting change", true, "AuditLogRetention"),
                Row(1, now.AddDays(-1), "recent", false, "Invoice"),
                Row(2, now.AddDays(-100), "old other company", false, "Invoice"));
            await context.SaveChangesAsync();

            return new TestDb { Connection = connection, Context = context };
        }

        private static AuditLog Row(int company, DateTime on, string summary, bool permanent, string type) => new()
        {
            CompanyId = company, OccurredOn = on, UserId = "u", UserName = "n", Role = "Admin",
            Action = "Created", EntityType = type, EntityId = "1", Summary = summary, IsPermanent = permanent
        };

        public async ValueTask DisposeAsync()
        {
            await Context.DisposeAsync();
            await Connection.DisposeAsync();
        }
    }
}
