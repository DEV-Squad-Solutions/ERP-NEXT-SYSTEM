using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MiniErp.Application.Common.Authentication;
using MiniErp.Api.Extensions;
using MiniErp.Application.Features.Dashboard;

namespace MiniErp.Api.Controllers;

[ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
[ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
[ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
public sealed class DashboardController(IDashboardService dashboardService)
    : ApiControllerBase
{
    [Authorize(Roles = ApplicationRoles.AdminOrAccountant)]
    [HttpGet]
    [ProducesResponseType<DashboardResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Get(
        [FromQuery] DashboardFilterRequest filters,
        CancellationToken cancellationToken)
    {
        var result = await dashboardService.GetAsync(
            filters,
            cancellationToken);
        return this.ToActionResult(result);
    }
}
