namespace ResultService.Api.Dtos.Responses;

public class ResultResponseDto
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public Guid QuizId { get; set; }
    public float Score { get; set; }
    public float MaxPossibleScore { get; set; }
    public double PercentageScore => MaxPossibleScore > 0 ? (double)Score / MaxPossibleScore * 100 : 0;
    public int TimeTakenSeconds { get; set; }
    public DateTime CompletedAt { get; set; }
    public List<ResultAnswerResponseDto> Answers { get; set; } = new();
    public bool Passed { get; set; }
    public double? PassingScore { get; set; }
}

public class ResultAnswerResponseDto
{
    public Guid Id { get; set; }
    public Guid QuestionId { get; set; }
    public string GivenAnswer { get; set; } = string.Empty;
    public float PointsAwarded { get; set; }
    public bool IsCorrect { get; set; }
    public string? Explanation { get; set; }
}

public class LeaderboardEntryDto
{
    public int Rank { get; set; }
    public Guid UserId { get; set; }
    public string UserName { get; set; } = string.Empty;
    public float Score { get; set; }
    public int TimeTakenSeconds { get; set; }
    public DateTime CompletedAt { get; set; }
}

public class QuizLeaderboardDto
{
    public Guid QuizId { get; set; }
    public string QuizTitle { get; set; } = string.Empty;
    public List<LeaderboardEntryDto> Entries { get; set; } = new();
}

public class UserStatsDto
{
    public Guid UserId { get; set; }
    public string UserName { get; set; } = string.Empty;
    public int TotalQuizzesTaken { get; set; }
    public float TotalScore { get; set; }
    public double AverageScore { get; set; }
    public float BestScore { get; set; }
    public TimeSpan AverageTimePerQuiz { get; set; }
}
