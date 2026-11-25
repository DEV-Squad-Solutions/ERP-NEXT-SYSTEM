using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MiniErp.Api.Extensions;
using MiniErp.Application.Features.ScreenAccess;

namespace MiniErp.Api.Controllers;

public sealed class ScreenAccessController(IScreenAccessService service)
    : ApiControllerBase
{
    [HttpGet("me")]
    [ProducesResponseType<ScreenAccessResponse>(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetMine(
        CancellationToken cancellationToken) =>
        this.ToActionResult(await service.GetMineAsync(cancellationToken));

    [Authorize(Roles = "Admin")]
    [HttpGet("users/{userId:guid}")]
    [ProducesResponseType<ScreenAccessResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetForUser(
        Guid userId,
        CancellationToken cancellationToken) =>
        this.ToActionResult(
            await service.GetForUserAsync(userId, cancellationToken));

    [Authorize(Roles = "Admin")]
    [HttpPut("users/{userId:guid}")]
    [ProducesResponseType<ScreenAccessResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> SetForUser(
        Guid userId,
        ScreenAccessRequest request,
        CancellationToken cancellationToken) =>
        this.ToActionResult(
            await service.SetForUserAsync(userId, request, cancellationToken));
}
