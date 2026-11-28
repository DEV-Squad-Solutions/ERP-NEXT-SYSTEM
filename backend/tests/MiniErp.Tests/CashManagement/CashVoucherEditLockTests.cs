using Microsoft.EntityFrameworkCore;
using MiniErp.Application.Common.Mappings;
using MiniErp.Application.Common.Results;
using MiniErp.Application.Features.CashVouchers;
using MiniErp.Domain.Enums;
using MiniErp.Infrastructure;

namespace MiniErp.Tests.CashManagement;

public sealed class CashVoucherEditLockTests
{
    static CashVoucherEditLockTests() => MappingConfiguration.Register(
        typeof(InfrastructureAssemblyMarker).Assembly);

    // Rule since 95c392c: a posted standalone voucher may be edited (the controller limits
    // this to Admin and Accountant). The ledger must stay consistent after the edit.
    [Fact]
    public async Task PostedVoucherEditIsAllowedAndJournalStaysSingleAndBalanced()
    {
        await using var database = await CashManagementTestDatabase.CreateAsync();
        var service = database.CreatePostingVoucherService(1);
        var draft = (await service.AddAsync(Draft())).Value;
        var posted = await service.UpdateAsync(draft.Id, Complete(draft));
        Assert.True(posted.IsSuccess, posted.Error.Description);
        var before = (await service.GetByIdAsync(draft.Id)).Value;

        var result = await service.UpdateAsync(draft.Id, Complete(before) with { Amount = 25m });

        Assert.True(result.IsSuccess, result.Error.Description);
        var after = (await service.GetByIdAsync(draft.Id)).Value;
        Assert.Equal(25m, after.Amount);
        Assert.False(after.IsDraft);
        Assert.NotEqual(before.RowVersion, after.RowVersion);
        var entries = await database.Context.JournalEntries.AsNoTracking()
            .Where(entry => entry.SourceType == JournalEntrySourceType.CashVoucher &&
                entry.SourceId == draft.Id)
            .Select(entry => entry.Id).ToListAsync();
        Assert.Single(entries);
        var lines = await database.Context.JournalEntryLines.AsNoTracking()
            .Where(line => line.JournalEntryId == entries[0])
            .Select(line => new { line.Debit, line.Credit }).ToListAsync();
        Assert.Equal(lines.Sum(l => l.Debit), lines.Sum(l => l.Credit));
        Assert.Equal(25m, lines.Sum(l => l.Debit));
    }

