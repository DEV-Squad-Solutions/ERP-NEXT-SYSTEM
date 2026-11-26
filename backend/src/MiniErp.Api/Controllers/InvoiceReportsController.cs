using Microsoft.AspNetCore.Mvc;
using MiniErp.Api.Extensions;
using MiniErp.Application.Features.InvoiceReports;

namespace MiniErp.Api.Controllers;

[ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
[ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
[ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
public sealed class InvoiceReportsController(IInvoiceReportService service)
    : ApiControllerBase
{
    [HttpGet("summary")]
    [ProducesResponseType<InvoiceSummaryResponse>(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetSummary(
        [FromQuery] InvoiceSummaryFilterRequest filters,
        CancellationToken cancellationToken)
    {
        var result = await service.GetSummaryAsync(filters, cancellationToken);
        return this.ToActionResult(result);
    }

    [HttpGet("aging")]
    [ProducesResponseType<InvoiceAgingResponse>(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAging(
        [FromQuery] InvoiceAgingFilterRequest filters,
        CancellationToken cancellationToken)
    {
        var result = await service.GetAgingAsync(filters, cancellationToken);
        return this.ToActionResult(result);
    }
}
