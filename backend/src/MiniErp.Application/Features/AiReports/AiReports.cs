using MiniErp.Application.Common.Abstractions;
using MiniErp.Application.Common.Results;
using MiniErp.Application.Features.Dashboard;

namespace MiniErp.Application.Features.AiReports;

/// <summary>
/// Narrative summary of the dashboard figures. Every number comes from
/// <see cref="DashboardResponse"/>; the AI provider only writes the wording.
/// </summary>
public sealed record AiReportResponse(
    string Narrative,
    IReadOnlyList<string> Highlights,
    IReadOnlyList<string> SuggestedActions,
    string Source,
    string? Provider,
    DashboardResponse Figures);

public interface IAiReportService : IScopedService
{
    Task<Result<AiReportResponse>> GetDashboardSummaryAsync(
        DashboardFilterRequest filters,
        string language,
        CancellationToken cancellationToken = default);
}
