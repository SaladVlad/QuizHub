namespace ResultService.Api.Dtos.Quiz;

public class QuizDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Category { get; set; }
    public int? Difficulty { get; set; }
    public int? TimeLimitSeconds { get; set; }
}