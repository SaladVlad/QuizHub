
namespace QuizService.Api.Domain.Entities;

public enum Difficulty
{
    Easy = 1,
    Medium = 2,
    Hard = 3,
}

public class Quiz
{
    public Guid Id { get; set; }
    public required string Title { get; set; }
    public string? Description { get; set; }
    public required string Category { get; set; }
    public Difficulty Difficulty { get; set; }
    public int TimeLimitSeconds { get; set; }
    public Guid CreatedByUserId { get; set; }
}

