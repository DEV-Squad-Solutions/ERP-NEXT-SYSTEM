using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MiniErp.Api.Extensions;
using MiniErp.Application.Common.Authentication;
using MiniErp.Application.Features.Registration;

namespace MiniErp.Api.Controllers;

/// <summary>Sign-up is a request. Only an Admin turns it into an account.</summary>
[Authorize(Roles = ApplicationRoles.Admin)]
[ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
[ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
[ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
public sealed class RegistrationRequestsController(
    IRegistrationService registrationService) : ApiControllerBase
{
    [AllowAnonymous]
    [Microsoft.AspNetCore.RateLimiting.EnableRateLimiting("auth")]
    [HttpPost]
    [ProducesResponseType(StatusCodes.Status202Accepted)]
    public async Task<IActionResult> Submit(
        RegistrationRequestCreate request,
        CancellationToken cancellationToken)
    {
        var result = await registrationService.SubmitAsync(request, cancellationToken);
        return result.IsFailure ? this.ToProblem(result.Errors) : Accepted();
    }

    [HttpGet]
    [ProducesResponseType<IReadOnlyList<RegistrationRequestResponse>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> List(
        [FromQuery] string? status,
        CancellationToken cancellationToken) =>
        this.ToActionResult(await registrationService.ListAsync(status, cancellationToken));

    [HttpPost("{id:guid}/approve")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Approve(
        Guid id,
        RegistrationApproveRequest request,
        CancellationToken cancellationToken)
    {
        if (!Guid.TryParse(User.FindFirst("sub")?.Value, out var reviewer))
        {
            return Unauthorized();
        }

        return this.ToActionResult(
            await registrationService.ApproveAsync(id, request, reviewer, cancellationToken));
    }

    [HttpPost("{id:guid}/reject")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Reject(
        Guid id,
        RegistrationRejectRequest request,
        CancellationToken cancellationToken)
    {
        if (!Guid.TryParse(User.FindFirst("sub")?.Value, out var reviewer))
        {
            return Unauthorized();
        }

        return this.ToActionResult(
            await registrationService.RejectAsync(id, request, reviewer, cancellationToken));
    }
}
