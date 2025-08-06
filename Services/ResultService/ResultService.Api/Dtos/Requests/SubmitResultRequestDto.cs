namespace ResultService.Api.Dtos.Requests;

public class SubmitResultRequestDto
{
    public required Guid QuizId { get; set; }
    public required float Score { get; set; }
    public required int TimeTakenSeconds { get; set; }
    public required List<ResultAnswerDto> Answers { get; set; }
}

public class ResultAnswerDto
{
    public required Guid QuestionId { get; set; }
    public required string GivenAnswer { get; set; }
}
