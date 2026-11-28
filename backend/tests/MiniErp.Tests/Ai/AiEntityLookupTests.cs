using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using MiniErp.Application.Common.Abstractions;
using MiniErp.Application.Common.Results;
using MiniErp.Application.Features.Ai;
using MiniErp.Infrastructure.Persistence;
using MiniErp.Infrastructure.Services.Ai;

namespace MiniErp.Tests.Ai;

public sealed class AiEntityLookupTests
{
    private static readonly string[] Entity =
        ["GetPartnerSummary", "GetPartnerInvoices", "GetEmployeeSummary", "GetEmployeePayslip", "GetItemStock", "GetAuditTrail"];

    [Theory]
    [InlineData("كام رصيد العميل شركة النيل؟", "GetPartnerSummary")]
    [InlineData("آخر فاتورة للعميل مؤسسة الأمل", "GetPartnerInvoices")]
    [InlineData("اخر فاتورة مبيعات للعميل احمد", "GetPartnerInvoices")]
    [InlineData("مرتب الموظف أحمد حسن", "GetEmployeePayslip")]
    [InlineData("حساب الموظف محمود", "GetEmployeeSummary")]
    [InlineData("كشف حساب الموظف محمود", "GetEmployeeSummary")]
    [InlineData("رصيد الصنف بطاطس", "GetItemStock")]
    [InlineData("مين عدل الفاتورة 105؟", "GetAuditTrail")]
    [InlineData("who deleted the customer Nile Co", "GetAuditTrail")]
    [InlineData("last payslip of Sameh Yassin", "GetEmployeePayslip")]
    [InlineData("stock of item Fresh Garlic", "GetItemStock")]
    [InlineData("supplier balance Cairo Packaging", "GetPartnerSummary")]
    [InlineData("رصيد محمود", "GetPartnerSummary,GetEmployeeSummary")]
    public void Router_picks_the_record_tool(string q, string expected) =>
        Assert.Equal(expected, string.Join(',', AiIntentRouter.RouteEntities(q, Entity)));

    [Theory]
    [InlineData("كام مبيعات الشهر ده؟")]
    [InlineData("what is my cash balance")]
    [InlineData("رصيد الخزينة")]
    [InlineData("top customers this quarter")]
    [InlineData("ايه مؤشرات الأداء؟")]
    public void Company_wide_questions_do_not_trigger_record_tools(string q) =>
        Assert.Empty(AiIntentRouter.RouteEntities(q, Entity));

    private static readonly AiEntityCandidate[] People =
    [
        new(1, "E1", "أحمد محمد علي"), new(2, "E2", "أحمد حسن"), new(3, "E3", "منى سعيد"), new(4, "E4", "Sameh Yassin"),
        new(5, "E5", "Sameh Hassan"),
    ];

    [Theory]
    [InlineData("مرتب الموظفة منى", AiEntityStatus.Ok, "3")]
    [InlineData("رصيد الموظف احمد حسن", AiEntityStatus.Ok, "2")]
    [InlineData("رصيد الموظف أحمد", AiEntityStatus.Ambiguous, "2,1")]
    [InlineData("راتب الموظف لمنى سعيد", AiEntityStatus.Ok, "3")]
    [InlineData("payslip of Sameh Yassin", AiEntityStatus.Ok, "4")]
    [InlineData("payslip of sameh", AiEntityStatus.Ambiguous, "5,4")]
    [InlineData("رصيد الموظف خالد", AiEntityStatus.NotFound, "")]
    public void Resolver_handles_arabic_forms_and_ambiguity(string q, string status, string ids)
    {
        var (s, matches) = AiNameResolver.Resolve(q, People);
        Assert.Equal(status, s);
        Assert.Equal(ids, string.Join(',', matches.Select(m => m.Id)));
    }

    [Fact]
    public void Resolver_matches_code_and_ignores_diacritics()
    {
        Assert.Equal("3", string.Join(',', AiNameResolver.Resolve("رصيد E3", People).Matches.Select(m => m.Id)));
        Assert.Equal("3", string.Join(',', AiNameResolver.Resolve("مُنَى", People).Matches.Select(m => m.Id)));
    }

    [Fact]
    public void Dates_in_question_are_parsed_in_order()
    {
        Assert.Equal((new DateOnly(2026, 1, 5), new DateOnly(2026, 3, 1)), AiNameResolver.DatesIn("from 2026-03-01 to 2026-01-05"));
        Assert.Equal((null, null), AiNameResolver.DatesIn("no dates"));
    }

    private sealed class User(params string[] roles) : ICurrentUserService
    {
        public Result<Guid> GetUserId() => Result<Guid>.Success(Guid.NewGuid());
        public IReadOnlyCollection<string> GetRoles() => roles;
    }

    private sealed class Company : ICurrentCompanyContext
    {
        public int CompanyId => 2;
    }

    [Theory]
    [InlineData("Accountant", "GetAuditTrail", true)]
    [InlineData("User", "GetPartnerSummary", true)]
    [InlineData("User", "GetEmployeePayslip", true)]
    [InlineData("Cashier", "GetItemStock", true)]
    [InlineData("Cashier", "GetPartnerInvoices", true)]
    [InlineData("User", "GetItemStock", false)]
    [InlineData("Accountant", "GetPartnerSummary", false)]
    [InlineData("Admin", "GetAuditTrail", false)]
    public async Task Every_tool_checks_the_asker_role_before_reading_anything(string role, string tool, bool forbidden)
    {
        var connection = new SqliteConnection("Data Source=:memory:");
        connection.Open();
        await using var db = new ApplicationDbContext(new DbContextOptionsBuilder<ApplicationDbContext>().UseSqlite(connection).Options);
        db.Database.EnsureCreated();
        var tools = new AiEntityTools(db, new Company(), new User(role), null!);
        var r = await tools.ExecuteAsync(tool, new AiEntityQuery("رصيد نيل", null, null));
        var status = ((AiEntityResult)r.Data!).Status;
        if (forbidden) Assert.Equal(AiEntityStatus.Forbidden, status);
        else Assert.NotEqual(AiEntityStatus.Forbidden, status);
    }

    [Fact]
    public void Forbidden_answer_does_not_reveal_data_and_is_localised()
    {
        var res = new AiToolResult("GetAuditTrail", new AiEntityResult(AiEntityStatus.Forbidden, "GetAuditTrail", [], null), null);
        Assert.Contains("صلاحيتك", AiEntityAnswer.Format("مين حذف", [res]));
        Assert.Contains("role does not have access", AiEntityAnswer.Format("who deleted", [res]));
    }
}
