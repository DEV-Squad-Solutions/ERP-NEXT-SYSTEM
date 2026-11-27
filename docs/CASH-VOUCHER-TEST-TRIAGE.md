# CashVoucher test triage (decision pending)

31 CashVoucher-area tests fail on main. They were written for the rule "a posted voucher is read-only and cannot be deleted". Commit 95c392c (Nov 17) changed the code so Admin and Accountant can edit and soft-delete after posting. Nothing here changes code or tests: it lists what each failing test expects and what the code returns now, so the decision is quick.

## Decision needed

A. Keep the new rule (code stays). Then each test below must be rewritten to assert the new behavior (posted edit allowed, linked cash and partner movements and the journal entry stay consistent, delete reverses the entry). These assertions are financial, so they should be written with Ahmed or the accountant, not guessed from the code.

B. Restore the old rule. Then the guard goes back into `UpdateAsync` and `DeleteAsync` and these tests pass unchanged.

## Group 1: expect read-only or delete-not-allowed, code now allows it (about 24)

Expected error code (code now succeeds, so the test fails at the assertion):

- `StandaloneDriverTripServiceTests.PostedVouchersProtectTripIdentityAndDeletionWhileCostRemainsEditable` expects "CashVouchers.DeleteNotAllowed"
- `CrossCurrencyPartnerVoucherTests.RateCascadeFreezesPostedSnapshotsAndJournalButUpdatesLinkedDraft` expects "CashVouchers.PostedReadOnly"
- `CrossCurrencyPartnerVoucherTests.MissingPartnerRateFailsAtomicallyAndPostedTargetCannotChange` expects "CashVouchers.PostedReadOnly"
- `CashVoucherEditLockTests.BulkLockedUpdateOrDeleteRollsBackEarlierCompletion(delete: False)` expects "CashVouchers.PostedReadOnly"
- `CashVoucherEditLockTests.BulkLockedUpdateOrDeleteRollsBackEarlierCompletion(delete: True)` expects "CashVouchers.DeleteNotAllowed"
- `CashVoucherEditLockTests.StandaloneVoucherCannotBeDeletedInEitherState(posted: False)` expects "CashVouchers.DeleteNotAllowed"
- `CashVoucherEditLockTests.StandaloneVoucherCannotBeDeletedInEitherState(posted: True)` expects "CashVouchers.DeleteNotAllowed"
- `CashVoucherEditLockTests.PostedVoucherRejectsEveryEditIncludingNoOp(useDraftEndpoint: False)` expects True
- `CashVoucherEditLockTests.BulkCannotDeleteDraftAndRollsBackNewAdd` expects "CashVouchers.DeleteNotAllowed"
- `CashVoucherServiceTests.PostedRefundKeepsOriginalRoleWhenDefaultChangesAndEditIsRejected(useBulkUpdate: False, changeMovementType: False)` expects "CashVouchers.PostedReadOnly"
- `CashVoucherServiceTests.PostedRefundKeepsOriginalRoleWhenDefaultChangesAndEditIsRejected(useBulkUpdate: False, changeMovementType: True)` expects "CashVouchers.PostedReadOnly"
- `CashVoucherServiceTests.PostedRefundKeepsOriginalRoleWhenDefaultChangesAndEditIsRejected(useBulkUpdate: True, changeMovementType: True)` expects "CashVouchers.PostedReadOnly"
- `CashVoucherServiceTests.PostedRefundKeepsOriginalRoleWhenDefaultChangesAndEditIsRejected(useBulkUpdate: True, changeMovementType: False)` expects "CashVouchers.PostedReadOnly"
- `CashVoucherServiceTests.PostedPartnerNoOpEditIsRejectedAndMovementRemainsUnique` expects "CashVouchers.PostedReadOnly"
- `CashVoucherServiceTests.PostedPaymentEditAndReceiptDeletionPreserveCashbox(useBulk: True)` expects "CashVouchers.PostedReadOnly"
- `CashVoucherServiceTests.PostedPaymentEditAndReceiptDeletionPreserveCashbox(useBulk: False)` expects "CashVouchers.PostedReadOnly"
- `CashVoucherServiceTests.PostingIntegration_DraftIsHandoverOnlyUntilCompletion` expects "CashVouchers.DeleteNotAllowed"
- `CashVoucherServiceTests.PostedVoucherCannotMoveCashEffectBetweenCashboxes` expects "CashVouchers.PostedReadOnly"
- `CashVoucherServiceTests.DeletePreservesPostedCashAndPartnerMovement` expects "CashVouchers.DeleteNotAllowed"
- `CashVoucherServiceTests.PostedEmployeeEditPreservesLinkedMovement` expects "CashVouchers.PostedReadOnly"
- `CashVoucherServiceTests.PostedPartnerTargetCannotChangeToDriver` expects "CashVouchers.PostedReadOnly"
- `CashVoucherServiceTests.EmployeeVoucherDeleteIsRejectedAndPreservesLinkedMovement` expects "CashVouchers.DeleteNotAllowed"
- `CashVoucherServiceTests.BulkDeleteRollsBackEarlierAddAndDraftCompletion` expects "CashVouchers.DeleteNotAllowed"
- `CashVoucherServiceTests.PostedEmployeeTargetChangePreservesMovement` expects "CashVouchers.PostedReadOnly"

## Group 2: expect "posted read-only", code returns a different error (7)

These are worth a look beyond the rule change: a stale completion now returns `CashVouchers.Concurrency` (or a fiscal-year error) where the test expects `PostedReadOnly`. Probably the same cause (the posted guard is gone, so the next check fires), but it should be confirmed on purpose, not by editing the expectation.

- `CashVoucherEditLockTests.SessionPostingFirstBlocksStaleDraftSaveAndCompletion(saveDraft: False)` expects "CashVouchers.PostedReadOnly", code returns "CashVouchers.Concurrency"
- `CashVoucherEditLockTests.DraftSaveFirstRejectsOldCompletionThenLatestVersionPostsOnlyOnce` expects "CashVouchers.PostedReadOnly", code returns "CashVouchers.Concurrency"
- `CashVoucherEditLockTests.BulkMissingTargetCreatesOperationalDraftAndCompletionRequiresTarget` expects "CashVouchers.PostedReadOnly", code returns "CashVouchers.Concurrency"
- `CashVoucherEditLockTests.BulkUsesLatestDraftVersionAndRollsBackEarlierAdd(postedByOtherSession: True)` expects "CashVouchers.PostedReadOnly", code returns "CashVouchers.Concurrency"
- `CashVoucherServiceTests.VoucherListUsesSelectedFiscalYearAndValidatesDates` expects "CashVouchers.PostedReadOnly", code returns "FiscalYears.QueryDateOutsideRange"
- `CashVoucherServiceTests.BulkRejectsVoucherPostedByAnotherSession` expects "CashVouchers.PostedReadOnly", code returns "CashVouchers.Concurrency"
- `CashVoucherServiceTests.ConcurrentCompletionRejectsStaleRequestAndPreservesWinner` expects "CashVouchers.PostedReadOnly", code returns "CashVouchers.Concurrency"

## Not caused by the rule change

- `StockTransferServiceTests.Create_InOpenNonCurrentFiscalYear_CostsTheTransferInItsOwnYear`: transfers resolve the current fiscal year only.

