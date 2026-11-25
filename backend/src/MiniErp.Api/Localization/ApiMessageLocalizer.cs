using System.Text.RegularExpressions;

namespace MiniErp.Api.Localization;

/// <summary>
/// Translates the Arabic API messages to English when the caller asks for it
/// through Accept-Language. Arabic stays the source text; unknown messages
/// fall back to Arabic unchanged.
/// </summary>
public static class ApiMessageLocalizer
{
    private static readonly Dictionary<string, string> ExactMap = BuildExact();
    private static readonly List<(Regex Pattern, string English)> TemplateMap = BuildTemplates();

    public static bool WantsEnglish(HttpContext? httpContext)
    {
        var header = httpContext?.Request.Headers.AcceptLanguage.ToString();
        if (string.IsNullOrWhiteSpace(header))
        {
            return false;
        }

        var first = header.Split(',')[0].Trim();
        return first.StartsWith("en", StringComparison.OrdinalIgnoreCase);
    }

    public static string Translate(string? message, HttpContext? httpContext)
    {
        if (string.IsNullOrEmpty(message) || !WantsEnglish(httpContext))
        {
            return message ?? string.Empty;
        }

        return TranslateToEnglish(message);
    }

    public static string TranslateToEnglish(string message)
    {
        if (ExactMap.TryGetValue(message, out var exact))
        {
            return exact;
        }

        foreach (var (pattern, english) in TemplateMap)
        {
            var match = pattern.Match(message);
            if (!match.Success)
            {
                continue;
            }

            var result = english;
            for (var i = 1; i < match.Groups.Count; i++)
            {
                var group = match.Groups[i];
                var value = ExactMap.TryGetValue(group.Value, out var translated)
                    ? translated
                    : group.Value;
                result = result.Replace("{" + group.Name + "}", value, StringComparison.Ordinal);
            }

            return result;
        }

        return message;
    }

    private static Dictionary<string, string> BuildExact()
    {
        var map = new Dictionary<string, string>(StringComparer.Ordinal);
        foreach (var (ar, en) in EnglishMessages.Exact)
        {
            map.TryAdd(ar, en);
        }

        return map;
    }

    private static List<(Regex, string)> BuildTemplates()
    {
        var list = new List<(Regex, string, int)>();
        foreach (var (ar, en) in EnglishMessages.Templates)
        {
            var placeholders = Regex.Matches(ar, @"\{([0-9A-Za-z]+)\}");
            var pattern = new System.Text.StringBuilder("^");
            var last = 0;
            var seen = new HashSet<string>();
            foreach (Match m in placeholders)
            {
                pattern.Append(Regex.Escape(ar[last..m.Index]));
                var name = m.Groups[1].Value;
                var groupName = "g" + name;
                pattern.Append(seen.Add(groupName)
                    ? $"(?<{groupName}>.+?)"
                    : $"\\k<{groupName}>");
                last = m.Index + m.Length;
            }

            pattern.Append(Regex.Escape(ar[last..])).Append('$');
            // English text uses {name}; rename placeholders to the group names.
            var english = Regex.Replace(en, @"\{([0-9A-Za-z]+)\}", "{g$1}");
            list.Add((
                new Regex(pattern.ToString(), RegexOptions.Compiled | RegexOptions.CultureInvariant | RegexOptions.Singleline, TimeSpan.FromMilliseconds(50)),
                english,
                ar.Length - placeholders.Sum(p => p.Length)));
        }

        return list
            .OrderByDescending(item => item.Item3)
            .Select(item => (item.Item1, item.Item2))
            .ToList();
    }
}
