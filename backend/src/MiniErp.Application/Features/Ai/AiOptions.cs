namespace MiniErp.Application.Features.Ai;

public sealed class AiOptions
{
    public const string SectionName = "Ai";

    /// <summary>None, Gemini or Groq. Free providers only.</summary>
    public string Provider { get; set; } = "None";

    public string GeminiApiKey { get; set; } = string.Empty;

    public string GeminiModel { get; set; } = "gemini-2.0-flash";

    public string GroqApiKey { get; set; } = string.Empty;

    public string GroqModel { get; set; } = "llama-3.3-70b-versatile";

    /// <summary>
    /// Companies whose data may be sent to an AI provider. Defaults to the test company only until the
    /// owner explicitly confirms data sharing for real companies.
    /// </summary>
    public int[] AllowedCompanyIds { get; set; } = [2];

    public int TimeoutSeconds { get; set; } = 30;
}
