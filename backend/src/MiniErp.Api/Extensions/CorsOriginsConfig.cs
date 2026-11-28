using Microsoft.Extensions.Configuration;

namespace MiniErp.Api.Extensions;

/// <summary>
/// Reads Cors:AllowedOrigins. Accepts a list (Cors:AllowedOrigins:0, :1) or one
/// comma-separated value. Blank entries are ignored, so an empty compose
/// variable keeps the current behavior (no restriction).
/// </summary>
public static class CorsOriginsConfig
{
    public static string[] Read(IConfiguration configuration)
    {
        var section = configuration.GetSection("Cors:AllowedOrigins");
        var values = new List<string>();
        if (!string.IsNullOrWhiteSpace(section.Value))
        {
            values.AddRange(section.Value.Split(',', StringSplitOptions.TrimEntries));
        }

        values.AddRange(section.GetChildren().Select(c => c.Value ?? string.Empty));

        return values
            .Select(v => v.Trim().TrimEnd('/'))
            .Where(v => v.Length > 0)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();
    }
}
