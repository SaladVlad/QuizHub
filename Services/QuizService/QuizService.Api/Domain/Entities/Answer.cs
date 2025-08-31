namespace QuizService.Api.Domain.Entities;

public class Answer
{
    public Guid Id { get; set; }
    public Guid QuestionId { get; set; }
    public required string Text { get; set; }
    public bool IsCorrect { get; set; }
    public int Order { get; set; }
    public string? Explanation { get; set; }
    public float PartialCredit { get; set; } = 1.0f;
    public virtual Question? Question { get; set; }
}