    // Rule since 95c392c: a standalone voucher may be soft-deleted, even after posting.
    // Deleting a posted voucher must also remove its journal entry.
    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task StandaloneVoucherDeleteIsSoftAndRemovesItsJournal(bool posted)
    {
        await using var database = await CashManagementTestDatabase.CreateAsync();
        var service = database.CreatePostingVoucherService(1);
        var voucher = (await service.AddAsync(Draft())).Value;
        if (posted)
            voucher = (await service.UpdateAsync(voucher.Id, Complete(voucher))).Value;
        Assert.Equal(posted ? 1 : 0, await database.Context.JournalEntries.CountAsync(
            entry => entry.SourceType == JournalEntrySourceType.CashVoucher));

        var result = await service.DeleteAsync(voucher.Id);

        Assert.True(result.IsSuccess, result.Error.Description);
        Assert.True((await service.GetByIdAsync(voucher.Id)).IsFailure);
        Assert.Equal(0, await database.Context.JournalEntries.CountAsync(
            entry => entry.SourceType == JournalEntrySourceType.CashVoucher &&
                entry.SourceId == voucher.Id));
        var row = await database.Context.CashVouchers.IgnoreQueryFilters().AsNoTracking()
            .SingleAsync(v => v.Id == voucher.Id);
        Assert.True(row.IsDeleted);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task SessionPostingFirstBlocksStaleDraftSaveAndCompletion(bool saveDraft)
    {
        await using var database = await CashManagementTestDatabase.CreateAsync();
        var service = database.CreatePostingVoucherService(1);
        var draft = (await service.AddAsync(Draft())).Value;
        // Retain the draft in the original scoped context while another request posts it.
        await using (var otherContext = database.CreateAdditionalContext())
        {
            var other = database.CreatePostingVoucherService(1, context: otherContext);
            var winner = await other.UpdateAsync(draft.Id, Complete(draft));
            Assert.True(winner.IsSuccess, winner.Error.Description);
        }

        var rejected = saveDraft
            ? await service.UpdateDraftAsync(draft.Id, DraftUpdate(draft) with { Amount = 99m })
            : await service.UpdateAsync(draft.Id, Complete(draft) with { Amount = 99m });

        // The draft endpoint never touches a posted voucher. The full edit is allowed on posted
        // vouchers now, so only the stale row version protects the winner.
        Assert.True(rejected.IsFailure);
        Assert.Equal(saveDraft ? "CashVouchers.PostedReadOnly" : "CashVouchers.Concurrency",
            rejected.Error.Code);
        var stored = (await service.GetByIdAsync(draft.Id)).Value;
        Assert.Equal(10m, stored.Amount);
        Assert.False(stored.IsDraft);
        Assert.Single(await database.Context.JournalEntries.AsNoTracking()
            .Where(entry => entry.SourceType == JournalEntrySourceType.CashVoucher &&
                entry.SourceId == draft.Id).ToListAsync());
    }

    [Fact]
    public async Task DraftSaveFirstRejectsOldCompletionThenLatestVersionPostsOnlyOnce()
    {
        await using var database = await CashManagementTestDatabase.CreateAsync();
        var service = database.CreatePostingVoucherService(1);
        var draft = (await service.AddAsync(Draft())).Value;
        var saved = await service.UpdateDraftAsync(draft.Id, DraftUpdate(draft) with { Amount = 25m });
        Assert.True(saved.IsSuccess, saved.Error.Description);
        var stale = await service.UpdateAsync(draft.Id, Complete(draft));
        Assert.Equal("CashVouchers.Concurrency", stale.Error.Code);
        Assert.Empty(await database.Context.JournalEntries.AsNoTracking()
            .Where(entry => entry.SourceType == JournalEntrySourceType.CashVoucher).ToListAsync());
        var completed = await service.UpdateAsync(draft.Id, Complete(saved.Value));
        Assert.True(completed.IsSuccess, completed.Error.Description);
        var retry = await service.UpdateAsync(draft.Id, Complete(saved.Value));
        Assert.Equal("CashVouchers.Concurrency", retry.Error.Code);
        Assert.Equal(25m, (await service.GetByIdAsync(draft.Id)).Value.Amount);
        Assert.Single(await database.Context.JournalEntries.AsNoTracking()
            .Where(entry => entry.SourceType == JournalEntrySourceType.CashVoucher).ToListAsync());
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task BulkEditOrDeleteOfPostedVoucherSucceedsAndKeepsLedgerConsistent(bool delete)
    {
        await using var database = await CashManagementTestDatabase.CreateAsync();
        var service = database.CreatePostingVoucherService(1);
        var first = (await service.AddAsync(Draft())).Value;
        var other = (await service.AddAsync(Draft())).Value;
        var posted = await service.UpdateAsync(other.Id, Complete(other));
        Assert.True(posted.IsSuccess, posted.Error.Description);
        other = (await service.GetByIdAsync(other.Id)).Value;

        var result = await service.BulkAsync(new CashVoucherBulkRequest(Items:
        [
            new CashVoucherBulkUpdateItemRequest(Id: first.Id, RowVersion: first.RowVersion,
                Voucher: BulkVoucher(accountId: 1)),
            delete
                ? new CashVoucherBulkDeleteItemRequest(Id: other.Id, RowVersion: other.RowVersion)
                : new CashVoucherBulkUpdateItemRequest(Id: other.Id, RowVersion: other.RowVersion,
                    Voucher: BulkVoucher(accountId: 1) with { Amount = 99m })
        ]));

        Assert.True(result.IsSuccess, result.Error.Description);
        Assert.False((await service.GetByIdAsync(first.Id)).Value.IsDraft);
        if (delete)
            Assert.True((await service.GetByIdAsync(other.Id)).IsFailure);
        else
            Assert.Equal(99m, (await service.GetByIdAsync(other.Id)).Value.Amount);
        // first completed (1 entry) + the other voucher's entry unless it was deleted.
        Assert.Equal(delete ? 1 : 2, await database.Context.JournalEntries.CountAsync(
            entry => entry.SourceType == JournalEntrySourceType.CashVoucher));
    }

    [Fact]
    public async Task BulkMissingTargetCreatesOperationalDraftAndCompletionRequiresTarget()
    {
        await using var database = await CashManagementTestDatabase.CreateAsync();
        var service = database.CreatePostingVoucherService(1);
        var created = await service.BulkAsync(new CashVoucherBulkRequest(Items:
        [new CashVoucherBulkAddItemRequest(Voucher: BulkVoucher(accountId: null))]));
        Assert.True(created.IsSuccess, created.Error.Description);
        var draft = Assert.Single(created.Value.Items).Voucher!;
        Assert.True(draft.IsDraft);
        Assert.Null(draft.AccountId);
        Assert.Null(draft.CashMovementTypeId);
        Assert.Equal(10m, draft.BaseAmount);
        Assert.Equal(0m, (await database.Context.CashVouchers.AsNoTracking()
            .SingleAsync(voucher => voucher.Id == draft.Id)).BaseAmount);
        Assert.Empty(await database.Context.JournalEntries.AsNoTracking()
            .Where(entry => entry.SourceType == JournalEntrySourceType.CashVoucher).ToListAsync());

        var failed = await service.BulkAsync(new CashVoucherBulkRequest(Items:
        [new CashVoucherBulkUpdateItemRequest(Id: draft.Id, RowVersion: draft.RowVersion,
            Voucher: BulkVoucher(accountId: null))]));
        Assert.Equal("CashVouchers.PartySelectionMustBeExclusive", failed.Error.Code);
        Assert.True((await service.GetByIdAsync(draft.Id)).Value.IsDraft);

        var completed = await service.BulkAsync(new CashVoucherBulkRequest(Items:
        [new CashVoucherBulkUpdateItemRequest(Id: draft.Id, RowVersion: draft.RowVersion,
            Voucher: BulkVoucher(accountId: 1))]));
        Assert.True(completed.IsSuccess, completed.Error.Description);
        Assert.False(Assert.Single(completed.Value.Items).Voucher!.IsDraft);
        var retry = await service.BulkAsync(new CashVoucherBulkRequest(Items:
        [new CashVoucherBulkUpdateItemRequest(Id: draft.Id, RowVersion: draft.RowVersion,
            Voucher: BulkVoucher(accountId: 1))]));
        Assert.Equal("CashVouchers.Concurrency", retry.Error.Code);
    }

    [Fact]
    public async Task BulkDeleteOfDraftIsAllowedTogetherWithAnAdd()
    {
        await using var database = await CashManagementTestDatabase.CreateAsync();
        var service = database.CreateVoucherService(1);
        var draft = (await service.AddAsync(Draft())).Value;
        var result = await service.BulkAsync(new CashVoucherBulkRequest(Items:
        [
            new CashVoucherBulkAddItemRequest(Voucher: BulkVoucher(accountId: 1)),
            new CashVoucherBulkDeleteItemRequest(Id: draft.Id, RowVersion: draft.RowVersion)
        ]));
        Assert.True(result.IsSuccess, result.Error.Description);
        // The new voucher stays; the deleted draft is gone.
        var remaining = Assert.Single(await database.Context.CashVouchers.AsNoTracking().ToListAsync());
        Assert.NotEqual(draft.Id, remaining.Id);
        Assert.True((await service.GetByIdAsync(draft.Id)).IsFailure);
    }

    [Fact]
    public async Task BulkTargetlessAddKeepsOperationalReferenceAndManualForeignRate()
    {
        await using var database = await CashManagementTestDatabase.CreateAsync();
        var service = database.CreatePostingVoucherService(1);
        var created = await service.BulkAsync(new CashVoucherBulkRequest(Items:
        [new CashVoucherBulkAddItemRequest(Voucher: BulkVoucher(accountId: null) with
        {
            CashboxId = 5, Amount = 20m, ExchangeRate = 51m,
            ReferenceNumber = " BULK-REF ", Notes = " awaiting description "
        })]));
        Assert.True(created.IsSuccess, created.Error.Description);
        var draft = Assert.Single(created.Value.Items).Voucher!;
        Assert.True(draft.IsDraft);
        Assert.Equal(CurrencyCode.USD, draft.Currency);
        Assert.Equal(51m, draft.ExchangeRate);
        Assert.Equal(1_020m, draft.BaseAmount);
        Assert.Equal("BULK-REF", draft.ReferenceNumber);
        Assert.Equal("awaiting description", draft.Notes);
        Assert.Empty(await database.Context.JournalEntries.AsNoTracking()
            .Where(entry => entry.SourceType == JournalEntrySourceType.CashVoucher).ToListAsync());
    }

    [Theory]
    [InlineData("trip")]
    [InlineData("employee")]
    [InlineData("partnerRate")]
    [InlineData("movement")]
    public async Task BulkTargetlessAddRejectsInvalidPostingFields(string field)
    {
        await using var database = await CashManagementTestDatabase.CreateAsync();
        var service = database.CreateVoucherService(1);
        var voucher = BulkVoucher(accountId: null);
        voucher = field switch
        {
            "trip" => voucher with { DriverTripId = 1 },
            "employee" => voucher with { EmployeeMovementType = EmployeeMovementType.Credit },
            "partnerRate" => voucher with { PartnerExchangeRate = 50m },
            _ => voucher with { CashMovementTypeId = 9999 }
        };
        var result = await service.BulkAsync(new CashVoucherBulkRequest(Items:
        [new CashVoucherBulkAddItemRequest(Voucher: voucher)]));
        Assert.True(result.IsFailure);
        Assert.StartsWith("Items[0]", result.Error.FieldName);
        Assert.Empty(await database.Context.CashVouchers.AsNoTracking().ToListAsync());
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task BulkUsesLatestDraftVersionAndRollsBackEarlierAdd(bool postedByOtherSession)
    {
        await using var database = await CashManagementTestDatabase.CreateAsync();
        var service = database.CreatePostingVoucherService(1);
        var draft = (await service.AddAsync(Draft())).Value;
        await using (var otherContext = database.CreateAdditionalContext())
        {
            var other = database.CreatePostingVoucherService(1, context: otherContext);
            var winner = postedByOtherSession
                ? await other.UpdateAsync(draft.Id, Complete(draft) with { Amount = 25m })
                : await other.UpdateDraftAsync(draft.Id, DraftUpdate(draft) with { Amount = 25m });
            Assert.True(winner.IsSuccess, winner.Error.Description);
        }
        var result = await service.BulkAsync(new CashVoucherBulkRequest(Items:
        [
            new CashVoucherBulkAddItemRequest(Voucher: BulkVoucher(accountId: 1)),
            new CashVoucherBulkUpdateItemRequest(Id: draft.Id, RowVersion: draft.RowVersion,
                Voucher: BulkVoucher(accountId: 1) with { Amount = 99m })
        ]));
        // Either way the stale row version is rejected (a posted voucher is editable, but not blindly).
        Assert.Equal("CashVouchers.Concurrency", result.Error.Code);
        Assert.Equal("Items[1]", result.Error.FieldName);
        var stored = Assert.Single(await database.Context.CashVouchers.AsNoTracking().ToListAsync());
        Assert.Equal(25m, stored.Amount);
        Assert.Equal(postedByOtherSession, stored.IsPosted);
        Assert.Equal(postedByOtherSession ? 1 : 0, await database.Context.JournalEntries.CountAsync(
            entry => entry.SourceType == JournalEntrySourceType.CashVoucher));
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task ClosedVoucherYearRejectsSingleAndBulkCompletion(bool useBulk)
    {
        await using var database = await CashManagementTestDatabase.CreateAsync();
        var service = database.CreatePostingVoucherService(1);
        var draft = (await service.AddAsync(Draft())).Value;
        await database.Context.Database.ExecuteSqlRawAsync("UPDATE FiscalYears SET Status = 2 WHERE Id = 1");
        var errors = useBulk
            ? (await service.BulkAsync(new CashVoucherBulkRequest(Items:
                [new CashVoucherBulkUpdateItemRequest(Id: draft.Id, RowVersion: draft.RowVersion,
                    Voucher: BulkVoucher(accountId: 1))]))).Errors
            : (await service.UpdateAsync(draft.Id, Complete(draft))).Errors;
        Assert.Equal("FiscalYears.Closed", Assert.Single(errors).Code);
        Assert.True((await service.GetByIdAsync(draft.Id)).Value.IsDraft);
        Assert.Empty(await database.Context.JournalEntries.AsNoTracking().Where(entry =>
            entry.SourceType == JournalEntrySourceType.CashVoucher).ToListAsync());
    }

    private static CashVoucherRequest Draft() => new(
        VoucherDate: new DateOnly(2026, 8, 1), Direction: CashDirection.Receipt,
        CashboxId: 1, Amount: 10m, Description: "operational");

    private static CashVoucherDraftUpdateRequest DraftUpdate(CashVoucherResponse voucher) => new(
        VoucherDate: voucher.VoucherDate, Direction: voucher.Direction,
        CashboxId: voucher.CashboxId!.Value, Amount: voucher.Amount,
        RowVersion: voucher.RowVersion, Description: voucher.Description);

    private static CashVoucherUpdateRequest Complete(CashVoucherResponse voucher) => new(
        VoucherDate: voucher.VoucherDate, Direction: voucher.Direction,
        CashboxId: voucher.CashboxId, CashMovementTypeId: null,
        EmployeeId: null, BusinessPartnerId: null, DriverId: null, DriverTripId: null,
        ExternalPartyName: null, Amount: voucher.Amount, ReferenceNumber: null,
        Description: voucher.Description, Notes: null, RowVersion: voucher.RowVersion,
        AccountId: 1);

    private static CashVoucherBulkVoucherRequest BulkVoucher(int? accountId) => new(
        VoucherDate: new DateOnly(2026, 8, 1), Direction: CashDirection.Receipt,
        CashboxId: 1, CashMovementTypeId: null, EmployeeId: null,
        BusinessPartnerId: null, DriverId: null, DriverTripId: null,
        ExternalPartyName: null, Amount: 10m, ReferenceNumber: null,
        Description: "operational", Notes: null, ExchangeRate: null, AccountId: accountId);
}
