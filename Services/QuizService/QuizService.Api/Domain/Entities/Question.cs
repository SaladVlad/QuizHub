namespace QuizService.Api.Domain.Entities;

public enum QuestionType
{
    Single,
    Multiple,
    TrueFalse,
    FillIn
}

public class Question
{
    public Guid Id { get; set; }
    public Guid QuizId { get; set; }
    public string Text { get; set; }
    public QuestionType QuestionType { get; set; }
    public ICollection<Answer> Answers { get; set; }
}
