using Microsoft.AspNetCore.Mvc;
using MiniErp.Api.Extensions;
using MiniErp.Application.Features.AiReports;
using MiniErp.Application.Features.Dashboard;

namespace MiniErp.Api.Controllers;

[ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
[ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
[ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
public sealed class AiReportsController(IAiReportService aiReportService)
    : ApiControllerBase
{
    /// <summary>
    /// Narrative summary of the dashboard. Numbers come from the ledger-backed dashboard;
    /// the AI provider (if a key is configured) only writes the wording.
    /// </summary>
    [HttpGet("dashboard-summary")]
    [ProducesResponseType<AiReportResponse>(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetDashboardSummary(
        [FromQuery] DashboardFilterRequest filters,
        [FromQuery] string language = "ar",
        CancellationToken cancellationToken = default)
    {
        var result = await aiReportService.GetDashboardSummaryAsync(
            filters, language, cancellationToken);
        return this.ToActionResult(result);
    }
}
