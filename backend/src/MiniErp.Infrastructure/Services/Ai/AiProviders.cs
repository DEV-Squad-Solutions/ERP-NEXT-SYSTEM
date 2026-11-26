using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Options;
using MiniErp.Application.Common.Results;
using MiniErp.Application.Features.Ai;

namespace MiniErp.Infrastructure.Services.Ai;

/// <summary>Picks the configured free provider. With no key configured it reports IsConfigured = false.</summary>
public sealed class ConfiguredAiProvider(HttpClient http, IOptions<AiOptions> options) : IAIProvider
{
    private AiOptions Options => options.Value;

    public string Name => Options.Provider;

    public bool IsConfigured => Options.Provider.ToLowerInvariant() switch
    {
        "gemini" => !string.IsNullOrWhiteSpace(Options.GeminiApiKey),
        "groq" => !string.IsNullOrWhiteSpace(Options.GroqApiKey),
        _ => false,
    };

    public async Task<Result<string>> CompleteAsync(
        string systemPrompt,
        string userPrompt,
        CancellationToken cancellationToken = default)
    {
        try
        {
            return Options.Provider.ToLowerInvariant() switch
            {
                "gemini" => await GeminiAsync(systemPrompt, userPrompt, cancellationToken),
                "groq" => await GroqAsync(systemPrompt, userPrompt, cancellationToken),
                _ => Result<string>.Failure(Error.Failure("Ai.NotConfigured", "AI provider is not configured.")),
            };
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException or JsonException)
        {
            return Result<string>.Failure(Error.BadGateway("Ai.ProviderFailed", "AI provider call failed."));
        }
    }

    private async Task<Result<string>> GeminiAsync(string system, string user, CancellationToken ct)
    {
        var url = $"https://generativelanguage.googleapis.com/v1beta/models/{Options.GeminiModel}:generateContent";
        using var request = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Content = JsonContent.Create(new
            {
                systemInstruction = new { parts = new[] { new { text = system } } },
                contents = new[] { new { role = "user", parts = new[] { new { text = user } } } },
                generationConfig = new { temperature = 0.2, maxOutputTokens = 800 },
            }),
        };
        request.Headers.Add("x-goog-api-key", Options.GeminiApiKey);
        using var response = await http.SendAsync(request, ct);
        if (!response.IsSuccessStatusCode)
        {
            return Result<string>.Failure(Error.BadGateway("Ai.ProviderFailed", "AI provider returned an error."));
        }

        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync(ct));
        var text = doc.RootElement.GetProperty("candidates")[0].GetProperty("content")
            .GetProperty("parts")[0].GetProperty("text").GetString();
        return string.IsNullOrWhiteSpace(text)
            ? Result<string>.Failure(Error.BadGateway("Ai.EmptyAnswer", "AI provider returned no text."))
            : Result<string>.Success(text.Trim());
    }

    private async Task<Result<string>> GroqAsync(string system, string user, CancellationToken ct)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, "https://api.groq.com/openai/v1/chat/completions")
        {
            Content = JsonContent.Create(new
            {
                model = Options.GroqModel,
                temperature = 0.2,
                max_tokens = 800,
                messages = new object[]
                {
                    new { role = "system", content = system },
                    new { role = "user", content = user },
                },
            }),
        };
        request.Headers.Authorization = new("Bearer", Options.GroqApiKey);
        using var response = await http.SendAsync(request, ct);
        if (!response.IsSuccessStatusCode)
        {
            return Result<string>.Failure(Error.BadGateway("Ai.ProviderFailed", "AI provider returned an error."));
        }

        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync(ct));
        var text = doc.RootElement.GetProperty("choices")[0].GetProperty("message").GetProperty("content").GetString();
        return string.IsNullOrWhiteSpace(text)
            ? Result<string>.Failure(Error.BadGateway("Ai.EmptyAnswer", "AI provider returned no text."))
            : Result<string>.Success(text.Trim());
    }
}
