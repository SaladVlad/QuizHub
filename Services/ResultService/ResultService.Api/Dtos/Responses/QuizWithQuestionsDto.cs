using System.Text.Json.Serialization;

namespace ResultService.Api.Dtos.Responses;

public class QuizWithQuestionsDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public List<QuestionDto> Questions { get; set; } = new();
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public class QuestionDto
{
    public Guid Id { get; set; }
    public string Text { get; set; } = string.Empty;
    public string? Explanation { get; set; }
    public int Points { get; set; } = 1;
    public int Order { get; set; }
    public QuestionType Type { get; set; }
    public List<AnswerDto> Answers { get; set; } = new();
    public bool IsCaseSensitive { get; set; }
    public bool AllowPartialCredit { get; set; }
}

public class AnswerDto
{
    public Guid Id { get; set; }
    public string Text { get; set; } = string.Empty;
    public bool IsCorrect { get; set; }
    public int Order { get; set; }
    public string? Explanation { get; set; }
    public float? PartialCredit { get; set; }
}

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum QuestionType
{
    SingleChoice,
    MultipleChoice,
    TrueFalse,
    FillInTheBlank
}
