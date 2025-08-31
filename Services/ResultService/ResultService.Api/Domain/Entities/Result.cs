namespace ResultService.Api.Domain.Entities;

public class Result
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public Guid QuizId { get; set; }
    public float Score { get; set; }
    public float MaxPossibleScore { get; set; }
    public int TimeTakenSeconds { get; set; }
    public DateTime CompletedAt { get; set; }
    public required ICollection<ResultAnswer> ResultAnswers { get; set; } = new List<ResultAnswer>();
}
