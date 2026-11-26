using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MiniErp.Api.Extensions;
using MiniErp.Application.Features.Ai;

namespace MiniErp.Api.Controllers;

/// <summary>Natural-language questions answered from the company's own ERP figures (company comes from the JWT).</summary>
[Authorize(Roles = "Admin")]
public sealed class AiController(IAiAssistantService service) : ApiControllerBase
{
    [HttpPost("ask")]
    public async Task<IActionResult> Ask(
        [FromBody] AiAskRequest request,
        CancellationToken cancellationToken) =>
        this.ToActionResult(await service.AskAsync(request, cancellationToken));
}
