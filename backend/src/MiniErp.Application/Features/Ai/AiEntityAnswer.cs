using System.Globalization;
using System.Reflection;
using System.Text;

namespace MiniErp.Application.Features.Ai;

/// <summary>Turns entity tool results into a plain Arabic or English answer. Quotes tool figures, never recalculates.</summary>
public static class AiEntityAnswer
{
    public static bool IsEnglish(string question)
    {
        var letters = question.Where(char.IsLetter).ToList();
        return letters.Count > 0 && letters.Count(c => c < '\u0600') * 2 > letters.Count;
    }

    public static string Format(string question, IReadOnlyList<AiToolResult> results)
    {
        var en = IsEnglish(question);
        var sb = new StringBuilder();
        foreach (var r in results)
        {
            if (r.Error is not null) { sb.AppendLine(en ? "Could not read that data right now." : "تعذر قراءة هذه البيانات الآن."); continue; }
            if (r.Data is not AiEntityResult e) continue;
            switch (e.Status)
            {
                case AiEntityStatus.Forbidden:
                    sb.AppendLine(en ? "Your role does not have access to this data." : "صلاحيتك لا تسمح بالاطلاع على هذه البيانات.");
                    continue;
                case AiEntityStatus.NeedsName:
                    sb.AppendLine(en ? $"Write the {Kind(e.Kind, true)} name in your question." : $"اكتب اسم {Kind(e.Kind, false)} في سؤالك.");
                    continue;
                case AiEntityStatus.NotFound:
                    sb.AppendLine(en ? $"No {Kind(e.Kind, true)} matches that name in this company." : $"لا يوجد {Kind(e.Kind, false)} بهذا الاسم في هذه الشركة.");
                    continue;
                case AiEntityStatus.Ambiguous:
                    sb.AppendLine(en ? $"More than one {Kind(e.Kind, true)} matches. Which one do you mean?" : $"أكثر من {Kind(e.Kind, false)} بهذا الاسم. أي واحد تقصد؟");
                    foreach (var c in e.Candidates) sb.AppendLine($"- {c.Name} ({c.Code})");
                    continue;
            }

            switch (r.Tool)
            {
                case "GetPartnerSummary": Partner(sb, e.Data!, en); break;
                case "GetPartnerInvoices": Invoices(sb, e.Data!, en); break;
                case "GetEmployeeSummary": Employee(sb, e.Data!, en); break;
                case "GetEmployeePayslip": Payslip(sb, e.Data!, en); break;
                case "GetItemStock": Stock(sb, e.Data!, en); break;
                case "GetAuditTrail": Audit(sb, e.Data!, en); break;
            }
        }
        return sb.ToString().TrimEnd();
    }

    private static string Kind(string kind, bool en) => (kind, en) switch
    {
        ("partner", true) => "customer or supplier", ("partner", false) => "عميل أو مورد",
        ("employee", true) => "employee", ("employee", false) => "موظف",
        ("item", true) => "item", ("item", false) => "صنف",
        (_, true) => "record", _ => "سجل",
    };

    private static object? P(object o, string name) => o.GetType().GetProperty(name, BindingFlags.Public | BindingFlags.Instance)?.GetValue(o);
    private static string N(object? v) => v switch
    {
        null => "-",
        decimal d => d.ToString("N2", CultureInfo.InvariantCulture),
        DateOnly d => d.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
        DateTime d => d.ToString("yyyy-MM-dd HH:mm", CultureInfo.InvariantCulture),
        _ => v.ToString() ?? "-",
    };
    private static AiEntityCandidate? Cand(object d, string prop) => P(d, prop) as AiEntityCandidate;
    private static IEnumerable<object> List(object d, string prop) => (P(d, prop) as System.Collections.IEnumerable)?.Cast<object>() ?? [];

    private static void Partner(StringBuilder sb, object d, bool en)
    {
        var p = Cand(d, "Partner")!; var cur = N(P(d, "Currency"));
        sb.AppendLine(en ? $"{p.Name} ({p.Code}): balance {N(P(d, "ClosingBalance"))} {cur} ({N(P(d, "ClosingBalanceDescription"))})."
                         : $"{p.Name} ({p.Code}): الرصيد {N(P(d, "ClosingBalance"))} {cur} ({N(P(d, "ClosingBalanceDescription"))}).");
        Voucher(sb, P(d, "LastPayment"), en ? "Last payment (we paid)" : "آخر دفعة صرفناها", en);
        Voucher(sb, P(d, "LastReceipt"), en ? "Last receipt (we received)" : "آخر مبلغ استلمناه", en);
        var mv = List(d, "LastMovements").ToList();
        if (mv.Count > 0)
        {
            sb.AppendLine(en ? "Last movements:" : "آخر الحركات:");
            foreach (var m in mv) sb.AppendLine($"- {N(P(m, "Date"))} {N(P(m, "MovementName"))} #{N(P(m, "DocumentNumber"))}: {(en ? "debit" : "مدين")} {N(P(m, "DebitAmount"))} / {(en ? "credit" : "دائن")} {N(P(m, "CreditAmount"))}");
        }
    }

