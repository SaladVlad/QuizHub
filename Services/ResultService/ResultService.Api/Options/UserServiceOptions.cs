namespace ResultService.Api.Options;

public class UserServiceOptions
{
    public const string SectionName = "UserService";
    
    public string BaseUrl { get; set; } = string.Empty;
    public int TimeoutSeconds { get; set; } = 30;
    public int MaxRetryAttempts { get; set; } = 3;
}
