using QuizService.Api.Domain.Entities;

namespace QuizService.Api.Dtos.Responses;

public class QuizWithQuestionsDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Category { get; set; } = string.Empty;
    public Difficulty Difficulty { get; set; }
    public int TimeLimitSeconds { get; set; }
    public Guid CreatedByUserId { get; set; }
    public ICollection<QuestionDto> Questions { get; set; } = new List<QuestionDto>();
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
    public ICollection<AnswerDto> Answers { get; set; } = new List<AnswerDto>();
}

public class AnswerDto
{
    public Guid Id { get; set; }
    public string Text { get; set; } = string.Empty;
    public bool IsCorrect { get; set; }
}
