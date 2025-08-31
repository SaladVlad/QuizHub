namespace QuizService.Api.Dtos.Responses;

public class QuizResponseDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Category { get; set; } = string.Empty;
    public int Difficulty { get; set; }
    public int TimeLimitSeconds { get; set; }
    public List<QuestionResponseDto> Questions { get; set; } = new();
}

public class QuestionResponseDto
{
    public Guid Id { get; set; }
    public string Text { get; set; } = string.Empty;
    public int QuestionType { get; set; }
    public List<AnswerResponseDto> Answers { get; set; } = new();
}

public class AnswerResponseDto
{
    public Guid Id { get; set; }
    public string Text { get; set; } = string.Empty;
    public bool IsCorrect { get; set; }
}
