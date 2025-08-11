using Microsoft.EntityFrameworkCore;
using ResultService.Api.Data;
using ResultService.Api.Dtos.Responses;
using ResultService.Api.Dtos.Results;
using ResultService.Api.Services.UserService;
using ResultService.Api.Dtos.User;

namespace ResultService.Api.Services.LeaderboardService;

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

            // Get all results
            var allResults = await _context.Results.ToListAsync();

            // Group by user and quiz, then take the best score for each quiz
            var bestScoresPerQuiz = allResults
                .GroupBy(r => new { r.UserId, r.QuizId })
                .Select(g => g.OrderByDescending(r => r.Score)
                             .ThenBy(r => r.TimeTakenSeconds)
                             .First())
                .ToList();

            // Calculate total score per user by summing their best scores from each quiz
            var userTotalScores = bestScoresPerQuiz
                .GroupBy(r => r.UserId)
                .Select(g => new {
                    UserId = g.Key,
                    TotalScore = g.Sum(r => r.Score),
                    // For display purposes, we'll use the most recent completion time
                    LastCompleted = g.Max(r => r.CompletedAt),
                    // Count of unique quizzes taken
                    QuizzesTaken = g.Count()
                })
                .OrderByDescending(x => x.TotalScore)
                .ThenBy(x => x.LastCompleted) // In case of tie, earlier completion ranks higher
                .Take(top)
                .ToList();

            var leaderboard = new QuizLeaderboardDto
            {
                QuizId = Guid.Empty,
                QuizTitle = "Global Leaderboard",
                Entries = new List<LeaderboardEntryDto>()
            };

            // Get all user IDs to fetch in batch
            var userIds = userTotalScores.Select(x => x.UserId).ToList();
            var users = await _userServiceClient.GetUsersBatchAsync(userIds);
            
            var rank = 1;
            foreach (var userScore in userTotalScores)
            {
                // Try to get user details from the batch, fall back to just the ID if not found
                var user = users.GetValueOrDefault(userScore.UserId);
                var userName = user?.DisplayName ?? $"User {userScore.UserId.ToString().Substring(0, 8)}";
                
                leaderboard.Entries.Add(new LeaderboardEntryDto
                {
                    Rank = rank++,
                    UserId = userScore.UserId,
                    UserName = userName,
                    UserEmail = user?.Email,
                    Score = userScore.TotalScore,
                    // For global leaderboard, time taken doesn't make sense, so we'll show quizzes taken
                    TimeTakenSeconds = userScore.QuizzesTaken,
                    CompletedAt = userScore.LastCompleted
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
            
            // Get all results for this quiz
            var quizResults = await _context.Results
                .Where(r => r.QuizId == quizId)
                .ToListAsync();

            // Get the best score per user for this quiz
            var bestScores = quizResults
                .GroupBy(r => r.UserId)
                .Select(g => g.OrderByDescending(r => r.Score)
                            .ThenBy(r => r.TimeTakenSeconds)
                            .ThenBy(r => r.CompletedAt)
                            .First())
                .OrderByDescending(r => r.Score)
                .ThenBy(r => r.TimeTakenSeconds)
                .ThenBy(r => r.CompletedAt)
                .Take(top)
                .ToList();

            var leaderboard = new QuizLeaderboardDto
            {
                QuizId = quizId,
                QuizTitle = await GetQuizTitleAsync(quizId) ?? "Quiz",
                Entries = new List<LeaderboardEntryDto>()
            };

            // Get all user IDs to fetch in batch
            var userIds = bestScores.Select(r => r.UserId).ToList();
            var users = await _userServiceClient.GetUsersBatchAsync(userIds);
            
            var rank = 1;
            foreach (var best in bestScores)
            {
                // Try to get user details from the batch, fall back to just the ID if not found
                var user = users.GetValueOrDefault(best.UserId);
                var userName = user?.DisplayName ?? $"User {best.UserId.ToString().Substring(0, 8)}";
                
                leaderboard.Entries.Add(new LeaderboardEntryDto
                {
                    Rank = rank++,
                    UserId = best.UserId,
                    UserName = userName,
                    UserEmail = user?.Email,
                    Score = best.Score,
                    TimeTakenSeconds = best.TimeTakenSeconds,
                    CompletedAt = best.CompletedAt
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
            return Task.FromResult(ServiceResult<List<QuizLeaderboardDto>>.FailureResult("Leaderboard by category is not implemented yet", 501));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving leaderboard for category {Category}", category);
            return Task.FromResult(ServiceResult<List<QuizLeaderboardDto>>.FailureResult("An error occurred while retrieving the category leaderboard", 500));
        }
    }

    // GetUserNameAsync method has been removed as we now use IUserServiceClient

    private async Task<string?> GetQuizTitleAsync(Guid quizId)
    {
        try
        {
            return await Task.FromResult($"Quiz {quizId.ToString().Substring(0, 8)}");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving quiz title for {QuizId}", quizId);
            return null;
        }
    }
}
