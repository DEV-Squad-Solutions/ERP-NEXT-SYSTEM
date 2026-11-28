using MiniErp.Application.Common.Abstractions;
using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;

namespace MiniErp.Application.Features.Ai;

/// <summary>What the router hands to an entity tool: the raw question plus optional date filters.</summary>
public sealed record AiEntityQuery(string Question, DateOnly? FromDate, DateOnly? ToDate);

public sealed record AiEntityCandidate(int Id, string Code, string Name);

/// <summary>Outcome of every entity tool: ok, ambiguous (pick one), not_found, needs_name or forbidden.</summary>
public sealed record AiEntityResult(
    string Status,
    string Kind,
    IReadOnlyList<AiEntityCandidate> Candidates,
    object? Data);

public static class AiEntityStatus
{
    public const string Ok = "ok";
    public const string Ambiguous = "ambiguous";
    public const string NotFound = "not_found";
    public const string NeedsName = "needs_name";
    public const string Forbidden = "forbidden";
}

public interface IAiEntityTools : IScopedService
{
    IReadOnlyList<(string Name, string Description, string[] Roles)> Describe();

    Task<AiToolResult> ExecuteAsync(string name, AiEntityQuery query, CancellationToken cancellationToken = default);
}

/// <summary>
/// Deterministic name resolution for Arabic and English questions. Intent and filler words are removed,
/// the remaining words are matched against entity names (whole word or prefix of at least 3 letters) and
/// codes. A single clear winner resolves; equal winners come back as a list to choose from.
/// </summary>
public static class AiNameResolver
{
    private static readonly HashSet<string> Stop = new(StringComparer.Ordinal)
    {
        // Arabic
        "كام","كم","ايه","ما","ماهو","ماهي","هو","هي","مين","من","الي","اللي","في","علي","على","عن","الى","الي","لو","ده","دي","دا","هذا","هذه","اخر","اخير","اخره","اخرى","اول",
        "رصيد","حساب","كشف","فاتوره","فواتير","فاتورة","دفعه","دفعة","مدفوعات","سداد","مستحق","مديونيه","مديونية","راتب","مرتب","قسيمه","قسيمة","اجر","صنف","اصناف","مخزون","كميه","كمية","متوفر","موجود",
        "عميل","العميل","مورد","المورد","موظف","الموظف","الموظفه","زبون","شريك","بتاع","بتاعة","بتاعه","لي","لى","عندي","عند","لدي","لدى","قام","عدل","حذف","غير","عمل","اضاف","انشا","انشأ","سجل","التدقيق","العمليه","العملية",
        "الشهر","السنه","السنة","هذا","الماضي","الحالي","حاليا","النهارده","اليوم","من","الى","بين","و","او","هل","يا","لـ","ل","به","بها","له","لها","تفاصيل","اعرض","اظهر","وريني","قولي","عايز","اعرف","اريد","ابغى",
        // English
        "what","whats","is","the","of","for","to","a","an","and","or","show","me","give","tell","who","last","latest","recent","balance","account","statement","invoice","invoices","payment","payments","paid","payslip","salary","payroll","stock","quantity","item","items","customer","supplier","employee","partner","how","much","many","do","does","did","has","have","i","my","in","on","by","from","audit","log","changed","edited","deleted","created","modified","there","are","available","current","owed","owe","due","wage"
    };

    public static string Normalize(string? s)
    {
        if (string.IsNullOrEmpty(s)) return string.Empty;
        var sb = new StringBuilder(s.Length);
        foreach (var ch in s.Normalize(NormalizationForm.FormD))
        {
            var cat = CharUnicodeInfo.GetUnicodeCategory(ch);
            if (cat == UnicodeCategory.NonSpacingMark || ch == 'ـ') continue; // tashkeel, tatweel
            sb.Append(ch switch
            {
                'أ' or 'إ' or 'آ' => 'ا',
                'ة' => 'ه',
                'ى' => 'ي',
                _ => char.ToLowerInvariant(ch)
            });
        }
        return sb.ToString();
    }

    public static IReadOnlyList<string> Tokens(string? s) =>
        Regex.Split(Normalize(s), @"[^\p{L}\p{Nd}]+").Where(t => t.Length > 0).ToList();

