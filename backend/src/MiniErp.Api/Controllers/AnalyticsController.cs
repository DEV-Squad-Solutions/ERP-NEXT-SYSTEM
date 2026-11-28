using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MiniErp.Api.Extensions;
using MiniErp.Application.Common.Authentication;
using MiniErp.Application.Features.Analytics;

namespace MiniErp.Api.Controllers;

/// <summary>Sales, purchase, partner, item and aging analysis computed from the company's own data.</summary>
[Authorize(Roles = ApplicationRoles.AdminOrAccountant)]
public sealed class AnalyticsController(IAnalyticsService service) : ApiControllerBase
{
    [HttpGet("overview")]
    [ProducesResponseType<AnalyticsOverview>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Overview(
        [FromQuery] AnalyticsQuery query,
        CancellationToken cancellationToken) =>
        this.ToActionResult(await service.GetOverviewAsync(query, cancellationToken));
}
