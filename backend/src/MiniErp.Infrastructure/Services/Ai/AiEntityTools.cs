using Microsoft.EntityFrameworkCore;
using MiniErp.Application.Common.Abstractions;
using MiniErp.Application.Common.Models;
using MiniErp.Application.Features.Ai;
using MiniErp.Application.Features.Statements;
using MiniErp.Domain.Enums;
using MiniErp.Infrastructure.Persistence;

namespace MiniErp.Infrastructure.Services.Ai;

/// <summary>
/// Read-only lookups of single records (partner, employee, item, invoices, audit trail) for the AI center.
/// Every tool: checks the asker's role against the role the same data needs on its normal screen, resolves the
/// name inside the current company only, reads through existing services or company-filtered queries, and never writes.
/// </summary>
public sealed class AiEntityTools(
    ApplicationDbContext db,
    ICurrentCompanyContext company,
    ICurrentUserService currentUser,
    IFinancialStatementService statements) : IAiEntityTools
{
    public const string PartnerSummary = "GetPartnerSummary";
    public const string PartnerInvoices = "GetPartnerInvoices";
    public const string EmployeeSummary = "GetEmployeeSummary";
    public const string EmployeePayslip = "GetEmployeePayslip";
    public const string ItemStock = "GetItemStock";
    public const string AuditTrail = "GetAuditTrail";

    private static readonly string[] AdminOrAccountant = ["Admin", "Accountant"];
    private static readonly string[] AdminUserOrAccountant = ["Admin", "User", "Accountant"];
    private static readonly string[] AdminOnly = ["Admin"];

    private static readonly (string, string, string[])[] Tools =
    [
        (PartnerSummary, "Customer or supplier: balance, last movements, last payment and receipt.", AdminOrAccountant),
        (PartnerInvoices, "Customer or supplier: last invoices.", AdminOrAccountant),
        (EmployeeSummary, "Employee account: balance and last movements.", AdminOrAccountant),
        (EmployeePayslip, "Employee: last payroll entries (payslips).", AdminOrAccountant),
        (ItemStock, "Item: quantity, average cost and value per store.", AdminUserOrAccountant),
        (AuditTrail, "Audit log: who did what, when.", AdminOnly),
    ];

    public IReadOnlyList<(string Name, string Description, string[] Roles)> Describe() => Tools;

    public async Task<AiToolResult> ExecuteAsync(string name, AiEntityQuery q, CancellationToken ct = default)
    {
        var tool = Tools.FirstOrDefault(t => t.Item1 == name);
        if (tool.Item1 is null) return new AiToolResult(name, null, "Unknown tool.");

        var roles = currentUser.GetRoles();
        if (!tool.Item3.Any(r => roles.Contains(r, StringComparer.OrdinalIgnoreCase)))
            return new AiToolResult(name, new AiEntityResult(AiEntityStatus.Forbidden, name, [], null), null);

        var (qFrom, qTo) = AiNameResolver.DatesIn(q.Question);
        q = q with { FromDate = q.FromDate ?? qFrom, ToDate = q.ToDate ?? qTo };

        var result = name switch
        {
            PartnerSummary => await PartnerSummaryAsync(q, ct),
            PartnerInvoices => await PartnerInvoicesAsync(q, ct),
            EmployeeSummary => await EmployeeSummaryAsync(q, ct),
            EmployeePayslip => await EmployeePayslipAsync(q, ct),
            ItemStock => await ItemStockAsync(q, ct),
            _ => await AuditAsync(q, ct),
        };
        return new AiToolResult(name, result, null);
    }

    private static AiEntityResult Fail(string status, string kind, IReadOnlyList<AiEntityCandidate>? c = null) =>
        new(status, kind, c ?? [], null);

    private async Task<(string Status, IReadOnlyList<AiEntityCandidate> Matches)> ResolveAsync(
        string kind, AiEntityQuery q, CancellationToken ct)
    {
        if (AiNameResolver.NameTokens(q.Question).Count == 0 && !HasCodeLike(q.Question))
            return (AiEntityStatus.NeedsName, []);
        var cid = company.CompanyId;
        List<AiEntityCandidate> universe = kind switch
        {
            "partner" => await db.BusinessPartners.AsNoTracking().Where(x => x.CompanyId == cid)
                .Select(x => new AiEntityCandidate(x.Id, x.Code, x.Name)).Take(5000).ToListAsync(ct),
            "employee" => await db.Employees.AsNoTracking().Where(x => x.CompanyId == cid)
                .Select(x => new AiEntityCandidate(x.Id, x.Code, x.Name)).Take(5000).ToListAsync(ct),
            _ => await db.Items.AsNoTracking().Where(x => x.CompanyId == cid)
                .Select(x => new AiEntityCandidate(x.Id, x.Code, x.Name)).Take(5000).ToListAsync(ct),
        };
        return AiNameResolver.Resolve(q.Question, universe);
    }

    private static bool HasCodeLike(string q) => q.Any(char.IsDigit);

    private async Task<AiEntityResult> PartnerSummaryAsync(AiEntityQuery q, CancellationToken ct)
    {
        var (status, m) = await ResolveAsync("partner", q, ct);
        if (status != AiEntityStatus.Ok) return Fail(status, "partner", m);
        var p = m[0];
        var cid = company.CompanyId;

        var filter = new PartnerStatementFilterRequest(p.Id, null, q.FromDate, q.ToDate);
        var first = await statements.GetPartnerStatementAsync(new PaginationRequest { PageNumber = 1, PageSize = 50 }, filter, ct);
        if (first.IsFailure) return Fail(AiEntityStatus.NotFound, "partner");
        var lines = new List<PartnerStatementItemResponse>(first.Value.Items);
        var page = first.Value.TotalPages;
        if (page > 1)
        {
            lines.Clear();
            for (var pg = page; pg >= 1 && lines.Count < 5 && pg >= page - 2; pg--)
            {
                var r = pg == 1 ? first : await statements.GetPartnerStatementAsync(new PaginationRequest { PageNumber = pg, PageSize = 50 }, filter, ct);
                if (r.IsSuccess) lines.InsertRange(0, r.Value.Items);
            }
        }

        var vouchers = db.CashVouchers.AsNoTracking().Where(v => v.CompanyId == cid && v.BusinessPartnerId == p.Id);
        if (q.FromDate is { } f) vouchers = vouchers.Where(v => v.VoucherDate >= f);
        if (q.ToDate is { } t) vouchers = vouchers.Where(v => v.VoucherDate <= t);
        var lastPayment = await vouchers.Where(v => v.Direction == CashDirection.Payment)
            .OrderByDescending(v => v.VoucherDate).ThenByDescending(v => v.Id)
            .Select(v => new { v.VoucherNumber, Date = v.VoucherDate, v.Amount, Currency = v.Currency.ToString() })
            .FirstOrDefaultAsync(ct);
        var lastReceipt = await vouchers.Where(v => v.Direction == CashDirection.Receipt)
            .OrderByDescending(v => v.VoucherDate).ThenByDescending(v => v.Id)
            .Select(v => new { v.VoucherNumber, Date = v.VoucherDate, v.Amount, Currency = v.Currency.ToString() })
            .FirstOrDefaultAsync(ct);

        var s = first.Value.Summary;
        var data = new
        {
            Partner = p,
            Currency = first.Value.Currency.ToString(),
            ClosingBalance = s.ClosingBalanceAmount,
            ClosingBalanceDescription = s.ClosingBalanceDescription,
            LastMovements = lines.TakeLast(5).Select(i => new { i.Date, i.DocumentNumber, i.MovementName, i.DebitAmount, i.CreditAmount, i.BalanceAmount }).ToList(),
            LastPayment = lastPayment,
            LastReceipt = lastReceipt,
        };
        return new AiEntityResult(AiEntityStatus.Ok, "partner", m, data);
    }

    private async Task<AiEntityResult> PartnerInvoicesAsync(AiEntityQuery q, CancellationToken ct)
    {
        var (status, m) = await ResolveAsync("partner", q, ct);
        if (status != AiEntityStatus.Ok) return Fail(status, "partner", m);
        var p = m[0];
        var cid = company.CompanyId;
        var norm = AiNameResolver.Normalize(q.Question);
        InvoiceType? type = null;
        if (norm.Contains("مبيعات") || norm.Contains("بيع") || norm.Contains("sales")) type = InvoiceType.Sales;
        else if (norm.Contains("مشتريات") || norm.Contains("شراء") || norm.Contains("purchase")) type = InvoiceType.Purchase;

        var inv = db.Invoices.AsNoTracking().Where(i => i.CompanyId == cid && i.BusinessPartnerId == p.Id);
        if (type is { } ty) inv = inv.Where(i => i.InvoiceType == ty);
        if (q.FromDate is { } f) inv = inv.Where(i => i.InvoiceDate >= f);
        if (q.ToDate is { } t) inv = inv.Where(i => i.InvoiceDate <= t);
        var rows = await inv.OrderByDescending(i => i.InvoiceDate).ThenByDescending(i => i.Id).Take(5)
            .Select(i => new
            {
                i.InvoiceNumber,
                Type = i.InvoiceType.ToString(),
                Date = i.InvoiceDate,
                i.Total,
                i.PaidAmount,
                Remaining = i.Total - i.PaidAmount,
                Currency = i.Currency.ToString(),
            }).ToListAsync(ct);
        return new AiEntityResult(AiEntityStatus.Ok, "partner", m, new { Partner = p, Invoices = rows });
    }

    private async Task<AiEntityResult> EmployeeSummaryAsync(AiEntityQuery q, CancellationToken ct)
    {
        var (status, m) = await ResolveAsync("employee", q, ct);
        if (status != AiEntityStatus.Ok) return Fail(status, "employee", m);
        var e = m[0];
        var bal = await statements.GetEmployeeBalanceAsync(e.Id, null, ct);
        if (bal.IsFailure) return Fail(AiEntityStatus.NotFound, "employee");
        var filter = new EmployeeStatementFilterRequest(e.Id, null, q.FromDate, q.ToDate);
        var first = await statements.GetEmployeeStatementAsync(new PaginationRequest { PageNumber = 1, PageSize = 50 }, filter, ct);
        var lines = new List<EmployeeStatementItemResponse>();
        if (first.IsSuccess)
        {
            var pages = first.Value.TotalPages;
            for (var pg = Math.Max(1, pages); pg >= 1 && lines.Count < 5 && pg >= pages - 2; pg--)
            {
                var r = pg == 1 ? first : await statements.GetEmployeeStatementAsync(new PaginationRequest { PageNumber = pg, PageSize = 50 }, filter, ct);
                if (r.IsSuccess) lines.InsertRange(0, r.Value.Items);
            }
        }
        var b = bal.Value;
        return new AiEntityResult(AiEntityStatus.Ok, "employee", m, new
        {
            Employee = e,
            Currency = b.Currency.ToString(),
            b.BalanceAmount,
            b.BalanceDescription,
            b.TotalCredits,
            b.TotalDebits,
            b.LastMovementDate,
            LastMovements = lines.TakeLast(5).Select(i => new { i.Date, i.DocumentNumber, i.MovementName, i.DebitAmount, i.CreditAmount, i.BalanceAmount }).ToList(),
        });
    }

    private async Task<AiEntityResult> EmployeePayslipAsync(AiEntityQuery q, CancellationToken ct)
    {
        var (status, m) = await ResolveAsync("employee", q, ct);
        if (status != AiEntityStatus.Ok) return Fail(status, "employee", m);
        var e = m[0];
        var cid = company.CompanyId;
        var entries = db.PayrollEntries.AsNoTracking().Where(x => x.CompanyId == cid && x.EmployeeId == e.Id);
        if (q.FromDate is { } f) entries = entries.Where(x => x.EndDate >= f);
        if (q.ToDate is { } t) entries = entries.Where(x => x.StartDate <= t);
        var rows = await entries.OrderByDescending(x => x.EndDate).ThenByDescending(x => x.Id).Take(3)
            .Select(x => new
            {
                x.StartDate,
                x.EndDate,
                x.PresentDays,
                x.AbsentDays,
                Bonus = x.Bonus ?? 0m,
                Deduction = x.Deduction ?? 0m,
                x.GrossSalary,
                x.NetSalary,
                MovedToEmployeeAccount = x.IsSalaryMoveToEmployeeAccount,
                x.SalaryMovedOn,
            }).ToListAsync(ct);
        return new AiEntityResult(AiEntityStatus.Ok, "employee", m, new { Employee = e, Entries = rows });
    }

    private async Task<AiEntityResult> ItemStockAsync(AiEntityQuery q, CancellationToken ct)
    {
        var (status, m) = await ResolveAsync("item", q, ct);
        if (status != AiEntityStatus.Ok) return Fail(status, "item", m);
        var it = m[0];
        var cid = company.CompanyId;
        var rows = await db.ItemStoreBalances.AsNoTracking()
            .Where(b => b.CompanyId == cid && b.ItemId == it.Id)
            .Select(b => new { Store = b.Store.Name, b.Quantity, b.AverageCost, b.InventoryValue })
            .OrderBy(b => b.Store).ToListAsync(ct);
        return new AiEntityResult(AiEntityStatus.Ok, "item", m, new
        {
            Item = it,
            TotalQuantity = rows.Sum(r => r.Quantity),
            TotalValue = rows.Sum(r => r.InventoryValue),
            Stores = rows,
        });
    }

    private async Task<AiEntityResult> AuditAsync(AiEntityQuery q, CancellationToken ct)
    {
        var cid = company.CompanyId;
        var norm = AiNameResolver.Normalize(q.Question);
        string? action = null;
        if (norm.Contains("حذف") || norm.Contains("delete")) action = "Deleted";
        else if (norm.Contains("عدل") || norm.Contains("غير") || norm.Contains("تعديل") || norm.Contains("edit") || norm.Contains("update") || norm.Contains("chang") || norm.Contains("modif")) action = "Updated";
        else if (norm.Contains("اضاف") || norm.Contains("انشا") || norm.Contains("create") || norm.Contains("add")) action = "Created";

        var logs = db.AuditLogs.AsNoTracking().Where(a => a.CompanyId == cid);
        if (action is not null) logs = logs.Where(a => a.Action == action);
        if (q.FromDate is { } f) { var from = f.ToDateTime(TimeOnly.MinValue); logs = logs.Where(a => a.OccurredOn >= from); }
        if (q.ToDate is { } t) { var to = t.AddDays(1).ToDateTime(TimeOnly.MinValue); logs = logs.Where(a => a.OccurredOn < to); }

        var words = AiNameResolver.NameTokens(q.Question).Where(w => w.Length >= 3).ToList();
        var pool = await logs.OrderByDescending(a => a.OccurredOn).Take(2000)
            .Select(a => new { a.Id, a.OccurredOn, a.UserName, a.Role, a.Action, a.EntityType, a.EntityId, a.Summary }).ToListAsync(ct);
        var rows = words.Count == 0
            ? pool
            : pool.Where(a => words.Any(w =>
                AiNameResolver.Normalize(a.UserName).Contains(w) ||
                AiNameResolver.Normalize(a.Summary).Contains(w) ||
                AiNameResolver.Normalize(a.EntityType).Contains(w) ||
                AiNameResolver.Normalize(a.EntityId).Contains(w))).ToList();
        return new AiEntityResult(AiEntityStatus.Ok, "audit", [], new { Action = action, Entries = rows.Take(10).ToList(), Matched = rows.Count });
    }
}