    /// <summary>Question words that are not intent or filler, i.e. the part that names someone or something.</summary>
    public static IReadOnlyList<string> NameTokens(string? question) =>
        Tokens(question)
            .Select(StripPrefix)
            .Where(t => t.Length >= 2 && !Stop.Contains(t))
            .Distinct()
            .ToList();

    // Arabic attached prefixes: لـ (to), ب (with), و (and), ال (the). Only removed when the stem stays meaningful.
    internal static string StripPrefix(string t)
    {
        if (Stop.Contains(t)) return t;
        if (t.Length > 4 && t.StartsWith("لل", StringComparison.Ordinal)) return t[2..];
        if (t.Length > 4 && t.StartsWith("ال", StringComparison.Ordinal)) return t[2..];
        if (t.Length > 4 && (t[0] == 'ل' || t[0] == 'ب' || t[0] == 'و') && IsArabic(t[0]))
        {
            var rest = t[1..];
            return Stop.Contains(rest) ? rest : t;
        }
        return t;
    }

    private static bool IsArabic(char c) => c is >= '\u0600' and <= '\u06FF';

    public static (string Status, IReadOnlyList<AiEntityCandidate> Matches) Resolve(
        string? question,
        IReadOnlyCollection<AiEntityCandidate> universe)
    {
        var normalizedQuestion = Normalize(question);
        var query = NameTokens(question);

        static bool TokenMatches(string q, List<string> nameTokens) =>
            nameTokens.Contains(q) || (q.Length >= 3 && nameTokens.Any(n => n.StartsWith(q, StringComparison.Ordinal)));

        var prepared = universe.Select(e => (E: e,
            Code: Normalize(e.Code),
            Tokens: Tokens(e.Name).Select(StripPrefix).ToList())).ToList();

        // A question word that matches no record at all is filler. Digits are never filler.
        var required = query.Where(q => q.Any(char.IsDigit) || prepared.Any(p => TokenMatches(q, p.Tokens))).ToList();

        var scored = new List<(AiEntityCandidate E, int Score, int Exact, int Extra)>();
        foreach (var (e, code, nameTokens) in prepared)
        {
            if (code.Length >= 2 && Regex.IsMatch(normalizedQuestion, $@"(?<![\p{{L}}\p{{Nd}}]){Regex.Escape(code)}(?![\p{{L}}\p{{Nd}}])"))
            {
                scored.Add((e, 1000, 1000, 0));
                continue;
            }

            if (required.Count == 0 || !required.All(q => TokenMatches(q, nameTokens))) continue;
            var exact = required.Count(q => nameTokens.Contains(q));
            scored.Add((e, required.Count, exact, nameTokens.Count - required.Count));
        }

        if (scored.Count == 0) return (AiEntityStatus.NotFound, []);
        var best = scored.OrderByDescending(x => x.Score).ThenByDescending(x => x.Exact).ToList();
        var top = best.Where(x => x.Score == best[0].Score && x.Exact == best[0].Exact).ToList();
        if (top.Count == 1) return (AiEntityStatus.Ok, [top[0].E]);
        // Several records match equally well. Only a record whose whole name was typed wins outright.
        var whole = top.Where(x => x.Extra == 0).ToList();
        if (whole.Count == 1) return (AiEntityStatus.Ok, [whole[0].E]);
        return (AiEntityStatus.Ambiguous, top.OrderBy(x => x.E.Name, StringComparer.Ordinal).Take(8).Select(x => x.E).ToList());
    }

    /// <summary>First one or two ISO dates (yyyy-MM-dd) typed inside the question, used when the request has no dates.</summary>
    public static (DateOnly? From, DateOnly? To) DatesIn(string? question)
    {
        var found = Regex.Matches(question ?? string.Empty, @"\b(\d{4})-(\d{2})-(\d{2})\b")
            .Select(m => DateOnly.TryParse(m.Value, CultureInfo.InvariantCulture, out var d) ? (DateOnly?)d : null)
            .Where(d => d.HasValue).Select(d => d!.Value).OrderBy(d => d).ToList();
        return found.Count switch { 0 => (null, null), 1 => (found[0], found[0]), _ => (found[0], found[^1]) };
    }
}
