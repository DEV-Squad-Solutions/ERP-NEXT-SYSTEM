using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Microsoft.EntityFrameworkCore;
using MiniErp.Application.Common.Abstractions;
using MiniErp.Application.Common.Results;
using MiniErp.Application.Features.InvoicePriceChanges;
using MiniErp.Application.Features.Invoices;
using MiniErp.Domain.Enums;
using MiniErp.Infrastructure.Services.InvoicePriceChanges;

namespace MiniErp.Tests.Invoices;

public sealed partial class InvoiceServiceTests
{
    private static readonly DateOnly PcFrom = new(2026, 7, 10);
    private static readonly DateOnly PcTo = new(2026, 7, 20);

    private sealed class FailOnNthUpdate(IInvoiceService inner, int failOn) : IInvoiceService
    {
        private int calls;

        public Task<Result<InvoiceResponse>> AddAsync(InvoiceRequest request, CancellationToken cancellationToken = default) =>
            inner.AddAsync(request, cancellationToken);

        public Task<Result<InvoiceResponse>> UpdateAsync(int id, InvoiceUpdateRequest request, CancellationToken cancellationToken = default) =>
            ++calls == failOn
                ? Task.FromResult(Result<InvoiceResponse>.Failure(Error.Failure("Tests.Boom", "boom")))
                : inner.UpdateAsync(id, request, cancellationToken);

        public Task<Result> DeleteAsync(int id, byte[]? rowVersion, CancellationToken cancellationToken = default) =>
            inner.DeleteAsync(id, rowVersion, cancellationToken);
    }

    private static async Task<InvoicePriceChangeService> CreatePriceChangeServiceAsync(
        InvoiceTestDatabase database,
        IFiscalYearPeriodGuard? guard = null,
        int failOnUpdate = 0)
    {
        await database.Context.Database.ExecuteSqlRawAsync(
            """
            CREATE TABLE IF NOT EXISTS AuditLogs (
                Id INTEGER PRIMARY KEY AUTOINCREMENT, CompanyId INTEGER NOT NULL, OccurredOn TEXT NOT NULL,
                UserId TEXT NOT NULL, UserName TEXT NOT NULL, Role TEXT NOT NULL, Action TEXT NOT NULL,
                EntityType TEXT NOT NULL, EntityId TEXT NOT NULL, Summary TEXT NOT NULL,
                Details TEXT NULL, ClientIp TEXT NULL, IsPermanent INTEGER NOT NULL);
            """);
        IInvoiceService invoices = database.CreateService();
        if (failOnUpdate > 0) invoices = new FailOnNthUpdate(invoices, failOnUpdate);
        return new InvoicePriceChangeService(
            database.Context,
            new TestCurrentCompanyContext(1),
            invoices,
            database.CreateQueryService(),
            new HttpContextAccessor(),
            TimeProvider.System,
            guard);
    }

    private static async Task<InvoiceResponse> AddPurchaseAsync(
        InvoiceTestDatabase database,
        DateOnly date,
        PaymentTerm term,
        params InvoiceLineRequest[] lines)
    {
        var result = await database.CreateService().AddAsync(
            CreateRequest(InvoiceType.Purchase, term, lines, invoiceDate: date));
        Assert.True(result.IsSuccess, result.IsFailure ? result.Error.Description : "");
        return result.Value;
    }

    private static InvoicePriceChangePreviewRequest PcPreview(
        bool includePosted = false,
        params (int Item, decimal Price)[] items) =>
        new(
            (items.Length == 0 ? [(1, 25m)] : items)
                .Select(i => new InvoicePriceChangeItem(i.Item, i.Price)).ToArray(),
            PcFrom, PcTo, CurrencyCode.EGP, null, includePosted);

    private static InvoicePriceChangeApplyRequest PcApply(
        InvoicePriceChangePreviewRequest p, int expected, bool confirm = false) =>
        new(p.Items, p.FromDate, p.ToDate, p.Currency, expected, p.InvoiceType, p.IncludePosted, confirm);

