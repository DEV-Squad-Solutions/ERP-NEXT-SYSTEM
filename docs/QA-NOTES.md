# QA notes

## Backend tests

Run from `backend/tests/MiniErp.Tests`: `dotnet build`, then `dotnet test --no-build`. The full run takes about two minutes; split it with
`--filter "FullyQualifiedName~CashManagement"` and `"FullyQualifiedName!~CashManagement"` if your shell has a time limit.

Status on 2026-11-27: 1494 tests, 32 failing (was 102 at the start of the review).

What was fixed (tests only, no business rule changed):

- Hand-written SQLite test tables for `ContainerMovements` lacked the `SourceType` and `RowVersion` columns, and one test schema lacked the journal tables. About 70 failures.

What was fixed in code:

- Cash voucher bulk delete opened a second transaction inside the batch transaction, and returned a failure with no error on success. Both fixed (commit d94147a).

What still fails, and why (needs a product decision, not touched):

- 31 CashVoucher tests expect the old rule "a posted voucher cannot be edited or deleted" (`CashVouchers.PostedReadOnly`, `CashVouchers.DeleteNotAllowed`). Commit 95c392c deliberately changed that rule (Admin or Accountant may edit and soft-delete after posting). Either the tests are rewritten to the new rule or the old rule is restored.
- `StockTransferServiceTests.Create_InOpenNonCurrentFiscalYear_CostsTheTransferInItsOwnYear`: transfers resolve the current fiscal year only, so a transfer dated in an older open year is rejected. Either the test is stale or that capability was dropped.

## Frontend checks

- `vite build` passes. The entry bundle is split into vendor chunks.
- 390px (phone) and dark-mode audit of 69 routes against a throwaway fake API: no horizontal overflow, error states show a message and a retry button. Dark-mode contrast fixes are in `frontend/src/index.css`.
- Not yet covered: pages with real data, form submission, desktop width on every page, Safari.
