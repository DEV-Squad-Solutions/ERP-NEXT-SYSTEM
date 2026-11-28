using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using MiniErp.Infrastructure.Persistence;
using Xunit.Abstractions;

namespace MiniErp.Tests.Http;

/// <summary>Stock report (over HTTP) against the stored per-store balances, read with a separate query.</summary>
public sealed class StockReportVerificationTests(ITestOutputHelper output)
{
    [Fact]
    public async Task Stock_report_matches_store_balances_per_item_and_in_total()
    {
        await using var host = await ApiHost.CreateAsync(output, items: 10);
        var admin = await host.ClientForAsync("manager1");
        var companyId = (await admin.GetFromJsonAsync<JsonElement>("/api/v1/BusinessPartners?pageSize=1"))
            .GetProperty("items")[0].GetProperty("companyId").GetInt32();

        await using var scope = host.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var stores = await db.Stores.AsNoTracking().Where(s => s.CompanyId == companyId).Select(s => s.Id).ToListAsync();
        var checkedStores = 0;
        foreach (var storeId in stores)
        {
            var expected = await db.ItemStoreBalances.AsNoTracking()
                .Where(b => b.CompanyId == companyId && b.StoreId == storeId && b.Quantity != 0)
                .Select(b => new { b.ItemId, b.Quantity, b.InventoryValue }).ToListAsync();
            var res = await admin.GetAsync($"/api/v1/InventoryReports/stock?storeId={storeId}&pageSize=100&hasStock=true");
            if (!res.IsSuccessStatusCode) { output.WriteLine($"store {storeId}: {(int)res.StatusCode}"); continue; }
            var j = await res.Content.ReadFromJsonAsync<JsonElement>();
            var rows = j.GetProperty("items").EnumerateArray()
                .ToDictionary(i => i.GetProperty("itemId").GetInt32(), i => (Qty: i.GetProperty("balance").GetDecimal(), Val: i.GetProperty("inventoryValue").GetDecimal()));
            Assert.True(expected.Count <= 100, "test assumes one page");
            output.WriteLine($"store {storeId}: report rows={rows.Count} stored rows={expected.Count} reportTotal={j.GetProperty("summary").GetProperty("totalInventoryValue").GetDecimal():N2} storedTotal={expected.Sum(e => e.InventoryValue):N2}");
            Assert.Equal(expected.Count, rows.Count);
            foreach (var e in expected)
            {
                Assert.True(rows.ContainsKey(e.ItemId), $"item {e.ItemId} missing in report");
                Assert.Equal(e.Quantity, rows[e.ItemId].Qty);
                Assert.Equal(e.InventoryValue, rows[e.ItemId].Val, 2);
            }
            Assert.Equal(expected.Sum(e => e.InventoryValue), j.GetProperty("summary").GetProperty("totalInventoryValue").GetDecimal(), 2);
            checkedStores++;
        }
        Assert.True(checkedStores >= 1, "no store with a readable report");
    }
}
