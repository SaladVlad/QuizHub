namespace ResultService.Api.Domain.Entities;

public class ResultAnswer
{
    public Guid Id { get; set; }
    public Guid ResultId { get; set; }
    public Guid QuestionId { get; set; }
    public string GivenAnswer { get; set; }
}
