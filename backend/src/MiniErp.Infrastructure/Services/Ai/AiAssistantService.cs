using System.Text.Json;
using Microsoft.Extensions.Options;
using MiniErp.Application.Common.Abstractions;
using MiniErp.Application.Common.Results;
using MiniErp.Application.Features.Ai;
using MiniErp.Application.Features.Dashboard;
using Microsoft.EntityFrameworkCore;
using MiniErp.Domain.Entities.Ai;
using MiniErp.Infrastructure.Persistence;

namespace MiniErp.Infrastructure.Services.Ai;

public sealed class AiAssistantService(
    IAiToolRegistry tools,
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
                Provider = result.Value.Provider
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
        foreach (var (name, _) in tools.Describe())
        {
            sources.Add(await tools.ExecuteAsync(name, filters, cancellationToken));
        }

        if (!provider.IsConfigured)
        {
            return Result<AiAnswerResponse>.Success(new AiAnswerResponse(
                question, null, false, null, sources,
                "الذكاء الاصطناعي غير مفعّل بعد. الأرقام التالية من النظام مباشرة."));
        }

        if (!options.Value.AllowedCompanyIds.Contains(company.CompanyId))
        {
            return Result<AiAnswerResponse>.Success(new AiAnswerResponse(
                question, null, true, provider.Name, sources,
                "إرسال بيانات هذه الشركة لمزود الذكاء الاصطناعي غير مسموح بعد. الأرقام من النظام مباشرة."));
        }

        var data = JsonSerializer.Serialize(sources.Where(s => s.Error is null));
        var completion = await provider.CompleteAsync(
            SystemPrompt,
            $"Question: {question}\n\nData (JSON):\n{data}",
            cancellationToken);

        return Result<AiAnswerResponse>.Success(completion.IsSuccess
            ? new AiAnswerResponse(question, completion.Value, true, provider.Name, sources, null)
            : new AiAnswerResponse(question, null, true, provider.Name, sources,
                "تعذر الحصول على رد من الذكاء الاصطناعي الآن. الأرقام من النظام مباشرة."));
    }
}
