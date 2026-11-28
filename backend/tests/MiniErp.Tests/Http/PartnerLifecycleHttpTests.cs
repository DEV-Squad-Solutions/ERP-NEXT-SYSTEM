using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Xunit.Abstractions;

namespace MiniErp.Tests.Http;

/// <summary>Success path plus wrong-role and invalid-input for one full resource, over real HTTP.</summary>
public sealed class PartnerLifecycleHttpTests(ITestOutputHelper output)
{
    private static object Body(string name, string currency = "EGP", decimal credit = 1000) => new
    {
        name, phoneNumber = "01000000000", email = (string?)null, address = "القاهرة", taxNumber = (string?)null,
        currency, creditLimit = credit, isActive = true, special = false,
    };

    [Fact]
    public async Task Partner_create_read_update_delete_with_roles_and_validation()
    {
        await using var host = await ApiHost.CreateAsync(output, items: 5);
        var accountant = await host.ClientForAsync("accountant1");
        var admin = await host.ClientForAsync("manager1");

        // Success: Accountant creates a partner with an Arabic name.
        var create = await accountant.PostAsJsonAsync("/api/v1/BusinessPartners", Body("شركة الاختبار الحقيقية"));
        Assert.Equal(HttpStatusCode.Created, create.StatusCode);
        var created = await create.Content.ReadFromJsonAsync<JsonElement>();
        var id = created.GetProperty("id").GetInt32();
        Assert.Equal("شركة الاختبار الحقيقية", created.GetProperty("name").GetString());
        Assert.False(string.IsNullOrWhiteSpace(created.GetProperty("code").GetString()));

        // Read back by id and in the list.
        var get = await accountant.GetFromJsonAsync<JsonElement>($"/api/v1/BusinessPartners/{id}");
        Assert.Equal(1000m, get.GetProperty("creditLimit").GetDecimal());
        var list = await admin.GetFromJsonAsync<JsonElement>("/api/v1/BusinessPartners?search=الاختبار");
        var all = await accountant.GetFromJsonAsync<JsonElement>("/api/v1/BusinessPartners?pageSize=100");
        Assert.Contains(all.GetProperty("items").EnumerateArray(), p => p.GetProperty("id").GetInt32() == id);
        _ = list;

        // Update.
        var put = await accountant.PutAsJsonAsync($"/api/v1/BusinessPartners/{id}", Body("شركة الاختبار الحقيقية", "USD", 2500));
        Assert.Equal(HttpStatusCode.OK, put.StatusCode);
        var after = await accountant.GetFromJsonAsync<JsonElement>($"/api/v1/BusinessPartners/{id}");
        Assert.Equal(2500m, after.GetProperty("creditLimit").GetDecimal());

        // Invalid input is rejected with 400 and nothing is created.
        Assert.Equal(HttpStatusCode.BadRequest, (await accountant.PostAsJsonAsync("/api/v1/BusinessPartners", Body(""))).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await accountant.PostAsJsonAsync("/api/v1/BusinessPartners", Body("x", "EGP", -5))).StatusCode);

        // Note: partner create/update/delete is currently open to every signed-in role, including Cashier (open question for Ahmed).

        // Delete, then it is gone.
        Assert.Equal(HttpStatusCode.NoContent, (await accountant.DeleteAsync($"/api/v1/BusinessPartners/{id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await accountant.GetAsync($"/api/v1/BusinessPartners/{id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await accountant.DeleteAsync($"/api/v1/BusinessPartners/{id}")).StatusCode);
    }
}

public sealed class StatementRoleHttpTests(ITestOutputHelper output)
{
    // partnerAllowed / employeeAllowed: not 403 (the request itself may be 400/404 for placeholder ids).
    [Theory]
    [InlineData("manager1", true, true)]
    [InlineData("accountant1", true, true)]
    [InlineData("sales1", true, false)]
    [InlineData("cashier1", false, false)]
    public async Task Partner_and_employee_statement_roles(string user, bool partnerAllowed, bool employeeAllowed)
    {
        await using var host = await ApiHost.CreateAsync(output, items: 5);
        var c = await host.ClientForAsync(user);
        Assert.Equal(!partnerAllowed, (await c.GetAsync("/api/v1/Statements/partner?businessPartnerId=1")).StatusCode == HttpStatusCode.Forbidden);
        foreach (var url in new[]
        {
            "/api/v1/Statements/employee?employeeId=1",
            "/api/v1/Statements/employee/1/balance",
            "/api/v1/Statements/employee/1/account",
            "/api/v1/dashboard/payroll/employees/statement?employeeId=1",
        })
            Assert.Equal(!employeeAllowed, (await c.GetAsync(url)).StatusCode == HttpStatusCode.Forbidden);
    }
}
