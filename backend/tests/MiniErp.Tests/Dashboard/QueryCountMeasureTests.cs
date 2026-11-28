using System.Diagnostics;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using MiniErp.Application.Common.Abstractions;
using MiniErp.Application.Common.Models;
using MiniErp.Application.Features.Dashboard;
using MiniErp.Application.Features.InventoryCostReports;
using MiniErp.Application.Features.InventoryStockReports;
using MiniErp.Application.Features.ProfitabilityReports;
using MiniErp.Infrastructure.Persistence;
using MiniErp.Tests.Seeding;
using Xunit.Abstractions;

namespace MiniErp.Tests.Dashboard;

/// <summary>Not an assertion test: prints SQL command count and time per read endpoint on seeded data (N+1 hunt).</summary>
public sealed class QueryCountMeasureTests(ITestOutputHelper output)
{
    [Fact]
    public async Task Print_query_counts_for_read_endpoints()
    {
        var (provider, _, _) = await VolumeSeedFixture.CreateAsync(10, output);
        await using var scope = provider.CreateAsyncScope();
        var sp = scope.ServiceProvider;
        var db = sp.GetRequiredService<ApplicationDbContext>();
        var companyId = await db.Companies.IgnoreQueryFilters().Select(c => c.Id).FirstAsync();
        AmbientCompany.Id = companyId;
        var storeId = await db.Stores.IgnoreQueryFilters().Where(s => s.CompanyId == companyId).Select(s => s.Id).FirstAsync();
        AmbientUser.Id = await db.UserCompanies.IgnoreQueryFilters().Where(u => u.CompanyId == companyId).Select(u => u.UserId).FirstAsync();
        var itemId = await db.Items.IgnoreQueryFilters().Where(i => i.CompanyId == companyId).Select(i => i.Id).FirstAsync();
        var q = QueryCounter.Instance;
        var page = new PaginationRequest { PageNumber = 1, PageSize = 50 };

        async Task Measure(string name, Func<Task<dynamic>> run)
        {
            var first = await run();                      // warm-up (EF model/query compile)
            output.WriteLine($"STATUS {name}: failure={first.IsFailure} {(first.IsFailure ? first.Errors[0].Code : "")}");
            q.Reset();
            var sw = Stopwatch.StartNew();
            await run();
            sw.Stop();
            var groups = q.Sql.GroupBy(s => s).Where(g => g.Count() > 2).Select(g => $"x{g.Count()} {g.Key.Replace('\n', ' ')[..Math.Min(110, g.Key.Length)]}");
            output.WriteLine($"MEASURE {name}: {q.Count} queries, {sw.ElapsedMilliseconds} ms");
            if (name == "dashboard") foreach (var sq in q.Sql) output.WriteLine("   SQL " + System.Text.RegularExpressions.Regex.Replace(sq, "\\s+", " ")[..Math.Min(150, System.Text.RegularExpressions.Regex.Replace(sq, "\\s+", " ").Length)]);
            foreach (var g in groups) output.WriteLine($"   REPEATED {g}");
        }

        await Measure("dashboard", async () => (dynamic)await sp.GetRequiredService<IDashboardService>().GetAsync(new DashboardFilterRequest()));
        await Measure("profitability.invoices", async () => (dynamic)await sp.GetRequiredService<IProfitabilityReportService>().GetInvoicesAsync(page, new ProfitabilityReportFilterRequest()));
        await Measure("inventory.stock", async () => (dynamic)await sp.GetRequiredService<IInventoryStockReportService>().GetAsync(page, new InventoryStockReportFilterRequest(storeId)));
        await Measure("inventory.cost", async () => (dynamic)await sp.GetRequiredService<IInventoryCostReportService>().GetAsync(page, new InventoryCostReportFilterRequest(StoreId: storeId, ItemId: itemId)));
        await Measure("invoices.list", async () => (dynamic)await sp.GetRequiredService<MiniErp.Application.Features.Invoices.IInvoiceQueryService>().GetAllAsync(page));
    }
}
