namespace ResultService.Api.Dtos.Responses;

public class QuizWithQuestionsDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Category { get; set; }
    public int? Difficulty { get; set; }
    public int? TimeLimitSeconds { get; set; }
    public Guid? CreatedByUserId { get; set; }
    public List<QuestionDto> Questions { get; set; } = new();
}

public class QuestionDto
{
    public Guid Id { get; set; }
    public string Text { get; set; } = string.Empty;
    public QuestionType QuestionType { get; set; }
    public int Points { get; set; } = 1;
    public bool IsCaseSensitive { get; set; }
    public string? Explanation { get; set; }
    public int Order { get; set; }
    public List<AnswerDto> Answers { get; set; } = new();
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

public enum QuestionType
{
    SingleChoice,
    MultipleChoice,
    TrueFalse,
    FillInTheBlank
}
