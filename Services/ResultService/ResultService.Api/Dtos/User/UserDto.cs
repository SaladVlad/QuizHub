using System.Text.Json.Serialization;

namespace ResultService.Api.Dtos.User;

public class UserDto
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;
    
    [JsonPropertyName("userName")]
    public string UserName { get; set; } = string.Empty;
    
    [JsonPropertyName("email")]
    public string Email { get; set; } = string.Empty;
    
    [JsonPropertyName("firstName")]
    public string? FirstName { get; set; }
    
    [JsonPropertyName("lastName")]
    public string? LastName { get; set; }
    
    [JsonPropertyName("displayName")]
    public string DisplayName => !string.IsNullOrEmpty(FirstName) && !string.IsNullOrEmpty(LastName)
        ? $"{FirstName} {LastName}"
        : !string.IsNullOrEmpty(FirstName) 
            ? FirstName 
            : !string.IsNullOrEmpty(UserName) 
                ? UserName 
                : Email.Split('@')[0];
}