    [Fact]
    public async Task PriceChange_PreviewChangesNothingAndDateBoundsAreInclusive()
    {
        await using var db = await InvoiceTestDatabase.CreateAsync();
        var onFrom = await AddPurchaseAsync(db, PcFrom, PaymentTerm.Credit, new InvoiceLineRequest(1, 1, 2m, 10m, null));
        var onTo = await AddPurchaseAsync(db, PcTo, PaymentTerm.Credit, new InvoiceLineRequest(1, 1, 2m, 10m, null));
        var before = await AddPurchaseAsync(db, PcFrom.AddDays(-1), PaymentTerm.Credit, new InvoiceLineRequest(1, 1, 2m, 10m, null));
        var after = await AddPurchaseAsync(db, PcTo.AddDays(1), PaymentTerm.Credit, new InvoiceLineRequest(1, 1, 2m, 10m, null));
        var service = await CreatePriceChangeServiceAsync(db);

        var preview = await service.PreviewAsync(PcPreview());

        Assert.True(preview.IsSuccess);
        Assert.Equal(2, preview.Value.InvoicesEligible);
        Assert.Equal(2, preview.Value.LinesEligible);
        Assert.Equal(60m, preview.Value.TotalDelta); // (25-10)*2 per invoice, two invoices
        Assert.Equal(2, preview.Value.Items.Single().InvoicesAffected);
        Assert.Equal(60m, preview.Value.Items.Single().TotalDelta);
        Assert.Equal([onFrom.Id, onTo.Id], preview.Value.Invoices.Select(i => i.InvoiceId).ToArray());
        db.Context.ChangeTracker.Clear();
        Assert.All(await db.Context.InvoiceLines.ToListAsync(), l => Assert.Equal(10m, l.Price));
        Assert.Equal(0, await db.Context.AuditLogs.CountAsync());
        Assert.DoesNotContain(before.Id, preview.Value.Invoices.Select(i => i.InvoiceId));
        Assert.DoesNotContain(after.Id, preview.Value.Invoices.Select(i => i.InvoiceId));
    }

    [Fact]
    public async Task PriceChange_ApplyMultiItemRecalculatesTotalsRoundsMoneyAndAudits()
    {
        await using var db = await InvoiceTestDatabase.CreateAsync();
        var invoice = await AddPurchaseAsync(db, PcFrom.AddDays(2), PaymentTerm.Credit,
            new InvoiceLineRequest(1, 1, 1.333333m, 10m, null),
            new InvoiceLineRequest(2, 1, 4m, 5m, null));
        var service = await CreatePriceChangeServiceAsync(db);
        var request = PcPreview(false, (1, 3.33m), (2, 7.77m));
        var preview = await service.PreviewAsync(request);
        Assert.Equal(1, preview.Value.InvoicesEligible);
        Assert.Equal(2, preview.Value.Items.Count);

        var applied = await service.ApplyAsync(PcApply(request, 1));

        Assert.True(applied.IsSuccess, applied.IsFailure ? applied.Error.Description : "");
        db.Context.ChangeTracker.Clear();
        var saved = await db.Context.Invoices.Include(i => i.Lines).SingleAsync(i => i.Id == invoice.Id);
        var line1 = saved.Lines.Single(l => l.ItemId == 1);
        var line2 = saved.Lines.Single(l => l.ItemId == 2);
        Assert.Equal(3.33m, line1.Price);
        Assert.Equal(7.77m, line2.Price);
        Assert.Equal(decimal.Round(1.333333m * 3.33m, 2, MidpointRounding.AwayFromZero), line1.Total);
        Assert.Equal(31.08m, line2.Total);
        Assert.Equal(line1.Total + line2.Total, saved.Total);
        Assert.Equal(saved.Total, preview.Value.Invoices.Single().NewTotal);
        var audit = await db.Context.AuditLogs.SingleAsync(a => a.Action == "PriceChange");
        Assert.Equal("system", audit.UserId);
        Assert.Equal(invoice.Id.ToString(), audit.EntityId);
        Assert.Contains("\"oldPrice\":10", audit.Details);
        Assert.Contains("\"includePosted\":false", audit.Details);
    }

