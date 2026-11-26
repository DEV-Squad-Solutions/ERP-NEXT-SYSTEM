# Financial formulas (Stage 2 reference)

All figures the AI layer shows come from deterministic C# services. The AI only narrates them.
Source of truth: `DashboardService` (KPIs) and `FinancialStatementService.*` (statements).
Every query is scoped to the company in the caller's JWT (`ICurrentCompanyContext.CompanyId`).

| Figure | Formula | Source |
|---|---|---|
| Net sales | Sales `BaseTotal` minus SalesReturn `BaseTotal` | DashboardService |
| Outstanding (receivable / payable) | `BaseTotal` minus `BasePaidAmountAtInvoiceRate` | DashboardService |
| Inventory value | Sum over item and store of the latest `ItemMovement.InventoryValueAfter` | DashboardService |
| Cash | Sum of cashbox balances (per currency, never mixed) | DashboardService |
| Gross profit / margin | Net sales minus cost; margin = profit / net sales (null when sales are 0) | KpiService |
| Trial balance, income statement, financial position, cash flow | Built from posted journal lines | FinancialStatementService |
| Year result | Credit minus debit, shown as an equity row | FinancialStatementService |

Rules
- Base currency amounts only are summed. Other currencies are reported separately, never converted by the AI.
- Draft documents are excluded from posted figures (counted as "pending").
- Division by zero returns null, not 0.
- The AI never calculates, rounds or estimates. If a figure is missing it says so.
- Reconciliation: KPIs from `GET api/v1/Kpis` must equal `GET api/v1/Dashboard` for the same filters (covered by `KpiServiceTests`).
