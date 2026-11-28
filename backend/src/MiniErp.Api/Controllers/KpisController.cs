using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MiniErp.Application.Common.Authentication;
using MiniErp.Api.Extensions;
using MiniErp.Application.Features.Dashboard;
using MiniErp.Application.Features.Kpis;

namespace MiniErp.Api.Controllers;

public sealed class KpisController(IKpiService service) : ApiControllerBase
{
    [Authorize(Roles = ApplicationRoles.AdminOrAccountant)]
    [HttpGet]
    public async Task<IActionResult> Get(
        [FromQuery] DashboardFilterRequest filters,
        CancellationToken cancellationToken) =>
        this.ToActionResult(await service.GetAsync(filters, cancellationToken));
}