    private static void Voucher(StringBuilder sb, object? v, string label, bool en)
    {
        if (v is null) { sb.AppendLine(en ? $"{label}: none in the period." : $"{label}: لا يوجد في الفترة."); return; }
        sb.AppendLine($"{label}: {N(P(v, "Amount"))} {N(P(v, "Currency"))} {(en ? "on" : "بتاريخ")} {N(P(v, "Date"))} ({N(P(v, "VoucherNumber"))}).");
    }

    private static void Invoices(StringBuilder sb, object d, bool en)
    {
        var p = Cand(d, "Partner")!; var rows = List(d, "Invoices").ToList();
        if (rows.Count == 0) { sb.AppendLine(en ? $"{p.Name}: no invoices in the period." : $"{p.Name}: لا توجد فواتير في الفترة."); return; }
        sb.AppendLine(en ? $"{p.Name} last invoices:" : $"آخر فواتير {p.Name}:");
        foreach (var i in rows)
            sb.AppendLine($"- #{N(P(i, "InvoiceNumber"))} {N(P(i, "Type"))} {N(P(i, "Date"))}: {(en ? "total" : "الإجمالي")} {N(P(i, "Total"))} {N(P(i, "Currency"))}, {(en ? "paid" : "المدفوع")} {N(P(i, "PaidAmount"))}, {(en ? "remaining" : "المتبقي")} {N(P(i, "Remaining"))}");
    }

    private static void Employee(StringBuilder sb, object d, bool en)
    {
        var e = Cand(d, "Employee")!;
        sb.AppendLine(en ? $"{e.Name} ({e.Code}): balance {N(P(d, "BalanceAmount"))} {N(P(d, "Currency"))} ({N(P(d, "BalanceDescription"))}), last movement {N(P(d, "LastMovementDate"))}."
                         : $"{e.Name} ({e.Code}): الرصيد {N(P(d, "BalanceAmount"))} {N(P(d, "Currency"))} ({N(P(d, "BalanceDescription"))})، آخر حركة {N(P(d, "LastMovementDate"))}.");
        foreach (var m in List(d, "LastMovements"))
            sb.AppendLine($"- {N(P(m, "Date"))} {N(P(m, "MovementName"))} #{N(P(m, "DocumentNumber"))}: {(en ? "debit" : "مدين")} {N(P(m, "DebitAmount"))} / {(en ? "credit" : "دائن")} {N(P(m, "CreditAmount"))}");
    }

    private static void Payslip(StringBuilder sb, object d, bool en)
    {
        var e = Cand(d, "Employee")!; var rows = List(d, "Entries").ToList();
        if (rows.Count == 0) { sb.AppendLine(en ? $"{e.Name}: no payroll entries in the period." : $"{e.Name}: لا توجد قسائم مرتب في الفترة."); return; }
        sb.AppendLine(en ? $"{e.Name} last payroll entries:" : $"آخر مرتبات {e.Name}:");
        foreach (var r in rows)
            sb.AppendLine($"- {N(P(r, "StartDate"))} → {N(P(r, "EndDate"))}: {(en ? "net" : "الصافي")} {N(P(r, "NetSalary"))} ({(en ? "gross" : "الإجمالي")} {N(P(r, "GrossSalary"))}, {(en ? "bonus" : "مكافأة")} {N(P(r, "Bonus"))}, {(en ? "deduction" : "خصم")} {N(P(r, "Deduction"))}), {(en ? "present" : "حضور")} {N(P(r, "PresentDays"))} {(en ? "days" : "يوم")}, {(((bool?)P(r, "MovedToEmployeeAccount")) == true ? (en ? "moved to employee account" : "تم ترحيله لحساب الموظف") : (en ? "not moved to account" : "لم يرحل لحساب الموظف"))}");
    }

    private static void Stock(StringBuilder sb, object d, bool en)
    {
        var i = Cand(d, "Item")!; var rows = List(d, "Stores").ToList();
        sb.AppendLine(en ? $"{i.Name} ({i.Code}): total quantity {N(P(d, "TotalQuantity"))}, value {N(P(d, "TotalValue"))}."
                         : $"{i.Name} ({i.Code}): إجمالي الكمية {N(P(d, "TotalQuantity"))}، القيمة {N(P(d, "TotalValue"))}.");
        foreach (var s in rows) sb.AppendLine($"- {N(P(s, "Store"))}: {N(P(s, "Quantity"))} @ {N(P(s, "AverageCost"))}");
    }

    private static void Audit(StringBuilder sb, object d, bool en)
    {
        var rows = List(d, "Entries").ToList();
        if (rows.Count == 0) { sb.AppendLine(en ? "No matching audit entries." : "لا توجد سجلات تدقيق مطابقة."); return; }
        sb.AppendLine(en ? $"Matching audit entries ({N(P(d, "Matched"))}, newest {rows.Count}):" : $"سجلات التدقيق المطابقة ({N(P(d, "Matched"))}، أحدث {rows.Count}):");
        foreach (var r in rows)
            sb.AppendLine($"- {N(P(r, "OccurredOn"))} {N(P(r, "UserName"))} ({N(P(r, "Role"))}): {N(P(r, "Action"))} {N(P(r, "EntityType"))} #{N(P(r, "EntityId"))} - {N(P(r, "Summary"))}");
    }
}
