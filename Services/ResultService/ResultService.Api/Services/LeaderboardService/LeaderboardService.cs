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
            _logger.LogInformation("Retrieved {Count} total results from database", allResults.Count);

            var bestScoresPerQuiz = allResults
                .GroupBy(r => new { r.UserId, r.QuizId })
                .Select(g => g.OrderByDescending(r => r.Score)
                             .ThenBy(r => r.TimeTakenSeconds)
                             .First())
                .ToList();

            var userTotalScores = bestScoresPerQuiz
                .GroupBy(r => r.UserId)
                .Select(g => new
                {
                    UserId = g.Key,
                    TotalScore = g.Sum(r => r.Score),
                    LastCompleted = g.Max(r => r.CompletedAt),
                    QuizzesTaken = g.Count()
                })
                .OrderByDescending(x => x.TotalScore)
                .ThenBy(x => x.LastCompleted) // In case of tie, earlier completion ranks higher
                .Take(top)
                .ToList();

            _logger.LogInformation("Processing leaderboard for {UserCount} unique users", userTotalScores.Count);

            var leaderboard = new QuizLeaderboardDto
            {
                QuizId = Guid.Empty,
                QuizTitle = "Global Leaderboard",
                Entries = new List<LeaderboardEntryDto>()
            };

            // Get all user IDs to fetch in batch
            var userIds = userTotalScores.Select(x => x.UserId).ToList();
            _logger.LogInformation("Fetching user details for user IDs: {UserIds}", string.Join(", ", userIds));

            var users = await _userServiceClient.GetUsersBatchAsync(userIds);
            _logger.LogInformation("Received {UserCount} user details from user service", users?.Count ?? 0);

            if (users != null && users.Any())
            {
                // Log the first user's properties to see what we're working with
                var firstUser = users.First();
                _logger.LogInformation("First user details - Key: {Key}, Value: {Value}", 
                    firstUser.Key, 
                    firstUser.Value != null ? "Not null" : "NULL");

                if (firstUser.Value != null)
                {
                    var props = firstUser.Value.GetType().GetProperties();
                    _logger.LogInformation("First user properties: {Properties}", 
                        string.Join(", ", props.Select(p => $"{p.Name}")));
                    
                    _logger.LogInformation("First user values: {Values}", 
                        string.Join(", ", props.Select(p => $"{p.Name}={p.GetValue(firstUser.Value) ?? "null"}")));
                }

                // Log null or problematic users
                var nullUsers = users.Where(u => u.Value == null).ToList();
                if (nullUsers.Any())
                {
                    _logger.LogWarning("Found {Count} null user objects for IDs: {UserIds}", 
                        nullUsers.Count, 
                        string.Join(", ", nullUsers.Select(u => u.Key)));
                }
            }
            else if (users == null)
            {
                _logger.LogError("Users dictionary is null");
            }
            else
            {
                _logger.LogWarning("Users dictionary is empty");
            }

            var rank = 1;
            foreach (var userScore in userTotalScores)
            {
                // Try to get user details from the batch, fall back to just the ID if not found
                var user = users?.GetValueOrDefault(userScore.UserId);
                var displayName = GetUserFullName(user) ?? $"User-{userScore.UserId.ToString().Substring(0, 4)}";

                _logger.LogInformation("User ID: {UserId}, DisplayName: {DisplayName}", 
                    userScore.UserId, displayName);

                leaderboard.Entries.Add(new LeaderboardEntryDto
                {
                    Rank = rank++,
                    UserId = userScore.UserId,
                    UserName = displayName,
                    UserEmail = user?.Email,
                    Score = userScore.TotalScore,
                    TimeTakenSeconds = userScore.QuizzesTaken, // Use this field to store quiz count for global leaderboard
                    CompletedAt = userScore.LastCompleted
                });
            }

            _logger.LogInformation("Successfully built leaderboard with {EntryCount} entries", leaderboard.Entries.Count);

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
                var userName = GetUserFullName(user) ?? $"User {best.UserId.ToString().Substring(0, 8)}";

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

    public async Task<ServiceResult<List<QuizLeaderboardDto>>> GetLeaderboardByCategoryAsync(string category, int top = 100)
    {
        try
        {
            if (top < 1 || top > 100) top = 100;

            // For now, return the global leaderboard as category-specific implementation would require
            // access to QuizService to filter by category. This is a basic implementation.
            var globalLeaderboard = await GetGlobalLeaderboardAsync(top);
            
            if (!globalLeaderboard.Success)
            {
                return ServiceResult<List<QuizLeaderboardDto>>.FailureResult(
                    globalLeaderboard.ErrorMessage ?? "Failed to get category leaderboard", 
                    globalLeaderboard.StatusCode);
            }

            // Return as a list containing the global leaderboard with category title
            var categoryLeaderboard = globalLeaderboard.Data!;
            categoryLeaderboard.QuizTitle = $"Category: {category}";
            
            return ServiceResult<List<QuizLeaderboardDto>>.SuccessResult(new List<QuizLeaderboardDto> { categoryLeaderboard });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving leaderboard for category {Category}", category);
            return ServiceResult<List<QuizLeaderboardDto>>.FailureResult("An error occurred while retrieving the category leaderboard", 500);
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

    private static string? GetUserFullName(UserDto? user)
    {
        if (user == null) return null;
        
        if (!string.IsNullOrWhiteSpace(user.FirstName) && !string.IsNullOrWhiteSpace(user.LastName))
        {
            return $"{user.FirstName} {user.LastName}".Trim();
        }
        
        if (!string.IsNullOrWhiteSpace(user.FirstName))
        {
            return user.FirstName.Trim();
        }
        
        if (!string.IsNullOrWhiteSpace(user.LastName))
        {
            return user.LastName.Trim();
        }
        
        return user.UserName?.Trim();
    }
}
