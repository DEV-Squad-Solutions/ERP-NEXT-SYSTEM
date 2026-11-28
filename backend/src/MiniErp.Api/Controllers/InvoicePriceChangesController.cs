using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MiniErp.Api.Extensions;
using MiniErp.Application.Common.Authentication;
using MiniErp.Application.Features.InvoicePriceChanges;

namespace MiniErp.Api.Controllers;

/// <summary>Admin-only bulk change of one item's price on invoices inside a date period.</summary>
[Authorize(Roles = ApplicationRoles.Admin)]
[ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
[ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
[ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
public sealed class InvoicePriceChangesController(
    IInvoicePriceChangeService service) : ApiControllerBase
{
    /// <summary>Dry run. Changes nothing.</summary>
    [HttpPost("preview")]
    [ProducesResponseType<InvoicePriceChangePreviewResponse>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Preview(
        InvoicePriceChangePreviewRequest request,
        CancellationToken cancellationToken) =>
        this.ToActionResult(await service.PreviewAsync(request, cancellationToken));

    /// <summary>Applies the change. Needs the eligible invoice count from the preview.</summary>
    [HttpPost("apply")]
    [ProducesResponseType<InvoicePriceChangeApplyResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Apply(
        InvoicePriceChangeApplyRequest request,
        CancellationToken cancellationToken) =>
        this.ToActionResult(await service.ApplyAsync(request, cancellationToken));
}
