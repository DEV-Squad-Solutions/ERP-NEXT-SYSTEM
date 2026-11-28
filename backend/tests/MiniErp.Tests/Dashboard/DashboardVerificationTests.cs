using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using MiniErp.Application.Common.Abstractions;
using MiniErp.Application.Common.Results;
using MiniErp.Application.Features.AccountingReadiness;
using MiniErp.Application.Features.Dashboard;
using MiniErp.Infrastructure.Persistence;
using MiniErp.Infrastructure.Services.Dashboard;
using MiniErp.Infrastructure.Services.ProfitabilityReports;
using MiniErp.Tests.Seeding;
using Xunit.Abstractions;

namespace MiniErp.Tests.Dashboard;

/// <summary>
/// Seeds a throw-away SQLite database, then checks the dashboard's invoice figures against a
/// separate raw-SQL calculation over the same rows (the service uses LINQ, the check uses SQL).
/// </summary>
public sealed class DashboardVerificationTests(ITestOutputHelper output)
{
    private sealed class FixedCompany(int id) : ICurrentCompanyContext
    {
        public int CompanyId => id;
    }

    private sealed class ReadyAccounting : IAccountingReadinessService
    {
        public Task<Result<AccountingReadinessResponse>> GetAsync(int fiscalYearId, CancellationToken cancellationToken = default) =>
            Task.FromResult(Result<AccountingReadinessResponse>.Success(new AccountingReadinessResponse(
                fiscalYearId, "x", new DateOnly(2000, 1, 1), new DateOnly(2100, 1, 1), true,
                0, 0, 0, 0, 0, 0, 0, 0, 0, [], [])));

        public Task<Result<AccountingBackfillResponse>> BackfillAsync(int fiscalYearId, CancellationToken cancellationToken = default) =>
            throw new NotSupportedException();
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
    public async Task Invoice_figures_match_independent_sql_on_seeded_data()
    {
        var (provider, connection, _) = await VolumeSeedFixture.CreateAsync(10, output);
        await using var scope = provider.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var companyIds = await db.Companies.IgnoreQueryFilters().Select(c => c.Id).ToListAsync();
        var today = DateOnly.FromDateTime(DateTime.UtcNow).ToString("yyyy-MM-dd");
        var checkedCompanies = 0;

        foreach (var companyId in companyIds)
        {
            var company = new FixedCompany(companyId);
            var sut = new DashboardService(db, company, new ProfitabilityReportService(db, company),
                new ReadyAccounting(), TimeProvider.System);
            var result = await sut.GetAsync(new DashboardFilterRequest());
            if (result.IsFailure) { output.WriteLine($"company {companyId}: {result.Errors.First().Code}"); continue; }
            var d = result.Value;
            var args = new (string, object)[]
            {
                ("$c", companyId), ("$f", d.FiscalYearId),
                ("$from", d.FromDate.ToString("yyyy-MM-dd")), ("$to", d.ToDate.ToString("yyyy-MM-dd")), ("$today", today),
            };
            const string scopeSql = "WHERE CompanyId=$c AND FiscalYearId=$f AND InvoiceDate>=$from AND InvoiceDate<=$to";
            double Sum(int type, string expr = "CAST(BaseTotal AS REAL)") =>
                Scalar(connection, $"SELECT SUM({expr}) FROM Invoices {scopeSql} AND InvoiceType=$t", args.Append(("$t", type)).ToArray());
            const string unpaid = "CASE WHEN CAST(BaseTotal AS REAL)-CAST(BasePaidAmountAtInvoiceRate AS REAL) > 0 THEN CAST(BaseTotal AS REAL)-CAST(BasePaidAmountAtInvoiceRate AS REAL) ELSE 0 END";

            // 1 sales, 2 purchase, 3 sales return, 4 purchase return (same mapping the analytics check uses)
            Assert.Equal(Sum(1), (double)d.Sales.Total, 2);
            Assert.Equal(Sum(3), (double)d.Sales.Returns, 2);
            Assert.Equal(Sum(1) - Sum(3), (double)d.Sales.Net, 2);
            Assert.Equal(Sum(1, unpaid), (double)d.Sales.Outstanding, 2);
            Assert.Equal(Sum(2), (double)d.Purchases.Total, 2);
            Assert.Equal(Sum(4), (double)d.Purchases.Returns, 2);
            Assert.Equal(Sum(2) - Sum(4), (double)d.Purchases.Net, 2);
            Assert.Equal(Sum(2, unpaid), (double)d.Purchases.Outstanding, 2);

            // Invoice status buckets cover sales and purchase invoices only (returns are not payable documents).
            double Count(string cond) => Scalar(connection, $"SELECT COUNT(*) FROM Invoices {scopeSql} AND InvoiceType IN (1,2) AND {cond}", args);
            Assert.Equal(Count("CAST(Total AS REAL)-CAST(PaidAmount AS REAL) <= 0"), d.InvoiceStatus.PaidCount);
            Assert.Equal(Count("CAST(PaidAmount AS REAL) <= 0 AND CAST(Total AS REAL) > 0"), d.InvoiceStatus.UnpaidCount);
            Assert.Equal(Count("DueDate IS NOT NULL AND DueDate < $today AND CAST(Total AS REAL)-CAST(PaidAmount AS REAL) > 0"), d.InvoiceStatus.OverdueCount);
            Assert.Equal(
                Scalar(connection, $"SELECT SUM({unpaid}) FROM Invoices {scopeSql} AND InvoiceType IN (1,2) AND DueDate IS NOT NULL AND DueDate < $today AND CAST(Total AS REAL)-CAST(PaidAmount AS REAL) > 0", args),
                (double)d.InvoiceStatus.OverdueAmount, 2);

            Assert.Equal(Count("1=1") - Count("CAST(Total AS REAL)-CAST(PaidAmount AS REAL) <= 0") - Count("CAST(PaidAmount AS REAL) <= 0 AND CAST(Total AS REAL) > 0"), d.InvoiceStatus.PartiallyPaidCount);

            // Monthly activity adds back up to the headline numbers.
            Assert.Equal((double)d.Sales.Net, (double)d.MonthlyActivity.Sum(m => m.Sales), 2);
            Assert.Equal((double)d.Purchases.Net, (double)d.MonthlyActivity.Sum(m => m.Purchases), 2);

            output.WriteLine($"company {companyId}: sales net={d.Sales.Net:N2} purchases net={d.Purchases.Net:N2} overdue={d.InvoiceStatus.OverdueCount}");
            checkedCompanies++;
        }

        Assert.True(checkedCompanies >= 1, "no company had a current fiscal year to check");
        await provider.DisposeAsync();
        connection.Dispose();
    }
}