    [Fact]
    public async Task PriceChange_RejectsDuplicateItemsAndBadInput()
    {
        await using var db = await InvoiceTestDatabase.CreateAsync();
        var service = await CreatePriceChangeServiceAsync(db);

        var duplicate = await service.PreviewAsync(PcPreview(false, (1, 5m), (1, 6m)));
        Assert.Equal("InvoicePriceChange.DuplicateItem", duplicate.Error.Code);
        Assert.False((await service.PreviewAsync(PcPreview(false, (1, 0m)))).IsSuccess);
        Assert.False((await service.PreviewAsync(PcPreview(false, (1, 5.005m)))).IsSuccess);
        Assert.False((await service.PreviewAsync(PcPreview(false, (99, 5m)))).IsSuccess);
        Assert.False((await service.PreviewAsync(PcPreview() with { Items = [] })).IsSuccess);
        Assert.False((await service.PreviewAsync(PcPreview() with { FromDate = PcTo, ToDate = PcFrom })).IsSuccess);
        Assert.False((await service.PreviewAsync(PcPreview() with { InvoiceType = InvoiceType.SalesReturn })).IsSuccess);
    }

    [Fact]
    public async Task PriceChange_ApplyRollsBackEveryInvoiceWhenOneFails()
    {
        await using var db = await InvoiceTestDatabase.CreateAsync();
        var a = await AddPurchaseAsync(db, PcFrom, PaymentTerm.Credit, new InvoiceLineRequest(1, 1, 2m, 10m, null));
        var b = await AddPurchaseAsync(db, PcFrom.AddDays(1), PaymentTerm.Credit, new InvoiceLineRequest(1, 1, 2m, 10m, null));
        var c = await AddPurchaseAsync(db, PcFrom.AddDays(2), PaymentTerm.Credit, new InvoiceLineRequest(1, 1, 2m, 10m, null));
        var service = await CreatePriceChangeServiceAsync(db, failOnUpdate: 3);
        var request = PcPreview();

        var applied = await service.ApplyAsync(PcApply(request, 3));

        Assert.True(applied.IsFailure);
        Assert.Equal("InvoicePriceChange.InvoiceFailed", applied.Error.Code);
        db.Context.ChangeTracker.Clear();
        foreach (var id in new[] { a.Id, b.Id, c.Id })
        {
            var saved = await db.Context.Invoices.Include(i => i.Lines).SingleAsync(i => i.Id == id);
            Assert.All(saved.Lines, l => Assert.Equal(10m, l.Price));
            Assert.Equal(20m, saved.Total);
        }
    }

    [Fact]
    public async Task PriceChange_PaidInvoicesAreSkippedByDefaultAndCountedInPreview()
    {
        await using var db = await InvoiceTestDatabase.CreateAsync();
        var credit = await AddPurchaseAsync(db, PcFrom, PaymentTerm.Credit, new InvoiceLineRequest(1, 1, 2m, 10m, null));
        var cash = await AddPurchaseAsync(db, PcFrom.AddDays(1), PaymentTerm.Cash, new InvoiceLineRequest(1, 1, 2m, 10m, null));
        var service = await CreatePriceChangeServiceAsync(db);

        var preview = await service.PreviewAsync(PcPreview());
        Assert.Equal(1, preview.Value.InvoicesEligible);
        Assert.Equal(1, preview.Value.PaidInvoicesNotIncluded);
        Assert.Equal(0, preview.Value.PaidInvoicesAffected);
        var skipped = Assert.Single(preview.Value.Skipped);
        Assert.Equal(cash.Id, skipped.InvoiceId);
        Assert.Equal(InvoicePriceChangeSkipReason.HasPayments, skipped.Reason);

        var applied = await service.ApplyAsync(PcApply(PcPreview(), 1));
        Assert.True(applied.IsSuccess);
        db.Context.ChangeTracker.Clear();
        Assert.Equal(25m, (await db.Context.InvoiceLines.SingleAsync(l => l.InvoiceId == credit.Id)).Price);
        Assert.Equal(10m, (await db.Context.InvoiceLines.SingleAsync(l => l.InvoiceId == cash.Id)).Price);
    }

