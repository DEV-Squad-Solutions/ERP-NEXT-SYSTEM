using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MiniErp.Api.Extensions;
using MiniErp.Application.Features.Theme;

namespace MiniErp.Api.Controllers;

public sealed class ThemeController(IThemeService themeService)
    : ApiControllerBase
{
    [HttpGet]
    [ProducesResponseType<ThemeResponse>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Get(CancellationToken cancellationToken) =>
        this.ToActionResult(await themeService.GetAsync(cancellationToken));

    [HttpPut("me")]
    [ProducesResponseType<ThemeResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> SetMine(
        ThemeRequest request,
        CancellationToken cancellationToken) =>
        this.ToActionResult(
            await themeService.SetMineAsync(request, cancellationToken));

    [Authorize(Roles = "Admin")]
    [HttpPut("company")]
    [ProducesResponseType<ThemeResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> SetCompanyDefault(
        ThemeRequest request,
        CancellationToken cancellationToken) =>
        this.ToActionResult(
            await themeService.SetCompanyDefaultAsync(request, cancellationToken));
}
