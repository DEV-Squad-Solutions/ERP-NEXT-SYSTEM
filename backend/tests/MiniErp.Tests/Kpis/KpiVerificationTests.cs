using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using MiniErp.Application.Common.Abstractions;
using MiniErp.Application.Common.Results;
using MiniErp.Application.Features.AccountingReadiness;
using MiniErp.Application.Features.Dashboard;
using MiniErp.Application.Features.Kpis;
using MiniErp.Infrastructure.Persistence;
using MiniErp.Infrastructure.Services.Dashboard;
using MiniErp.Infrastructure.Services.ProfitabilityReports;
using MiniErp.Tests.Seeding;
using Xunit.Abstractions;

namespace MiniErp.Tests.Kpis;

/// <summary>
/// Seeds a throw-away SQLite database, then checks the dashboard's invoice figures against a
/// separate raw-SQL calculation over the same rows (the service uses LINQ, the check uses SQL).
/// </summary>
public sealed class KpiVerificationTests(ITestOutputHelper output)
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
    public async Task Kpis_match_independent_sql_and_their_own_formulas()
    {
        var (provider, connection, _) = await VolumeSeedFixture.CreateAsync(10, output);
        await using var scope = provider.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var companyIds = await db.Companies.IgnoreQueryFilters().Select(c => c.Id).ToListAsync();
        var checkedCompanies = 0;

        foreach (var companyId in companyIds)
        {
            var company = new FixedCompany(companyId);
            var dash = new DashboardService(db, company, new ProfitabilityReportService(db, company),
                new ReadyAccounting(), TimeProvider.System);
            var result = await new KpiService(dash).GetAsync(new DashboardFilterRequest());
            if (result.IsFailure) continue;
            var k = result.Value;
            decimal? V(string code) => k.Items.Single(i => i.Code == code).Value;
            var args = new (string, object)[]
            {
                ("$c", companyId), ("$f", k.FiscalYearId),
                ("$from", k.FromDate.ToString("yyyy-MM-dd")), ("$to", k.ToDate.ToString("yyyy-MM-dd")),
            };
            const string scopeSql = "WHERE CompanyId=$c AND FiscalYearId=$f AND InvoiceDate>=$from AND InvoiceDate<=$to";
            double Sum(int type, string expr = "CAST(BaseTotal AS REAL)") =>
                Scalar(connection, $"SELECT SUM({expr}) FROM Invoices {scopeSql} AND InvoiceType=$t", args.Append(("$t", type)).ToArray());
            const string unpaid = "CASE WHEN CAST(BaseTotal AS REAL)-CAST(BasePaidAmountAtInvoiceRate AS REAL) > 0 THEN CAST(BaseTotal AS REAL)-CAST(BasePaidAmountAtInvoiceRate AS REAL) ELSE 0 END";

            // Figures that come from invoices: independent SQL.
            Assert.Equal(Sum(1) - Sum(3), (double)V("net_sales")!.Value, 2);
            Assert.Equal(Sum(2) - Sum(4), (double)V("net_purchases")!.Value, 2);
            Assert.Equal(Sum(1, unpaid), (double)V("receivables")!.Value, 2);
            Assert.Equal(Sum(2, unpaid), (double)V("payables")!.Value, 2);

            // Derived KPIs: recomputed from the KPI items by the stated formula.
            var wc = V("cash_balance")!.Value + V("receivables")!.Value + V("inventory_value")!.Value - V("payables")!.Value;
            Assert.Equal(wc, V("working_capital")!.Value);
            var payables = V("payables")!.Value;
            if (payables > 0)
                Assert.Equal(Math.Round((V("cash_balance")!.Value + V("receivables")!.Value + V("inventory_value")!.Value) / payables, 2), V("current_ratio")!.Value);
            else
                Assert.Null(V("current_ratio"));
            if (V("gross_profit") is { } gp)
            {
                Assert.Equal(V("net_sales")!.Value - V("cogs")!.Value, gp);
                if (V("net_sales")!.Value != 0 && V("gross_margin") is { } gm)
                    Assert.Equal((double)(gp / V("net_sales")!.Value * 100), (double)gm, 1);
            }

            // KPIs that need data the ERP does not expose here must stay null, never an invented number.
            Assert.Null(V("operating_expenses"));
            Assert.Null(V("net_profit"));
            Assert.All(k.Items, i => Assert.False(string.IsNullOrWhiteSpace(i.Formula)));

            output.WriteLine($"company {companyId}: net_sales={V("net_sales"):N2} receivables={V("receivables"):N2} working_capital={V("working_capital"):N2}");
            checkedCompanies++;
        }

        Assert.True(checkedCompanies >= 1);
        await provider.DisposeAsync();
        connection.Dispose();
    }
}
