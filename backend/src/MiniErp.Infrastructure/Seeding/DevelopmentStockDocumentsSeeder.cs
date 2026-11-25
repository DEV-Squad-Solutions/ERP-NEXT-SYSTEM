using Microsoft.EntityFrameworkCore;
using MiniErp.Application.Common.Abstractions;
using MiniErp.Application.Features.StockAdjustments;
using MiniErp.Application.Features.StockTransfers;
using MiniErp.Domain.Enums;
using MiniErp.Infrastructure.Persistence;
using MiniErp.Infrastructure.Services.FiscalYears;
using MiniErp.Infrastructure.Services.Inventory;
using MiniErp.Infrastructure.Services.Pagination;
using MiniErp.Infrastructure.Services.StockAdjustments;
using MiniErp.Infrastructure.Services.StockTransfers;

namespace MiniErp.Infrastructure.Seeding;

/// <summary>
/// Development-only data for stock transfers and stock adjustments.
/// Goes through the real services so balances, costing and fiscal-year
/// rules behave exactly like user entry. Idempotent through note markers.
/// </summary>
internal static class DevelopmentStockDocumentsSeeder
{
    private const string TransferMarker = "SEED-STF-";
    private const string AdjustmentMarker = "SEED-ADJ-";
    private static readonly DateOnly FirstDate = new(2026, 7, 26);

    public static async Task SeedAsync(
        ApplicationDbContext dbContext,
        int companyId,
        CancellationToken cancellationToken)
    {
        var company = new SeedContext(companyId);
        var stockService = new InventoryStockService(dbContext, company);
        var costingService = new InventoryCostingService(
            dbContext,
            company,
            TimeProvider.System);
        var scope = new FiscalYearQueryScopeResolver(dbContext, company);
        var guard = new FiscalYearPeriodGuard(dbContext, company);

        var stores = await dbContext.Stores
            .Where(store =>
                store.CompanyId == companyId &&
                store.IsActive &&
                !store.IsContainerStore)
            .OrderBy(store => store.Id)
            .Select(store => new { store.Id, store.Code })
            .ToListAsync(cancellationToken);
        var main = stores.FirstOrDefault(store => store.Code == "MAIN");
        var others = stores.Where(store => store.Code != "MAIN").ToList();
        if (main is null || others.Count == 0)
        {
            return;
        }

        var stocked = await dbContext.ItemStoreBalances
            .AsNoTracking()
            .Where(balance =>
                balance.CompanyId == companyId &&
                balance.StoreId == main.Id &&
                balance.Quantity >= 50m)
            .OrderBy(balance => balance.ItemId)
            .Select(balance => new
            {
                balance.ItemId,
                balance.AverageCost
            })
            .Take(12)
            .ToListAsync(cancellationToken);
        if (stocked.Count < 3)
        {
            return;
        }

        var transferService = new StockTransferService(
            dbContext,
            new PaginationService(),
            company,
            stockService,
            costingService,
            TimeProvider.System,
            scope,
            guard);
        var adjustmentService = new StockAdjustmentService(
            dbContext,
            new PaginationService(),
            company,
            stockService,
            costingService,
            TimeProvider.System,
            scope,
            guard);

        var existingTransfers = await dbContext.StockTransfers
            .IgnoreQueryFilters()
            .Where(entity =>
                entity.CompanyId == companyId &&
                entity.Notes != null &&
                entity.Notes.StartsWith(TransferMarker))
            .Select(entity => entity.Notes!)
            .ToListAsync(cancellationToken);

        for (var index = 1; index <= 10; index++)
        {
            var marker = $"{TransferMarker}{index:00}";
            if (existingTransfers.Any(note => note.StartsWith(marker)))
            {
                continue;
            }

            var lines = Enumerable.Range(0, 2 + index % 2)
                .Select(offset => stocked[(index + offset) % stocked.Count])
                .DistinctBy(item => item.ItemId)
                .Select(item => new StockTransferLineRequest(
                    item.ItemId,
                    1 + index % 5,
                    null))
                .ToList();
            var result = await transferService.AddAsync(
                new StockTransferRequest(
                    FirstDate.AddDays(index * 3 - 2),
                    main.Id,
                    others[index % others.Count].Id,
                    $"{marker} development stock transfer",
                    lines),
                cancellationToken);
            if (result.IsFailure)
            {
                // Best effort: a rejected sample document must not stop the rest of the seed.
                continue;
            }
        }

        var existingAdjustments = await dbContext.StockAdjustments
            .IgnoreQueryFilters()
            .Where(entity =>
                entity.CompanyId == companyId &&
                entity.Reason != null &&
                entity.Reason.StartsWith(AdjustmentMarker))
            .Select(entity => entity.Reason!)
            .ToListAsync(cancellationToken);

        for (var index = 1; index <= 8; index++)
        {
            var marker = $"{AdjustmentMarker}{index:00}";
            if (existingAdjustments.Any(reason => reason.StartsWith(marker)))
            {
                continue;
            }

            var increase = index % 2 == 1;
            var item = stocked[(index * 2) % stocked.Count];
            var line = new StockAdjustmentLineRequest(
                item.ItemId,
                2 + index % 3,
                increase ? "Found during stock check" : "Damaged goods")
            {
                UnitCost = increase && item.AverageCost > 0m
                    ? item.AverageCost
                    : null
            };
            var result = await adjustmentService.AddAsync(
                new StockAdjustmentRequest(
                    main.Id,
                    FirstDate.AddDays(index * 3),
                    increase
                        ? StockAdjustmentDirection.Increase
                        : StockAdjustmentDirection.Decrease,
                    $"{marker} development stock adjustment",
                    [line]),
                cancellationToken);
            if (result.IsFailure)
            {
                // Best effort: a rejected sample document must not stop the rest of the seed.
                continue;
            }
        }
    }

    private sealed record SeedContext(int CompanyId) : ICurrentCompanyContext;
}
