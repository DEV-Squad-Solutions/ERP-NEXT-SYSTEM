using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MiniErp.Api.Extensions;
using MiniErp.Application.Features.Setup;

namespace MiniErp.Api.Controllers;

[AllowAnonymous]
public sealed class SetupController(ISetupService setupService)
    : ApiControllerBase
{
    [HttpGet("status")]
    [ProducesResponseType<SetupStatusResponse>(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetStatus(
        CancellationToken cancellationToken)
    {
        var result = await setupService.GetStatusAsync(cancellationToken);
        return this.ToActionResult(result);
    }

    [HttpPost("initialize")]
    [ProducesResponseType<SetupInitializeResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Initialize(
        SetupInitializeRequest request,
        CancellationToken cancellationToken)
    {
        var result = await setupService.InitializeAsync(
            request,
            cancellationToken);
        return this.ToActionResult(result);
    }
}
