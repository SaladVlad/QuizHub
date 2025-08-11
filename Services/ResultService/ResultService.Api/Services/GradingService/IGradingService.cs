using ResultService.Api.Domain.Entities;
using ResultService.Api.Dtos.Requests;

namespace ResultService.Api.Services.GradingService;

public interface IGradingService
{
    Task<GradingResult> GradeQuizAttemptAsync(SubmitResultRequestDto submitResultDto);
}

public class GradingResult
{
    public bool Success { get; set; }
    public float TotalScore { get; set; }
    public float MaxPossibleScore { get; set; }
    public List<GradedQuestion> GradedQuestions { get; set; } = new();
    public string? ErrorMessage { get; set; }
}

public class GradedQuestion
{
    public Guid QuestionId { get; set; }
    public float PointsAwarded { get; set; }
    public float MaxPoints { get; set; }
    public bool IsCorrect { get; set; }
    public string? Explanation { get; set; }
    public List<GradedAnswer> GradedAnswers { get; set; } = new();
}

public class GradedAnswer
{
    public Guid AnswerId { get; set; }
    public string? GivenAnswer { get; set; }
    public bool IsCorrect { get; set; }
    public float PointsAwarded { get; set; }
    public string? Explanation { get; set; }
}
