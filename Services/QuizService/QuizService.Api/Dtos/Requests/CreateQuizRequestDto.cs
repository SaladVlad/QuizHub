namespace QuizService.Api.Dtos.Requests;

public class CreateQuizRequestDto
{
    public required string Title { get; set; }
    public string? Description { get; set; }
    public required string Category { get; set; }
    public int Difficulty { get; set; }
    public int TimeLimitSeconds { get; set; }
    public required List<CreateQuestionRequestDto> Questions { get; set; }
}

public class CreateQuestionRequestDto
{
    public required string Text { get; set; }
    public int QuestionType { get; set; }
    public required List<CreateAnswerRequestDto> Answers { get; set; }
}

public class CreateAnswerRequestDto
{
    public required string Text { get; set; }
    public bool IsCorrect { get; set; }
}
