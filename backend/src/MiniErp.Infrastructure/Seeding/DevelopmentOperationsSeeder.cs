using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using MiniErp.Application.Common.Authentication;
using MiniErp.Application.Features.CashboxRevaluations;
using MiniErp.Application.Features.CashboxTransfers;
using MiniErp.Application.Features.DriverOpeningBalances;
using MiniErp.Application.Features.InventoryCounts;
using MiniErp.Domain.Entities.CashManagement;
using MiniErp.Domain.Enums;
using MiniErp.Infrastructure.Persistence;

namespace MiniErp.Infrastructure.Seeding;

/// <summary>
/// Development-only sample operations: cashbox transfers, revaluations, driver
/// opening balances and stocktakes. Everything goes through the real services,
/// under an admin identity scoped to the company, so rules behave like user
/// entry. Best effort: a rejected sample never stops the rest of the seed.
/// Idempotent through markers.
/// </summary>
internal static class DevelopmentOperationsSeeder
{
    private const string TransferMarker = "SEED-CBT-";
    private const string CountMarker = "SEED-CNT-";
    private const string DriverMarker = "SEED-DOB-";
    private static readonly DateOnly FirstDate = new(2026, 7, 5);

    public static async Task SeedAsync(
        IServiceProvider services,
        ApplicationDbContext dbContext,
        int companyId,
        CancellationToken cancellationToken)
    {
        var admin = await dbContext.Users
            .AsNoTracking()
            .Where(user => user.UserName == "admin")
            .Select(user => user.Id)
            .FirstOrDefaultAsync(cancellationToken);
        if (admin == Guid.Empty)
        {
            return;
        }

        await EnsureCashboxesAsync(dbContext, companyId, cancellationToken);

        await using var scope = services.CreateAsyncScope();
        var accessor = scope.ServiceProvider.GetRequiredService<IHttpContextAccessor>();
        var identity = new ClaimsIdentity(
            [
                new Claim("sub", admin.ToString()),
                new Claim(CustomClaimTypes.CompanyId, companyId.ToString()),
                new Claim(ClaimTypes.Role, ApplicationRoles.Admin)
            ],
            "seed");
        accessor.HttpContext = new DefaultHttpContext
        {
            RequestServices = scope.ServiceProvider,
            User = new ClaimsPrincipal(identity)
        };

        try
        {
            await SeedTransfersAsync(scope.ServiceProvider, dbContext, companyId, cancellationToken);
            await SeedRevaluationsAsync(scope.ServiceProvider, dbContext, companyId, cancellationToken);
            await SeedDriverBalancesAsync(scope.ServiceProvider, dbContext, companyId, cancellationToken);
            await SeedCountsAsync(scope.ServiceProvider, dbContext, companyId, cancellationToken);
        }
        finally
        {
            accessor.HttpContext = null;
        }
    }

    internal static async Task EnsureCashboxesAsync(
        ApplicationDbContext dbContext,
        int companyId,
        CancellationToken cancellationToken)
    {
        var seeds = new[]
        {
            (Code: "CASH-SALES", Name: "Sales Cashbox", Currency: CurrencyCode.EGP, Opening: 25_000m),
            (Code: "CASH-USD", Name: "USD Cashbox", Currency: CurrencyCode.USD, Opening: 4_000m)
        };
        foreach (var seed in seeds)
        {
            var exists = await dbContext.Cashboxes
                .IgnoreQueryFilters()
                .AnyAsync(
                    entity => entity.CompanyId == companyId && entity.Code == seed.Code,
                    cancellationToken);
            if (exists)
            {
                continue;
            }

            var cashbox = new Cashbox
            {
                CompanyId = companyId,
                Code = seed.Code,
                Name = seed.Name,
                Currency = seed.Currency,
                OpeningBalance = seed.Opening,
                IsActive = true,
                Notes = "Development seed cashbox"
            };
            cashbox.ApplyOpeningExchangeRate(
                new DateOnly(2026, 1, 1),
                null,
                seed.Currency == CurrencyCode.EGP ? 1m : 48m);
            dbContext.Cashboxes.Add(cashbox);
        }

        await dbContext.SaveChangesAsync(cancellationToken);
    }

    private static async Task SeedTransfersAsync(
        IServiceProvider sp,
        ApplicationDbContext dbContext,
        int companyId,
        CancellationToken cancellationToken)
    {
        var service = sp.GetRequiredService<ICashboxTransferService>();
        var boxes = await dbContext.Cashboxes
            .AsNoTracking()
            .Where(c => c.CompanyId == companyId &&
                (c.Code == "CASH-MAIN" || c.Code == "CASH-SALES" || c.Code == "CASH-USD"))
            .ToDictionaryAsync(c => c.Code, c => c.Id, cancellationToken);
        if (boxes.Count < 3)
        {
            return;
        }

        var existing = await dbContext.CashboxTransfers
            .IgnoreQueryFilters()
            .Where(t => t.CompanyId == companyId && t.Notes != null && t.Notes.StartsWith(TransferMarker))
            .Select(t => t.Notes!)
            .ToListAsync(cancellationToken);

        for (var index = 1; index <= 8; index++)
        {
            var marker = $"{TransferMarker}{index:00}";
            if (existing.Any(note => note.StartsWith(marker)))
            {
                continue;
            }

            var toUsd = index % 4 == 0;
            var reverse = index % 2 == 1 && !toUsd;
            var source = reverse ? boxes["CASH-SALES"] : boxes["CASH-MAIN"];
            var destination = toUsd
                ? boxes["CASH-USD"]
                : reverse ? boxes["CASH-MAIN"] : boxes["CASH-SALES"];
            try
            {
                await service.AddAsync(
                    new CashboxTransferRequest(
                        FirstDate.AddDays(index * 3),
                        source,
                        destination,
                        toUsd ? 4_800m + index * 100m : 1_000m + index * 250m,
                        "Seed cashbox transfer",
                        $"{marker} development cashbox transfer"),
                    cancellationToken);
            }
            catch (Exception)
            {
                // Best effort.
            }
        }
    }

