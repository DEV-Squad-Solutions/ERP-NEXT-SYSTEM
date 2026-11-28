using Microsoft.EntityFrameworkCore;
using System.Diagnostics;
using Microsoft.Extensions.DependencyInjection;
using MiniErp.Infrastructure.Persistence;
using Xunit.Abstractions;

namespace MiniErp.Tests.Seeding;

// Opt-in: set ERP_VOLUME_ITEMS (e.g. 500) to run. Skipped in the normal suite.
public sealed class VolumeSeedSmokeTests(ITestOutputHelper output)
{
    [Fact]
    public async Task Seed_at_volume_reports_table_sizes()
    {
        if (!int.TryParse(Environment.GetEnvironmentVariable("ERP_VOLUME_ITEMS"), out var items)) return;
        var sw = Stopwatch.StartNew();
        var (provider, connection, _) = await VolumeSeedFixture.CreateAsync(items, output);
        output.WriteLine($"SEED {items} items in {sw.Elapsed.TotalSeconds:0.0}s");
        await using var scope = provider.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        foreach (var t in new[] { "Invoices", "InvoiceLines", "BusinessPartners", "Items", "JournalEntries", "JournalEntryLines", "CashVouchers", "Companies", "StockMovements" })
        {
            try
            {
                await using var cmd = db.Database.GetDbConnection().CreateCommand();
                cmd.CommandText = $"SELECT COUNT(*) FROM \"{t}\"";
                output.WriteLine($"{t}: {await cmd.ExecuteScalarAsync()}");
            }
            catch (Exception e) { output.WriteLine($"{t}: n/a ({e.Message.Split('\n')[0]})"); }
        }
        await provider.DisposeAsync();
        connection.Dispose();
    }
}
