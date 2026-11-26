using Microsoft.AspNetCore.Mvc;
using MiniErp.Api.Extensions;
using MiniErp.Application.Features.Dashboard;
using MiniErp.Application.Features.Kpis;

namespace MiniErp.Api.Controllers;

public sealed class KpisController(IKpiService service) : ApiControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get(
        [FromQuery] DashboardFilterRequest filters,
        CancellationToken cancellationToken) =>
        this.ToActionResult(await service.GetAsync(filters, cancellationToken));
}
