using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MiniErp.Api.Extensions;
using MiniErp.Application.Features.Forecasting;

namespace MiniErp.Api.Controllers;

/// <summary>Estimated net sales for the next months. Refuses when there is too little history.</summary>
[Authorize(Roles = "Admin")]
public sealed class ForecastsController(IForecastService service) : ApiControllerBase
{
    [HttpGet("sales")]
    public async Task<IActionResult> Sales(CancellationToken cancellationToken) =>
        this.ToActionResult(await service.ForecastSalesAsync(cancellationToken));
}
