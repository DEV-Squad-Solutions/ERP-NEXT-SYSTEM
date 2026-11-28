using System.Text.Json;
using Microsoft.Extensions.Options;
using MiniErp.Application.Common.Abstractions;
using MiniErp.Application.Common.Results;
using MiniErp.Application.Features.Ai;
using MiniErp.Application.Features.Analytics;
using MiniErp.Application.Features.Dashboard;
using Microsoft.EntityFrameworkCore;
using MiniErp.Domain.Entities.Ai;
using MiniErp.Infrastructure.Persistence;

namespace MiniErp.Infrastructure.Services.Ai;

public sealed class AiAssistantService(
    IAiToolRegistry tools,
    IAiEntityTools entityTools,
    IAIProvider provider,
    ICurrentCompanyContext company,
    IOptions<AiOptions> options,
    ApplicationDbContext dbContext,
    ICurrentUserService currentUser,
    TimeProvider timeProvider) : IAiAssistantService, IScopedService
{
    private const int HistoryLimit = 50;
    private const int MaxAnswerLength = 4000;

    private const int MaxQuestionLength = 500;

    private const string SystemPrompt =
        "You are the analytics assistant of an ERP system. Answer ONLY from the JSON data provided. " +
        "Never invent, estimate or recalculate figures: quote them exactly as given, with their currency. " +
        "If the data does not contain the answer, say clearly that it is not available. " +
        "Reply in the same language as the question (Arabic or English), briefly, and mention the period.";

    public async Task<Result<AiAnswerResponse>> AskAsync(
        AiAskRequest request,
        CancellationToken cancellationToken = default)
    {
        var result = await AskCoreAsync(request, cancellationToken);
        if (result.IsSuccess && currentUser.GetUserId() is { IsSuccess: true } user)
        {
            var answer = result.Value.Answer;
            dbContext.AiQuestionLogs.Add(new AiQuestionLog
            {
                CompanyId = company.CompanyId,
                UserId = user.Value,
                AskedOn = timeProvider.GetUtcNow().UtcDateTime,
                Question = result.Value.Question,
                Answer = answer is { Length: > MaxAnswerLength } ? answer[..MaxAnswerLength] : answer,
                Provider = result.Value.Provider,
                ToolsUsed = result.Value.ToolsUsed is { Count: > 0 } used ? string.Join(',', used) : null
            });
            await dbContext.SaveChangesAsync(cancellationToken);
        }

        return result;
    }

    public async Task<Result<IReadOnlyList<AiHistoryItem>>> GetHistoryAsync(CancellationToken cancellationToken = default)
    {
        if (currentUser.GetUserId() is not { IsSuccess: true } user)
        {
            return Result<IReadOnlyList<AiHistoryItem>>.Success([]);
        }

        var companyId = company.CompanyId;
        var items = await dbContext.AiQuestionLogs.AsNoTracking()
            .Where(l => l.CompanyId == companyId && l.UserId == user.Value)
            .OrderByDescending(l => l.AskedOn)
            .Take(HistoryLimit)
            .Select(l => new AiHistoryItem(l.Id, l.AskedOn, l.Question, l.Answer, l.Provider))
            .ToListAsync(cancellationToken);
        return Result<IReadOnlyList<AiHistoryItem>>.Success(items);
    }

    public async Task<Result<bool>> DeleteHistoryItemAsync(long id, CancellationToken cancellationToken = default)
    {
        if (currentUser.GetUserId() is not { IsSuccess: true } user)
        {
            return Result<bool>.Success(false);
        }

        var companyId = company.CompanyId;
        var removed = await dbContext.AiQuestionLogs
            .Where(l => l.Id == id && l.CompanyId == companyId && l.UserId == user.Value)
            .ExecuteDeleteAsync(cancellationToken);
        return Result<bool>.Success(removed > 0);
    }

    public async Task<Result<int>> ClearHistoryAsync(CancellationToken cancellationToken = default)
    {
        if (currentUser.GetUserId() is not { IsSuccess: true } user)
        {
            return Result<int>.Success(0);
        }

        var companyId = company.CompanyId;
        var removed = await dbContext.AiQuestionLogs
            .Where(l => l.CompanyId == companyId && l.UserId == user.Value)
            .ExecuteDeleteAsync(cancellationToken);
        return Result<int>.Success(removed);
    }

    private async Task<Result<AiAnswerResponse>> AskCoreAsync(
        AiAskRequest request,
        CancellationToken cancellationToken)
    {
        var question = request.Question?.Trim() ?? string.Empty;
        if (question.Length == 0 || question.Length > MaxQuestionLength)
        {
            return Result<AiAnswerResponse>.Failure(Error.Validation(
                "Ai.InvalidQuestion",
                "اكتب سؤالا لا يزيد عن 500 حرف.",
                nameof(AiAskRequest.Question)));
        }

        var filters = new DashboardFilterRequest(request.FromDate, request.ToDate);
        var sources = new List<AiToolResult>();
        // Record lookups (a partner, an employee, an item, the audit log) come first and answer on their own.
        var entityNames = AiIntentRouter.RouteEntities(
            question, entityTools.Describe().Select(t => t.Name).ToHashSet());
        if (entityNames.Count > 0)
        {
            var entityQuery = new AiEntityQuery(question, request.FromDate, request.ToDate);
            var entityResults = new List<AiToolResult>();
            foreach (var name in entityNames)
                entityResults.Add(await entityTools.ExecuteAsync(name, entityQuery, cancellationToken));

            // Two "balance of X" lookups (partner and employee): keep the ones that found something, else show the first.
            if (entityResults.Count > 1 && entityResults.Any(r => r.Data is AiEntityResult { Status: AiEntityStatus.Ok or AiEntityStatus.Ambiguous }))
                entityResults = entityResults.Where(r => r.Data is AiEntityResult { Status: AiEntityStatus.Ok or AiEntityStatus.Ambiguous }).ToList();

            var text = AiEntityAnswer.Format(question, entityResults);
            return Result<AiAnswerResponse>.Success(new AiAnswerResponse(
                question, text, true, BuiltInAnalyst.ProviderName, entityResults, null,
                entityNames));
        }

        var available = tools.Describe().Select(t => t.Name).ToHashSet();
        var toolsUsed = AiIntentRouter.Route(question, available);
        foreach (var name in toolsUsed)
        {
            sources.Add(await tools.ExecuteAsync(name, filters, cancellationToken));
        }

        // الافتراضي: المحلل المدمج داخل السيرفر. لا مفتاح ولا مزود خارجي، وكل الشركات آمنة.
        var useExternal = provider.IsConfigured && options.Value.AllowedCompanyIds.Contains(company.CompanyId);
        if (!useExternal)
        {
            var overview = sources.Select(x => x.Data).OfType<DashboardResponse>().FirstOrDefault();
            var analytics = sources.Select(x => x.Data).OfType<AnalyticsOverview>().FirstOrDefault();
            var analysis = analytics is null ? null : BuiltInAnalyst.AnalyticsAnswer(question, analytics);
            if (analysis is not null)
            {
                return Result<AiAnswerResponse>.Success(new AiAnswerResponse(
                    question,
                    $"الفترة: {analytics!.Period.FromDate:yyyy-MM-dd} إلى {analytics.Period.ToDate:yyyy-MM-dd}.\n{analysis}الأرقام محسوبة من فواتير النظام مباشرة (صافي بعد المرتجعات).",
                    true, BuiltInAnalyst.ProviderName, sources, null, toolsUsed));
            }

            return Result<AiAnswerResponse>.Success(overview is null
                ? new AiAnswerResponse(question, null, true, BuiltInAnalyst.ProviderName, sources,
                    "تعذر تحميل أرقام الشركة الآن.", toolsUsed)
                : new AiAnswerResponse(question, BuiltInAnalyst.Answer(question, overview), true,
                    BuiltInAnalyst.ProviderName, sources, null, toolsUsed));
        }

        var data = JsonSerializer.Serialize(sources.Where(s => s.Error is null && s.Tool != "GetAnalytics"));
        var completion = await provider.CompleteAsync(
            SystemPrompt,
            $"Question: {question}\n\nData (JSON):\n{data}",
            cancellationToken);

        return Result<AiAnswerResponse>.Success(completion.IsSuccess
            ? new AiAnswerResponse(question, completion.Value, true, provider.Name, sources, null, toolsUsed)
            : new AiAnswerResponse(question, null, true, provider.Name, sources,
                "تعذر الحصول على رد من الذكاء الاصطناعي الآن. الأرقام من النظام مباشرة.", toolsUsed));
    }
}
