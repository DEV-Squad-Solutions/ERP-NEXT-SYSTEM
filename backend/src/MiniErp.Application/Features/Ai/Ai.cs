using MiniErp.Application.Common.Abstractions;
using MiniErp.Application.Common.Results;
using MiniErp.Application.Features.Dashboard;
using MiniErp.Application.Features.Kpis;

namespace MiniErp.Application.Features.Ai;

/// <summary>
/// Text-completion provider (Gemini, Groq, ...). Providers only write words. They never receive
/// SQL access and never compute figures: the backend computes, the AI narrates.
/// </summary>
public interface IAIProvider
{
    string Name { get; }

    /// <summary>False when no key is configured for the selected provider.</summary>
    bool IsConfigured { get; }

    Task<Result<string>> CompleteAsync(
        string systemPrompt,
        string userPrompt,
        CancellationToken cancellationToken = default);
}

public sealed record AiAskRequest(string Question, DateOnly? FromDate = null, DateOnly? ToDate = null);

public sealed record AiToolResult(string Tool, object? Data, string? Error);

public sealed record AiAnswerResponse(
    string Question,
    string? Answer,
    bool AiConfigured,
    string? Provider,
    IReadOnlyList<AiToolResult> Sources,
    string? Note);

public interface IAiToolRegistry : IScopedService
{
    IReadOnlyList<(string Name, string Description)> Describe();

    Task<AiToolResult> ExecuteAsync(
        string name,
        DashboardFilterRequest filters,
        CancellationToken cancellationToken = default);
}

public sealed record AiHistoryItem(long Id, DateTime AskedOn, string Question, string? Answer, string? Provider);

public interface IAiAssistantService : IScopedService
{
    Task<Result<IReadOnlyList<AiHistoryItem>>> GetHistoryAsync(CancellationToken cancellationToken = default);

    Task<Result<bool>> DeleteHistoryItemAsync(long id, CancellationToken cancellationToken = default);

    Task<Result<int>> ClearHistoryAsync(CancellationToken cancellationToken = default);

    Task<Result<AiAnswerResponse>> AskAsync(
        AiAskRequest request,
        CancellationToken cancellationToken = default);
}

/// <summary>
/// Controlled tool registry. Every tool wraps an existing company-scoped service (company comes from
/// the authenticated user's JWT inside those services, never from the request), takes only a date
/// range, returns structured data and has no way to run free-form queries.
/// </summary>
public sealed class AiToolRegistry(
    IDashboardService dashboardService,
    IKpiService kpiService) : IAiToolRegistry
{
    private static readonly (string Name, string Description)[] Tools =
    [
        ("GetCompanyOverview", "Sales, purchases, outstanding balances, inventory value, cash balances and counts for the period."),
        ("GetKpis", "Key figures (revenue, receivables, payables, cash, inventory value, margin) with their formulas."),
    ];

    public IReadOnlyList<(string Name, string Description)> Describe() => Tools;

    public async Task<AiToolResult> ExecuteAsync(
        string name,
        DashboardFilterRequest filters,
        CancellationToken cancellationToken = default)
    {
        switch (name)
        {
            case "GetCompanyOverview":
            {
                var result = await dashboardService.GetAsync(filters, cancellationToken);
                return result.IsSuccess
                    ? new AiToolResult(name, result.Value, null)
                    : new AiToolResult(name, null, result.Error.Description);
            }
            case "GetKpis":
            {
                var result = await kpiService.GetAsync(filters, cancellationToken);
                return result.IsSuccess
                    ? new AiToolResult(name, result.Value, null)
                    : new AiToolResult(name, null, result.Error.Description);
            }
            default:
                return new AiToolResult(name, null, "Unknown tool.");
        }
    }
}
