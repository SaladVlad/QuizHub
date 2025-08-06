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
    public int Points { get; set; } = 1; // Default points for the question
    public bool IsCaseSensitive { get; set; } // For FillIn questions
    public string? Explanation { get; set; } // Optional explanation for the answer
    public int Order { get; set; } // Order of the question in the quiz
    public required ICollection<Answer> Answers { get; set; } = new List<Answer>();
}
