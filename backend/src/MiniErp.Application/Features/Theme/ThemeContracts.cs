using MiniErp.Application.Common.Abstractions;
using MiniErp.Application.Common.Results;

namespace MiniErp.Application.Features.Theme;

public static class ThemeOptions
{
    public static readonly IReadOnlyList<string> ColorThemes =
        ["default", "ocean", "royal", "sunset", "rose", "graphite"];

    public static readonly IReadOnlyList<string> Modes = ["light", "dark"];
}

/// <summary>Null user values mean "follow the company default".</summary>
public sealed record ThemeResponse(
    string? UserColorTheme,
    string? UserMode,
    string CompanyColorTheme,
    string CompanyMode,
    string EffectiveColorTheme,
    string EffectiveMode);

public sealed record ThemeRequest(string? ColorTheme, string? Mode);

public static class ThemeErrors
{
    public static Error Invalid() =>
        Error.Validation(
            "Theme.Invalid",
            "قيمة المظهر غير صحيحة.");
}

public interface IThemeService : IScopedService
{
    Task<Result<ThemeResponse>> GetAsync(
        CancellationToken cancellationToken = default);

    Task<Result<ThemeResponse>> SetMineAsync(
        ThemeRequest request,
        CancellationToken cancellationToken = default);

    Task<Result<ThemeResponse>> SetCompanyDefaultAsync(
        ThemeRequest request,
        CancellationToken cancellationToken = default);
}
