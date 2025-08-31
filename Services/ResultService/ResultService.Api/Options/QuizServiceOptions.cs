namespace ResultService.Api.Options;

public class QuizServiceOptions
{
    public const string SectionName = "QuizService";
    
    public string BaseUrl { get; set; } = string.Empty;
    public int TimeoutSeconds { get; set; } = 30;
    public int MaxRetryAttempts { get; set; } = 3;
}