    private static async Task SeedRevaluationsAsync(
        IServiceProvider sp,
        ApplicationDbContext dbContext,
        int companyId,
        CancellationToken cancellationToken)
    {
        var service = sp.GetRequiredService<ICashboxRevaluationService>();
        var usd = await dbContext.Cashboxes
            .AsNoTracking()
            .Where(c => c.CompanyId == companyId && c.Code == "CASH-USD")
            .Select(c => c.Id)
            .FirstOrDefaultAsync(cancellationToken);
        if (usd == 0)
        {
            return;
        }

        var rates = new (DateOnly Date, decimal Rate)[]
        {
            (new DateOnly(2026, 7, 15), 48.6m),
            (new DateOnly(2026, 7, 31), 49.1m)
        };
        foreach (var (date, rate) in rates)
        {
            try
            {
                await service.CreateAsync(
                    new CashboxRevaluationRequest(usd, date, rate),
                    cancellationToken);
            }
            catch (Exception)
            {
                // Best effort (already revalued, closed year, ...).
            }
        }
    }

    private static async Task SeedDriverBalancesAsync(
        IServiceProvider sp,
        ApplicationDbContext dbContext,
        int companyId,
        CancellationToken cancellationToken)
    {
        var service = sp.GetRequiredService<IDriverOpeningBalanceService>();
        var year = await dbContext.FiscalYears
            .AsNoTracking()
            .Where(y => y.CompanyId == companyId && y.Status == FiscalYearStatus.Open)
            .OrderBy(y => y.StartDate)
            .Select(y => y.Id)
            .FirstOrDefaultAsync(cancellationToken);
        if (year == 0)
        {
            return;
        }

        var drivers = await dbContext.Drivers
            .AsNoTracking()
            .Where(d => d.CompanyId == companyId && d.IsActive)
            .OrderBy(d => d.Id)
            .Select(d => d.Id)
            .Take(4)
            .ToListAsync(cancellationToken);
        var index = 0;
        foreach (var driverId in drivers)
        {
            index++;
            try
            {
                await service.AddAsync(
                    new DriverOpeningBalanceRequest(
                        driverId,
                        year,
                        1_500m * index,
                        index % 2 == 0
                            ? DriverOpeningBalanceType.Receivable
                            : DriverOpeningBalanceType.Payable,
                        $"{DriverMarker}{index:00} development opening balance"),
                    cancellationToken);
            }
            catch (Exception)
            {
                // Best effort (already exists, ...).
            }
        }
    }

    private static async Task SeedCountsAsync(
        IServiceProvider sp,
        ApplicationDbContext dbContext,
        int companyId,
        CancellationToken cancellationToken)
    {
        var service = sp.GetRequiredService<IInventoryCountService>();
        var stores = await dbContext.Stores
            .AsNoTracking()
            .Where(s => s.CompanyId == companyId && s.IsActive && !s.IsContainerStore)
            .OrderBy(s => s.Id)
            .Select(s => s.Id)
            .Take(2)
            .ToListAsync(cancellationToken);

        var existing = await dbContext.InventoryCounts
            .IgnoreQueryFilters()
            .Where(c => c.CompanyId == companyId && c.Notes != null && c.Notes.StartsWith(CountMarker))
            .Select(c => c.Notes!)
            .ToListAsync(cancellationToken);

        var index = 0;
        foreach (var storeId in stores)
        {
            index++;
            var marker = $"{CountMarker}{index:00}";
            if (existing.Any(note => note.StartsWith(marker)))
            {
                continue;
            }

            try
            {
                var created = await service.AddAsync(
                    new InventoryCountRequest(
                        storeId,
                        new DateOnly(2026, 7, 28 + index),
                        $"{marker} development stocktake"),
                    cancellationToken);
                if (created.IsFailure)
                {
                    continue;
                }

                var count = created.Value;
                var lines = count.Lines
                    .Select((line, position) => new InventoryCountLineUpdateRequest(
                        line.ItemId,
                        position % 7 == 3
                            ? Math.Max(0m, line.SystemQuantity - 2m)
                            : position % 11 == 5
                                ? line.SystemQuantity + 1m
                                : line.SystemQuantity,
                        position % 7 == 3 ? "Shortage found" : null))
                    .ToList();
                var updated = await service.UpdateAsync(
                    count.Id,
                    new InventoryCountUpdateRequest(count.Notes, lines, count.RowVersion),
                    cancellationToken);
                if (updated.IsFailure || index != 1)
                {
                    // Leave the second stocktake open so the screen shows both states.
                    continue;
                }

                var costs = updated.Value.Lines
                    .Where(line => line.Difference > 0m)
                    .Select(line => new InventoryCountIncreaseCostRequest(line.ItemId, 10m))
                    .ToList();
                await service.ReconcileAsync(
                    updated.Value.Id,
                    new InventoryCountReconcileRequest(updated.Value.RowVersion, costs),
                    cancellationToken);
            }
            catch (Exception)
            {
                // Best effort.
            }
        }
    }
}
