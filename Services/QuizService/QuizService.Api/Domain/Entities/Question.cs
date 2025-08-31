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
    public required string Text { get; set; }
    public QuestionType QuestionType { get; set; }
    public int Points { get; set; } = 1;
    public bool IsCaseSensitive { get; set; }
    public string? Explanation { get; set; }
    public int Order { get; set; }
    public required ICollection<Answer> Answers { get; set; } = new List<Answer>();
}
