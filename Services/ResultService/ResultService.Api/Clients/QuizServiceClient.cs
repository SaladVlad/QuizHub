using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Options;
using ResultService.Api.Clients;
using ResultService.Api.Common;
using ResultService.Api.Dtos.Quiz;
using ResultService.Api.Dtos.Responses;
using ResultService.Api.Options;

namespace ResultService.Api.Clients;

public class QuizServiceClient : IQuizServiceClient
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<QuizServiceClient> _logger;
    private readonly QuizServiceOptions _options;

    public QuizServiceClient(
        HttpClient httpClient, 
        IOptions<QuizServiceOptions> options,
        ILogger<QuizServiceClient> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
        _options = options.Value;
        
        // Configure the base address from options
        _httpClient.BaseAddress = new Uri(_options.BaseUrl);
    }

    public async Task<ServiceResult<QuizWithQuestionsDto>> GetQuizWithQuestionsAsync(Guid quizId)
    {
        try
        {
            var response = await _httpClient.GetAsync($"api/quizzes/{quizId}/with-questions");
            response.EnsureSuccessStatusCode();

            var content = await response.Content.ReadAsStringAsync();
            var options = new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            };

            var result = JsonSerializer.Deserialize<ServiceResult<QuizWithQuestionsDto>>(content, options);
            if (result == null)
            {
                return ServiceResult<QuizWithQuestionsDto>.FailureResult("Failed to deserialize quiz data");
            }

            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving quiz with questions");
            return ServiceResult<QuizWithQuestionsDto>.FailureResult(ex.Message);
        }
    }

    public async Task<QuizDto?> GetQuizAsync(Guid quizId)
    {
        try
        {
            var response = await _httpClient.GetAsync($"api/quizzes/{quizId}");
            
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Failed to get quiz {QuizId}. Status: {StatusCode}", quizId, response.StatusCode);
                return null;
            }

            var content = await response.Content.ReadAsStringAsync();
            var options = new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            };

            var quiz = JsonSerializer.Deserialize<QuizDto>(content, options);
            return quiz;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting quiz {QuizId}", quizId);
            return null;
        }
    }

    public async Task<Dictionary<Guid, QuizDto>> GetQuizzesBatchAsync(IEnumerable<Guid> quizIds)
    {
        var result = new Dictionary<Guid, QuizDto>();
        
        if (!quizIds.Any())
        {
            return result;
        }

        foreach (var quizId in quizIds.Distinct())
        {
            var quiz = await GetQuizAsync(quizId);
            if (quiz != null)
            {
                result[quizId] = quiz;
            }
        }
        
        return result;
    }
}

