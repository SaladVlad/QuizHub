namespace ResultService.Api.Dtos.Responses;

public class EnrichedResultResponseDto
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public Guid QuizId { get; set; }
    public float Score { get; set; }
    public float MaxPossibleScore { get; set; }
    public float PercentageScore => MaxPossibleScore > 0 ? (Score / MaxPossibleScore) * 100 : 0;
    public int TimeTakenSeconds { get; set; }
    public DateTime CompletedAt { get; set; }
    
    // Enriched properties
    public string? UserName { get; set; }
    public string? UserSurname { get; set; }
    public string? UserFullName => !string.IsNullOrEmpty(UserName) && !string.IsNullOrEmpty(UserSurname) 
        ? $"{UserName} {UserSurname}" 
        : UserName ?? $"User {UserId.ToString()[..8]}...";
    public string? QuizTitle { get; set; }
    public string? QuizCategory { get; set; }
    
    public List<ResultAnswerResponseDto> Answers { get; set; } = new();
}