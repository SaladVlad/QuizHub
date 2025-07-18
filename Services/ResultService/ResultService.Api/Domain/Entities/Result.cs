namespace ResultService.Api.Domain.Entities;
public class Result
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public Guid QuizId { get; set; }
    public int Score { get; set; }
    public int TimeTakenSeconds { get; set; }
    public DateTime CompletedAt { get; set; }

    public ICollection<ResultAnswer> ResultAnswers { get; set; }
}
