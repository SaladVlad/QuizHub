namespace ResultService.Api.Domain.Entities;

public class ResultAnswer
{
    public Guid Id { get; set; }
    public Guid ResultId { get; set; }
    public Guid QuestionId { get; set; }
    public required string GivenAnswer { get; set; }
    public float PointsAwarded { get; set; }
    public bool IsCorrect { get; set; }
    public virtual Result? Result { get; set; }
}
