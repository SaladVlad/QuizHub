using System.Net;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using ResultService.Api.Common;
using ResultService.Api.Dtos.User;
using ResultService.Api.Options;
using Microsoft.AspNetCore.Http;

namespace ResultService.Api.Services.UserService;

public class UserServiceClient : IUserServiceClient
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<UserServiceClient> _logger;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly JsonSerializerOptions _jsonOptions;

    public UserServiceClient(
        IHttpClientFactory httpClientFactory,
        ILogger<UserServiceClient> logger,
        IOptions<JsonSerializerOptions> jsonOptions,
        IHttpContextAccessor httpContextAccessor)
    {
        _httpClientFactory = httpClientFactory;
        _logger = logger;
        _httpContextAccessor = httpContextAccessor;
        _jsonOptions = jsonOptions.Value;
    }
    
    private HttpClient GetAuthenticatedClient()
    {
        var client = _httpClientFactory.CreateClient("UserService");
        
        // Get the current user's JWT token from the Authorization header
        var httpContext = _httpContextAccessor.HttpContext;
        if (httpContext?.Request.Headers.Authorization.Any() == true)
        {
            var token = httpContext.Request.Headers.Authorization.ToString();
            if (!string.IsNullOrEmpty(token) && token.StartsWith("Bearer "))
            {
                client.DefaultRequestHeaders.Authorization = 
                    new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token["Bearer ".Length..]);
            }
        }
        
        return client;
    }

    public async Task<UserDto?> GetUserAsync(Guid userId)
    {
        try
        {
            var client = GetAuthenticatedClient();
            var response = await client.GetAsync($"api/users/{userId}");
            
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Failed to get user {UserId}. Status: {StatusCode}", userId, response.StatusCode);
                return null;
            }
            
            var content = await response.Content.ReadAsStringAsync();
            
            try
            {
                // First try to deserialize as a direct UserDto
                var user = JsonSerializer.Deserialize<UserDto>(content, _jsonOptions);
                if (user != null)
                {
                    return user;
                }
                
                // If that fails, try to deserialize as a ServiceResult<UserDto>
                var result = JsonSerializer.Deserialize<ServiceResult<UserDto>>(content, _jsonOptions);
                if (result?.Success == true && result.Data != null)
                {
                    return result.Data;
                }
                
                _logger.LogWarning("Failed to deserialize user {UserId}. Response: {Response}", userId, content);
            }
            catch (JsonException jsonEx)
            {
                _logger.LogError(jsonEx, "Error deserializing user {UserId}. Response: {Response}", userId, content);
            }
            
            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting user {UserId}", userId);
            return null;
        }
    }

    public async Task<Dictionary<Guid, UserDto>> GetUsersBatchAsync(IEnumerable<Guid> userIds)
    {
        var result = new Dictionary<Guid, UserDto>();
        
        if (!userIds.Any())
        {
            return result;
        }

        // Process each user ID individually since batch endpoint is not available
        foreach (var userId in userIds.Distinct())
        {
            try
            {
                var client = GetAuthenticatedClient();
                var response = await client.GetAsync($"api/users/{userId}");
                
                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning("Failed to get user {UserId}. Status: {StatusCode}", userId, response.StatusCode);
                    continue;
                }
                
                var content = await response.Content.ReadAsStringAsync();
                
                try
                {
                    // First try to deserialize as a direct UserDto
                    var user = JsonSerializer.Deserialize<UserDto>(content, _jsonOptions);
                    if (user != null)
                    {
                        result[userId] = user;
                        continue;
                    }
                    
                    // If that fails, try to deserialize as a ServiceResult<UserDto>
                    var serviceResult = JsonSerializer.Deserialize<ServiceResult<UserDto>>(content, _jsonOptions);
                    if (serviceResult?.Success == true && serviceResult.Data != null)
                    {
                        result[userId] = serviceResult.Data;
                        continue;
                    }
                    
                    _logger.LogWarning("Failed to deserialize user {UserId}. Response: {Response}", userId, content);
                }
                catch (JsonException jsonEx)
                {
                    _logger.LogError(jsonEx, "Error deserializing user {UserId}. Response: {Response}", userId, content);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting user {UserId}", userId);
            }
        }
        
        return result;
    }
}