    [Fact]
    public async Task PriceChange_IncludePostedNeedsConfirmationThenUpdatesPaymentAndAudit()
    {
        await using var db = await InvoiceTestDatabase.CreateAsync();
        var cash = await AddPurchaseAsync(db, PcFrom, PaymentTerm.Cash, new InvoiceLineRequest(1, 1, 2m, 10m, null));
        var service = await CreatePriceChangeServiceAsync(db);
        var request = PcPreview(includePosted: true);

        var preview = await service.PreviewAsync(request);
        Assert.Equal(1, preview.Value.PaidInvoicesAffected);
        Assert.Equal(30m, preview.Value.PaidInvoicesTotalDelta);
        Assert.Equal(30m, preview.Value.CashboxAmountChange);

        var unconfirmed = await service.ApplyAsync(PcApply(request, 1, confirm: false));
        Assert.Equal("InvoicePriceChange.ConfirmationRequired", unconfirmed.Error.Code);
        db.Context.ChangeTracker.Clear();
        Assert.Equal(10m, (await db.Context.InvoiceLines.SingleAsync()).Price);

        var applied = await service.ApplyAsync(PcApply(request, 1, confirm: true));
        Assert.True(applied.IsSuccess, applied.IsFailure ? applied.Error.Description : "");
        Assert.Equal(1, applied.Value.PaidInvoicesChanged);
        db.Context.ChangeTracker.Clear();
        var saved = await db.Context.Invoices.SingleAsync(i => i.Id == cash.Id);
        Assert.Equal(50m, saved.Total);
        Assert.Equal(50m, saved.PaidAmount);
        Assert.Equal(50m, (await db.Context.CashVouchers.SingleAsync()).Amount);
        var audit = await db.Context.AuditLogs.SingleAsync(a => a.Action == "PriceChange");
        Assert.Contains("\"includePosted\":true", audit.Details);
        Assert.Contains("\"invoiceHadPayments\":true", audit.Details);
    }

    [Fact]
    public async Task PriceChange_ApplyRefusesWhenEligibleCountChangedSincePreview()
    {
        await using var db = await InvoiceTestDatabase.CreateAsync();
        await AddPurchaseAsync(db, PcFrom, PaymentTerm.Credit, new InvoiceLineRequest(1, 1, 2m, 10m, null));
        var service = await CreatePriceChangeServiceAsync(db);

        var applied = await service.ApplyAsync(PcApply(PcPreview(), 5));

        Assert.Equal("InvoicePriceChange.PreviewChanged", applied.Error.Code);
        db.Context.ChangeTracker.Clear();
        Assert.Equal(10m, (await db.Context.InvoiceLines.SingleAsync()).Price);
    }

    [Fact]
    public async Task PriceChange_ClosedPeriodInvoicesAreSkippedAndReported()
    {
        await using var db = await InvoiceTestDatabase.CreateAsync();
        var open = await AddPurchaseAsync(db, PcFrom, PaymentTerm.Credit, new InvoiceLineRequest(1, 1, 2m, 10m, null));
        var closed = await AddPurchaseAsync(db, PcFrom.AddDays(3), PaymentTerm.Credit, new InvoiceLineRequest(1, 1, 2m, 10m, null));
        var service = await CreatePriceChangeServiceAsync(db, new RejectingFiscalYearGuard(closed.InvoiceDate));

        var preview = await service.PreviewAsync(PcPreview());

        Assert.Equal([open.Id], preview.Value.Invoices.Select(i => i.InvoiceId).ToArray());
        var skipped = Assert.Single(preview.Value.Skipped);
        Assert.Equal(closed.Id, skipped.InvoiceId);
        Assert.Equal(InvoicePriceChangeSkipReason.ClosedPeriod, skipped.Reason);
    }

