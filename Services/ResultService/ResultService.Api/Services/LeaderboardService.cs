using Microsoft.EntityFrameworkCore;
using ResultService.Api.Data;
using ResultService.Api.Dtos.Responses;
using ResultService.Api.Dtos.Results;

namespace ResultService.Api.Services;

public class LeaderboardService : ILeaderboardService
{
    private readonly ResultDbContext _context;
    private readonly ILogger<LeaderboardService> _logger;
    private readonly IUserServiceClient _userServiceClient;

    public LeaderboardService(
        ResultDbContext context,
        ILogger<LeaderboardService> logger,
        IUserServiceClient userServiceClient)
    {
        _context = context;
        _logger = logger;
        _userServiceClient = userServiceClient;
    }

    public async Task<ServiceResult<QuizLeaderboardDto>> GetGlobalLeaderboardAsync(int top = 100)
    {
        try
        {
            if (top < 1 || top > 1000) top = 100;

            // Get the top results across all quizzes
            var topResults = await _context.Results
                .GroupBy(r => r.UserId)
                .Select(g => new
                {
                    UserId = g.Key,
                    BestScore = g.Max(r => r.Score),
                    BestTime = g.Where(r => r.Score == g.Max(r2 => r2.Score))
                              .Min(r => r.TimeTakenSeconds),
                    LastCompleted = g.Max(r => r.CompletedAt)
                })
                .OrderByDescending(x => x.BestScore)
                .ThenBy(x => x.BestTime)
                .Take(top)
                .ToListAsync();

            // Map to DTO
            var leaderboard = new QuizLeaderboardDto
            {
                QuizId = Guid.Empty,
                QuizTitle = "Global Leaderboard",
                Entries = new List<LeaderboardEntryDto>()
            };

            // Get user names (in a real app, this would be a batch call to UserService)
            var rank = 1;
            foreach (var result in topResults)
            {
                var userName = await GetUserNameAsync(result.UserId) ?? "Unknown User";
                leaderboard.Entries.Add(new LeaderboardEntryDto
                {
                    Rank = rank++,
                    UserId = result.UserId,
                    UserName = userName,
                    Score = result.BestScore,
                    TimeTakenSeconds = result.BestTime,
                    CompletedAt = result.LastCompleted
                });
            }

            return ServiceResult<QuizLeaderboardDto>.SuccessResult(leaderboard);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving global leaderboard");
            return ServiceResult<QuizLeaderboardDto>.FailureResult("An error occurred while retrieving the global leaderboard", 500);
        }
    }

    public async Task<ServiceResult<QuizLeaderboardDto>> GetQuizLeaderboardAsync(Guid quizId, int top = 100)
    {
        try
        {
            if (top < 1 || top > 1000) top = 100;

            // Get the top results for the specified quiz
            var topResults = await _context.Results
                .Where(r => r.QuizId == quizId)
                .GroupBy(r => r.UserId)
                .Select(g => new
                {
                    UserId = g.Key,
                    BestScore = g.Max(r => r.Score),
                    BestTime = g.Where(r => r.Score == g.Max(r2 => r2.Score))
                              .Min(r => r.TimeTakenSeconds),
                    LastCompleted = g.Max(r => r.CompletedAt)
                })
                .OrderByDescending(x => x.BestScore)
                .ThenBy(x => x.BestTime)
                .Take(top)
                .ToListAsync();

            // Map to DTO
            var leaderboard = new QuizLeaderboardDto
            {
                QuizId = quizId,
                QuizTitle = await GetQuizTitleAsync(quizId) ?? "Quiz",
                Entries = new List<LeaderboardEntryDto>()
            };

            // Get user names (in a real app, this would be a batch call to UserService)
            var rank = 1;
            foreach (var result in topResults)
            {
                var userName = await GetUserNameAsync(result.UserId) ?? "Unknown User";
                leaderboard.Entries.Add(new LeaderboardEntryDto
                {
                    Rank = rank++,
                    UserId = result.UserId,
                    UserName = userName,
                    Score = result.BestScore,
                    TimeTakenSeconds = result.BestTime,
                    CompletedAt = result.LastCompleted
                });
            }

            return ServiceResult<QuizLeaderboardDto>.SuccessResult(leaderboard);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving leaderboard for quiz {QuizId}", quizId);
            return ServiceResult<QuizLeaderboardDto>.FailureResult("An error occurred while retrieving the quiz leaderboard", 500);
        }
    }

    public Task<ServiceResult<List<QuizLeaderboardDto>>> GetLeaderboardByCategoryAsync(string category, int top = 100)
    {
        try
        {
            if (top < 1 || top > 100) top = 100;

            // In a real implementation, we would query the QuizService to get quizzes by category
            // For now, we'll return a not implemented response
            return Task.FromResult(ServiceResult<List<QuizLeaderboardDto>>.FailureResult("Leaderboard by category is not implemented yet", 501));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving leaderboard for category {Category}", category);
            return Task.FromResult(ServiceResult<List<QuizLeaderboardDto>>.FailureResult("An error occurred while retrieving the category leaderboard", 500));
        }
    }

    private async Task<string?> GetUserNameAsync(Guid userId)
    {
        try
        {
            // This would typically call the UserService to get the user's name
            // For now, we'll return a placeholder
            return await Task.FromResult($"User {userId.ToString().Substring(0, 8)}");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving user name for {UserId}", userId);
            return null;
        }
    }

    private async Task<string?> GetQuizTitleAsync(Guid quizId)
    {
        try
        {
            // This would typically call the QuizService to get the quiz title
            // For now, we'll return a placeholder
            return await Task.FromResult($"Quiz {quizId.ToString().Substring(0, 8)}");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving quiz title for {QuizId}", quizId);
            return null;
        }
    }
}
