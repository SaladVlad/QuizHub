namespace QuizService.Api.Domain.Entities;

public class Answer
{
    public Guid Id { get; set; }
    public Guid QuestionId { get; set; }
    public required string Text { get; set; }
    public bool IsCorrect { get; set; }
    public int Order { get; set; } // For ordering answers in the UI
    public string? Explanation { get; set; } // Optional explanation for this specific answer
    public float PartialCredit { get; set; } = 1.0f; // For partial credit in multiple answer questions
    
    // Navigation property
    public virtual Question? Question { get; set; }
}