    [Fact]
    public void PriceChange_EndpointsAreAdminOnly()
    {
        var controller = typeof(MiniErp.Api.Controllers.InvoicePriceChangesController);
        var attribute = Assert.Single(
            controller.GetCustomAttributes(typeof(AuthorizeAttribute), inherit: false)
                .Cast<AuthorizeAttribute>());
        Assert.Equal("Admin", attribute.Roles);
        Assert.Empty(controller.GetMethods()
            .SelectMany(m => m.GetCustomAttributes(typeof(AllowAnonymousAttribute), false)));
    }

    [Fact]
    public async Task PriceChange_SalesInvoiceKeepsStockAndCostAndOnlyMovesRevenue()
    {
        await using var db = await InvoiceTestDatabase.CreateAsync();
        await AddPurchaseAsync(db, PcFrom.AddDays(-5), PaymentTerm.Credit, new InvoiceLineRequest(1, 1, 10m, 4m, null));
        var sale = await db.CreateService().AddAsync(CreateRequest(
            InvoiceType.Sales, PaymentTerm.Credit, [new InvoiceLineRequest(1, 1, 3m, 9m, null)],
            invoiceDate: PcFrom.AddDays(1)));
        Assert.True(sale.IsSuccess, sale.IsFailure ? sale.Error.Description : "");
        db.Context.ChangeTracker.Clear();
        var movementBefore = await db.Context.ItemMovements
            .Where(m => m.MovementType == ItemMovementType.Sales)
            .Select(m => new { m.QuantityOut, m.UnitCost, m.TotalCost })
            .SingleAsync();
        var service = await CreatePriceChangeServiceAsync(db);
        var request = PcPreview(false, (1, 12.5m)) with { InvoiceType = InvoiceType.Sales };

        var preview = await service.PreviewAsync(request);
        Assert.Equal([sale.Value.Id], preview.Value.Invoices.Select(i => i.InvoiceId).ToArray());
        var applied = await service.ApplyAsync(PcApply(request, 1));

        Assert.True(applied.IsSuccess, applied.IsFailure ? applied.Error.Description : "");
        db.Context.ChangeTracker.Clear();
        var saved = await db.Context.Invoices.SingleAsync(i => i.Id == sale.Value.Id);
        Assert.Equal(37.5m, saved.Total);
        var movementAfter = await db.Context.ItemMovements
            .Where(m => m.MovementType == ItemMovementType.Sales)
            .Select(m => new { m.QuantityOut, m.UnitCost, m.TotalCost })
            .SingleAsync();
        Assert.Equal(movementBefore, movementAfter);
    }

    [Theory]
    [InlineData("Admin", true)]
    [InlineData("User", false)]
    [InlineData("Accountant", false)]
    [InlineData("Cashier", false)]
    public async Task PriceChange_AuthorizeAttributesAllowOnlyAdminRole(string role, bool allowed)
    {
        var services = new ServiceCollection().AddLogging().AddAuthorization().BuildServiceProvider();
        var attributes = typeof(MiniErp.Api.Controllers.InvoicePriceChangesController)
            .GetCustomAttributes(typeof(IAuthorizeData), inherit: true)
            .Cast<IAuthorizeData>().ToArray();
        Assert.True(attributes.Length >= 2); // base "any role" plus Admin-only
        var policy = await AuthorizationPolicy.CombineAsync(
            services.GetRequiredService<IAuthorizationPolicyProvider>(), attributes);
        var user = new ClaimsPrincipal(new ClaimsIdentity(
            [new Claim(ClaimTypes.Name, "t"), new Claim(ClaimTypes.Role, role)], "test"));

        var result = await services.GetRequiredService<IAuthorizationService>()
            .AuthorizeAsync(user, null, policy!.Requirements);
        var anonymous = await services.GetRequiredService<IAuthorizationService>()
            .AuthorizeAsync(new ClaimsPrincipal(new ClaimsIdentity()), null, policy.Requirements);

        Assert.Equal(allowed, result.Succeeded);
        Assert.False(anonymous.Succeeded);
    }
}
