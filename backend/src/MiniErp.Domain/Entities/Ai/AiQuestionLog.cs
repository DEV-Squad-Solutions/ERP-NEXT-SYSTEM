namespace MiniErp.Domain.Entities.Ai;

/// <summary>One question a user asked the AI assistant. Private to that user, who can delete it.</summary>
public sealed class AiQuestionLog
{
    public long Id { get; set; }

    public int CompanyId { get; set; }

    public Guid UserId { get; set; }

    public DateTime AskedOn { get; set; }

    public string Question { get; set; } = string.Empty;

    /// <summary>The AI's answer, or null when the AI was off and only system figures were shown.</summary>
    public string? Answer { get; set; }

    public string? Provider { get; set; }
}
