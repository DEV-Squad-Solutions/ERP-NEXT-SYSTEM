using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using MiniErp.Domain.Entities.BusinessPartners;
using MiniErp.Domain.Entities.Employees;
using MiniErp.Infrastructure.Persistence;
using Xunit.Abstractions;

namespace MiniErp.Tests.Http;

/// <summary>AI center record lookups end to end: real API, seeded SQLite, Arabic and English questions.</summary>
public sealed class AiEntityHttpTests(ITestOutputHelper output)
{
    private static async Task<(string Answer, string[] Tools)> AskAsync(HttpClient c, string q)
    {
        var res = await c.PostAsJsonAsync("/api/v1/ai/ask", new { question = q });
        var body = await res.Content.ReadAsStringAsync();
        Assert.True(res.IsSuccessStatusCode, body);
        var j = JsonDocument.Parse(body).RootElement;
        var tools = j.TryGetProperty("toolsUsed", out var t) && t.ValueKind == JsonValueKind.Array
            ? t.EnumerateArray().Select(x => x.GetString()!).ToArray() : [];
        return (j.GetProperty("answer").GetString() ?? string.Empty, tools);
    }

    private static async Task<int> CompanyIdOf(HttpClient c)
    {
        var j = JsonDocument.Parse(await c.GetStringAsync("/api/v1/BusinessPartners?pageSize=1")).RootElement;
        return j.GetProperty("items")[0].GetProperty("companyId").GetInt32();
    }

    [Fact]
    public async Task Admin_can_ask_about_records_in_arabic_and_english()
    {
        await using var host = await ApiHost.CreateAsync(output, items: 10);
        var admin = await host.ClientForAsync("manager1");
        var companyId = await CompanyIdOf(admin);
        await using (var scope = host.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            db.BusinessPartners.AddRange(
                new BusinessPartner { CompanyId = companyId, Code = "BP-AR1", Name = "شركة النيل للتجارة" },
                new BusinessPartner { CompanyId = companyId, Code = "BP-AR2", Name = "شركة النيل للتصدير" },
                new BusinessPartner { CompanyId = companyId, Code = "BP-AR3", Name = "مؤسسة الأمل" });
            db.Employees.AddRange(
                new Employee { CompanyId = companyId, Code = "EMP-AR1", Name = "أحمد محمد علي", Type = MiniErp.Domain.Enums.EmployeeType.Monthly, MonthlySalary = 5000, RequiredWorkingDaysPerMonth = 26 },
                new Employee { CompanyId = companyId, Code = "EMP-AR2", Name = "أحمد حسن", Type = MiniErp.Domain.Enums.EmployeeType.Monthly, MonthlySalary = 4000, RequiredWorkingDaysPerMonth = 26 });
            await db.SaveChangesAsync();
        }

        // Partner balance by exact Arabic name.
        var (a1, t1) = await AskAsync(admin, "كام رصيد العميل مؤسسة الأمل؟");
        output.WriteLine(a1);
        Assert.Contains("مؤسسة الأمل", a1);
        Assert.Contains("الرصيد", a1);
        Assert.Contains("GetPartnerSummary", t1);

        // Two partners share "شركة النيل": the answer lists both instead of guessing.
        var (a2, _) = await AskAsync(admin, "رصيد العميل شركة النيل");
        output.WriteLine(a2);
        Assert.Contains("أي واحد تقصد", a2);
        Assert.Contains("شركة النيل للتجارة", a2);
        Assert.Contains("شركة النيل للتصدير", a2);

        // A distinguishing word resolves it again.
        var (a3, _) = await AskAsync(admin, "رصيد العميل شركة النيل للتصدير");
        Assert.Contains("شركة النيل للتصدير (BP-AR2)", a3);
        Assert.DoesNotContain("أي واحد تقصد", a3);

        // Arabic employee, two "أحمد": ambiguous. Full name resolves. Payslip with no entries says so.
        var (a4, _) = await AskAsync(admin, "رصيد الموظف أحمد");
        Assert.Contains("أي واحد تقصد", a4);
        var (a5, t5) = await AskAsync(admin, "مرتب الموظف أحمد حسن");
        output.WriteLine(a5);
        Assert.Contains("أحمد حسن", a5);
        Assert.Contains("لا توجد قسائم مرتب", a5);
        Assert.Contains("GetEmployeePayslip", t5);

        // Seeded English data: payslip with figures, item stock, last invoices.
        var (a6, _) = await AskAsync(admin, "last payslip of Sameh Yassin");
        output.WriteLine(a6);
        Assert.Contains("Sameh Yassin", a6);
        Assert.Contains("net", a6);
        var (a7, _) = await AskAsync(admin, "stock quantity of item Fresh Garlic 10kg Carton");
        output.WriteLine(a7);
        Assert.Contains("Fresh Garlic 10kg Carton", a7);
        Assert.Contains("total quantity", a7);

        // Unknown name and missing name.
        var (a8, _) = await AskAsync(admin, "رصيد العميل زيزو المجهول");
        Assert.Contains("لا يوجد", a8);
        var (a9, _) = await AskAsync(admin, "رصيد العميل");
        Assert.Contains("اكتب اسم", a9);

        // Audit log: who deleted something (answers from the audit table, may be empty on seeded data).
        var (a10, t10) = await AskAsync(admin, "مين حذف فاتورة؟");
        output.WriteLine(a10);
        Assert.Contains("GetAuditTrail", t10);
        Assert.False(string.IsNullOrWhiteSpace(a10));

        // Every question above is audited with the tools it ran.
        await using var scope2 = host.Services.CreateAsyncScope();
        var db2 = scope2.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var logs = await db2.AiQuestionLogs.AsNoTracking().ToListAsync();
        Assert.True(logs.Count >= 10, $"audited {logs.Count}");
        Assert.Contains(logs, l => l.ToolsUsed == "GetPartnerSummary" && l.Question.Contains("مؤسسة الأمل"));
        Assert.Contains(logs, l => l.ToolsUsed == "GetAuditTrail");
    }

    [Fact]
    public async Task Another_companys_records_are_never_found()
    {
        await using var host = await ApiHost.CreateAsync(output, items: 10);
        var admin = await host.ClientForAsync("manager1");
        var companyId = await CompanyIdOf(admin);
        string otherName;
        await using (var scope = host.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            otherName = "Foreign Partner Zeta";
            var otherCompany = await db.Companies.IgnoreQueryFilters().Where(c => c.Id != companyId).Select(c => c.Id).FirstAsync();
            db.BusinessPartners.Add(new BusinessPartner { CompanyId = otherCompany, Code = "BP-ZZ9", Name = otherName });
            await db.SaveChangesAsync();
        }

        var (answer, _) = await AskAsync(admin, $"customer balance {otherName}");
        output.WriteLine(answer);
        Assert.Contains("No customer or supplier matches", answer);
    }
}
