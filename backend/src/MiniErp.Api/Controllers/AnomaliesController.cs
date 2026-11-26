using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MiniErp.Api.Extensions;
using MiniErp.Application.Features.Anomalies;

namespace MiniErp.Api.Controllers;

/// <summary>Flags unusual invoice amounts for human review. Read-only: nothing is changed or blocked.</summary>
[Authorize(Roles = "Admin")]
public sealed class AnomaliesController(IAnomalyService service) : ApiControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken cancellationToken) =>
        this.ToActionResult(await service.DetectAsync(cancellationToken));
}
