using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using MiniErp.Application.Common.Abstractions;
using MiniErp.Application.Features.Analytics;
using MiniErp.Infrastructure.Persistence;
using MiniErp.Infrastructure.Services.Analytics;
using MiniErp.Tests.Seeding;
using Xunit.Abstractions;

namespace MiniErp.Tests.Analytics;

/// <summary>
/// Seeds a throw-away SQLite database with the opt-in development seeder, then checks every
/// analytics figure against a separate raw-SQL calculation on the same rows.
/// </summary>
public sealed class AnalyticsVerificationTests(ITestOutputHelper output)
{
    private sealed class FixedCompany(int id) : ICurrentCompanyContext
    {
        public int CompanyId => id;
    }

    private static double Scalar(SqliteConnection c, string sql, params (string, object)[] p)
    {
        using var cmd = c.CreateCommand();
        cmd.CommandText = sql;
        foreach (var (k, v) in p) cmd.Parameters.AddWithValue(k, v);
        var r = cmd.ExecuteScalar();
        return r is null or DBNull ? 0 : Convert.ToDouble(r);
    }

    [Fact]
    public async Task Overview_matches_independent_sql_on_seeded_data()
    {
        var (provider, connection, _) = await VolumeSeedFixture.CreateAsync(10, output);
        await using var scope = provider.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var companyIds = await db.Companies.IgnoreQueryFilters().Select(c => c.Id).ToListAsync();
        Assert.True(companyIds.Count >= 2, "expected several seeded companies");

        var checkedCompanies = 0;
        foreach (var companyId in companyIds)
        {
            var sut = new AnalyticsService(db, new FixedCompany(companyId), TimeProvider.System);
            var result = await sut.GetOverviewAsync(new AnalyticsQuery(new DateOnly(2000, 1, 1), new DateOnly(2100, 1, 1), 5));
            Assert.True(result.IsSuccess, string.Join(";", result.Errors.Select(e => e.Description)));
            var o = result.Value;
            var cid = ("$c", (object)companyId);

            // Sales and purchases per month, net of returns.
            var sqlSales = Scalar(connection,
                "SELECT SUM(CASE InvoiceType WHEN 1 THEN CAST(BaseTotal AS REAL) WHEN 3 THEN -CAST(BaseTotal AS REAL) ELSE 0 END) FROM Invoices WHERE CompanyId=$c", cid);
            var sqlPurch = Scalar(connection,
                "SELECT SUM(CASE InvoiceType WHEN 2 THEN CAST(BaseTotal AS REAL) WHEN 4 THEN -CAST(BaseTotal AS REAL) ELSE 0 END) FROM Invoices WHERE CompanyId=$c", cid);
            Assert.Equal(sqlSales, (double)o.Trend.Sum(t => t.Sales), 2);
            Assert.Equal(sqlPurch, (double)o.Trend.Sum(t => t.Purchases), 2);

            // Months: count of distinct months must match.
            Assert.Equal(
                Scalar(connection, "SELECT COUNT(DISTINCT substr(InvoiceDate,1,7)) FROM Invoices WHERE CompanyId=$c", cid),
                o.Trend.Count);

            // Top item by net revenue.
            if (o.TopItems.Count > 0)
            {
                var top = o.TopItems[0];
                var sqlTop = Scalar(connection,
                    "SELECT SUM(CASE i.InvoiceType WHEN 1 THEN CAST(l.BaseTotal AS REAL) WHEN 3 THEN -CAST(l.BaseTotal AS REAL) END) " +
                    "FROM InvoiceLines l JOIN Invoices i ON i.Id=l.InvoiceId WHERE l.CompanyId=$c AND l.ItemId=$i AND i.InvoiceType IN (1,3)",
                    cid, ("$i", top.ItemId));
                Assert.Equal(sqlTop, (double)top.Revenue, 2);
                var sqlMax = Scalar(connection,
                    "SELECT MAX(s) FROM (SELECT SUM(CASE i.InvoiceType WHEN 1 THEN CAST(l.BaseTotal AS REAL) WHEN 3 THEN -CAST(l.BaseTotal AS REAL) END) s " +
                    "FROM InvoiceLines l JOIN Invoices i ON i.Id=l.InvoiceId WHERE l.CompanyId=$c AND l.ItemId IS NOT NULL AND i.InvoiceType IN (1,3) GROUP BY l.ItemId)", cid);
                Assert.Equal(sqlMax, (double)top.Revenue, 2);
                Assert.True(o.TopItems.Zip(o.TopItems.Skip(1)).All(p => p.First.Revenue >= p.Second.Revenue));
            }

            // Slow items never appear among sold items.
            var soldIds = o.TopItems.Select(i => i.ItemId).ToHashSet();
            Assert.DoesNotContain(o.SlowItems, s => soldIds.Contains(s.ItemId));
            foreach (var s in o.SlowItems)
            {
                Assert.Equal(0, Scalar(connection,
                    "SELECT COUNT(*) FROM InvoiceLines l JOIN Invoices i ON i.Id=l.InvoiceId WHERE l.CompanyId=$c AND l.ItemId=$i AND i.InvoiceType=1", cid, ("$i", s.ItemId)));
            }

            // Top customer total and outstanding.
            if (o.TopCustomers.Count > 0)
            {
                var c0 = o.TopCustomers[0];
                Assert.Equal(
                    Scalar(connection, "SELECT SUM(CAST(BaseTotal AS REAL)) FROM Invoices WHERE CompanyId=$c AND InvoiceType=1 AND BusinessPartnerId=$p", cid, ("$p", c0.PartnerId)),
                    (double)c0.Total, 2);
                Assert.Equal(
                    Scalar(connection, "SELECT COUNT(*) FROM Invoices WHERE CompanyId=$c AND InvoiceType=1 AND BusinessPartnerId=$p", cid, ("$p", c0.PartnerId)),
                    c0.InvoiceCount);
            }

            // Aging total equals the unpaid amount of all sales/purchase invoices.
            var sqlRec = Scalar(connection,
                "SELECT SUM(CAST(BaseTotal AS REAL)-CAST(BasePaidAmountAtInvoiceRate AS REAL)) FROM Invoices WHERE CompanyId=$c AND InvoiceType=1 AND CAST(BaseTotal AS REAL)-CAST(BasePaidAmountAtInvoiceRate AS REAL) > 0", cid);
            var sqlPay = Scalar(connection,
                "SELECT SUM(CAST(BaseTotal AS REAL)-CAST(BasePaidAmountAtInvoiceRate AS REAL)) FROM Invoices WHERE CompanyId=$c AND InvoiceType=2 AND CAST(BaseTotal AS REAL)-CAST(BasePaidAmountAtInvoiceRate AS REAL) > 0", cid);
            Assert.Equal(sqlRec, (double)o.Aging.Receivables.Total, 2);
            Assert.Equal(sqlPay, (double)o.Aging.Payables.Total, 2);

            // The AI center's built-in analyst must quote exactly these verified figures.
            var cur = o.Period.Currency;
            if (o.TopItems.Count > 0)
            {
                var text = MiniErp.Application.Features.Ai.BuiltInAnalyst.AnalyticsAnswer("ما أكثر صنف مبيعا؟", o);
                Assert.NotNull(text);
                Assert.Contains(o.TopItems[0].Name, text);
                Assert.Contains($"{o.TopItems[0].Revenue:N2} {cur}", text);
            }

            var aging = MiniErp.Application.Features.Ai.BuiltInAnalyst.AnalyticsAnswer("أعمار الديون", o);
            Assert.NotNull(aging);
            Assert.Contains($"{o.Aging.Receivables.Total:N2} {cur}", aging);
            Assert.Contains($"{o.Aging.Payables.Total:N2} {cur}", aging);
            Assert.Null(MiniErp.Application.Features.Ai.BuiltInAnalyst.AnalyticsAnswer("مرحبا", o));

            output.WriteLine($"company {companyId}: months={o.Trend.Count} sales={sqlSales:N2} purchases={sqlPurch:N2} receivables={sqlRec:N2} payables={sqlPay:N2} topItem={(o.TopItems.Count > 0 ? o.TopItems[0].Name : "-")}");
            checkedCompanies++;
        }

        Assert.True(checkedCompanies >= 2);
        await provider.DisposeAsync();
        connection.Dispose();
    }

    [Fact]
    public async Task Invalid_range_is_rejected()
    {
        var (provider, connection, _) = await VolumeSeedFixture.CreateAsync(1, output);
        await using var scope = provider.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var sut = new AnalyticsService(db, new FixedCompany(1), TimeProvider.System);
        var result = await sut.GetOverviewAsync(new AnalyticsQuery(new DateOnly(2026, 5, 1), new DateOnly(2026, 4, 1)));
        Assert.True(result.IsFailure);
        await provider.DisposeAsync();
        connection.Dispose();
    }
}
