using Microsoft.EntityFrameworkCore;
using ResultService.Api.Clients;
using ResultService.Api.Data;
using ResultService.Api.Domain.Entities;
using ResultService.Api.Dtos.Requests;
using ResultService.Api.Dtos.Responses;
using ResultService.Api.Dtos.Results;
using ResultService.Api.Services.GradingService;

namespace ResultService.Api.Services.ResultService;

public class ResultService : IResultService
{
    private readonly ResultDbContext _context;
    private readonly ILogger<ResultService> _logger;
    private readonly IGradingService _gradingService;

    public ResultService(
        ResultDbContext context,
        ILogger<ResultService> logger,
        IGradingService gradingService)
    {
        _context = context;
        _logger = logger;
        _gradingService = gradingService;
    }

    public async Task<ServiceResult<ResultResponseDto>> SubmitQuizResultAsync(SubmitResultRequestDto submitResultDto, Guid userId)
    {
        try
        {
            _logger.LogInformation("[ResultService] SubmitQuizResultAsync: Start. UserId={UserId}, QuizId={QuizId}, TimeTakenSeconds={Time}, AnswersCount={Count}, Score={Score}",
                userId, submitResultDto.QuizId, submitResultDto.TimeTakenSeconds, submitResultDto.Answers?.Count, submitResultDto.Score);

            // Validate the request
            if (submitResultDto.Answers == null || !submitResultDto.Answers.Any())
            {
                _logger.LogWarning("[ResultService] Validation failed: No answers provided");
                return ServiceResult<ResultResponseDto>.FailureResult("No answers provided", 400);
            }

            if (submitResultDto.TimeTakenSeconds <= 0)
            {
                _logger.LogWarning("[ResultService] Validation failed: Invalid time taken {Time}", submitResultDto.TimeTakenSeconds);
                return ServiceResult<ResultResponseDto>.FailureResult("Invalid time taken", 400);
            }

            // Grade the quiz attempt
            var gradingResult = await _gradingService.GradeQuizAttemptAsync(submitResultDto);
            if (!gradingResult.Success)
            {
                _logger.LogWarning("[ResultService] Grading failed: {Message}", gradingResult.ErrorMessage);
                return ServiceResult<ResultResponseDto>.FailureResult(
                    $"Failed to grade quiz: {gradingResult.ErrorMessage}", 400);
            }

            // Validate that the score is not higher than max possible score
            if (gradingResult.TotalScore > gradingResult.MaxPossibleScore)
            {
                _logger.LogWarning("[ResultService] Invalid score: {Score} > {MaxScore}", 
                    gradingResult.TotalScore, gradingResult.MaxPossibleScore);
                return ServiceResult<ResultResponseDto>.FailureResult(
                    "Invalid score: Score cannot be greater than maximum possible score", 400);
            }

            _logger.LogInformation("[ResultService] Grading succeeded: TotalScore={Total}, MaxPossibleScore={Max}, Questions={Q}",
                gradingResult.TotalScore, gradingResult.MaxPossibleScore, gradingResult.GradedQuestions?.Count);

            // Create a new result
            var result = new Result
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                QuizId = submitResultDto.QuizId,
                Score = gradingResult.TotalScore,
                MaxPossibleScore = gradingResult.MaxPossibleScore,
                TimeTakenSeconds = submitResultDto.TimeTakenSeconds,
                CompletedAt = DateTime.UtcNow,
                ResultAnswers = submitResultDto.Answers.Select(a => new ResultAnswer
                {
                    Id = Guid.NewGuid(),
                    QuestionId = a.QuestionId,
                    GivenAnswer = a.GivenAnswer,
                    PointsAwarded = gradingResult.GradedQuestions?
                        .FirstOrDefault(gq => gq.QuestionId == a.QuestionId)?.PointsAwarded ?? 0,
                    IsCorrect = gradingResult.GradedQuestions?
                        .FirstOrDefault(gq => gq.QuestionId == a.QuestionId)?.IsCorrect ?? false
                }).ToList()
            };

            // Save the result
            await _context.Results.AddAsync(result);
            _logger.LogInformation("[ResultService] Persisting result: ResultId={ResultId}, AnswersSaved={Count}", result.Id, result.ResultAnswers.Count);
            await _context.SaveChangesAsync();

            // Map to DTO and return
            var resultDto = MapToResultResponse(result);
            _logger.LogInformation("[ResultService] SubmitQuizResultAsync: Success. ResultId={ResultId}", resultDto.Id);
            return ServiceResult<ResultResponseDto>.SuccessResult(resultDto, 201);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error submitting quiz result for user {UserId}", userId);
            return ServiceResult<ResultResponseDto>.FailureResult("An error occurred while submitting the quiz result", 500);
        }
    }

    public async Task<ServiceResult<ResultResponseDto>> GetResultByIdAsync(Guid id, Guid userId)
    {
        try
        {
            var result = await _context.Results
                .Include(r => r.ResultAnswers)
                .FirstOrDefaultAsync(r => r.Id == id);

            if (result == null)
            {
                return ServiceResult<ResultResponseDto>.FailureResult("Result not found", 404);
            }

            // Only allow the user who created the result or an admin to view it
            if (result.UserId != userId && !await IsUserAdmin(userId))
            {
                return ServiceResult<ResultResponseDto>.FailureResult("You are not authorized to view this result", 403);
            }

            var resultDto = MapToResultResponse(result);
            return ServiceResult<ResultResponseDto>.SuccessResult(resultDto);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving result with ID {ResultId}", id);
            return ServiceResult<ResultResponseDto>.FailureResult("An error occurred while retrieving the result", 500);
        }
    }

    public async Task<ServiceResult<List<ResultResponseDto>>> GetUserResultsAsync(Guid userId, int page = 1, int pageSize = 10)
    {
        try
        {
            if (page < 1) page = 1;
            if (pageSize < 1 || pageSize > 100) pageSize = 10;

            var results = await _context.Results
                .Where(r => r.UserId == userId)
                .OrderByDescending(r => r.CompletedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Include(r => r.ResultAnswers)
                .ToListAsync();

            var resultDtos = results.Select(MapToResultResponse).ToList();
            return ServiceResult<List<ResultResponseDto>>.SuccessResult(resultDtos);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving results for user {UserId}", userId);
            return ServiceResult<List<ResultResponseDto>>.FailureResult("An error occurred while retrieving the results", 500);
        }
    }

    public async Task<ServiceResult<List<ResultResponseDto>>> GetQuizResultsAsync(Guid quizId, int page = 1, int pageSize = 10)
    {
        try
        {
            if (page < 1) page = 1;
            if (pageSize < 1 || pageSize > 100) pageSize = 10;

            var results = await _context.Results
                .Where(r => r.QuizId == quizId)
                .OrderByDescending(r => r.Score)
                .ThenBy(r => r.TimeTakenSeconds)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Include(r => r.ResultAnswers)
                .ToListAsync();

            var resultDtos = results.Select(MapToResultResponse).ToList();
            return ServiceResult<List<ResultResponseDto>>.SuccessResult(resultDtos);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving results for quiz {QuizId}", quizId);
            return ServiceResult<List<ResultResponseDto>>.FailureResult("An error occurred while retrieving the quiz results", 500);
        }
    }

    public async Task<ServiceResult<UserStatsDto>> GetUserStatsAsync(Guid userId)
    {
        try
        {
            var userResults = await _context.Results
                .Where(r => r.UserId == userId)
                .ToListAsync();

            if (!userResults.Any())
            {
                return ServiceResult<UserStatsDto>.FailureResult("No results found for user", 404);
            }

            var userName = await GetUserNameAsync(userId) ?? "Unknown User";
            var totalQuizzes = userResults.Count;
            var totalScore = userResults.Sum(r => r.Score);
            var averageScore = userResults.Average(r => r.Score);
            var bestScore = userResults.Max(r => r.Score);
            var averageTime = TimeSpan.FromSeconds(userResults.Average(r => r.TimeTakenSeconds));

            var stats = new UserStatsDto
            {
                UserId = userId,
                UserName = userName,
                TotalQuizzesTaken = totalQuizzes,
                TotalScore = totalScore,
                AverageScore = Math.Round(averageScore, 2),
                BestScore = bestScore,
                AverageTimePerQuiz = averageTime
            };

            return ServiceResult<UserStatsDto>.SuccessResult(stats);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving stats for user {UserId}", userId);
            return ServiceResult<UserStatsDto>.FailureResult("An error occurred while retrieving user stats", 500);
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

    private async Task<bool> IsUserAdmin(Guid userId)
    {
        try
        {
            // This would typically call the UserService to check if the user is an admin
            // For now, we'll return false
            return await Task.FromResult(false);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking if user {UserId} is admin", userId);
            return false;
        }
    }

    private static ResultResponseDto MapToResultResponse(Result result)
    {
        return new ResultResponseDto
        {
            Id = result.Id,
            UserId = result.UserId,
            QuizId = result.QuizId,
            Score = result.Score,
            MaxPossibleScore = result.MaxPossibleScore,
            TimeTakenSeconds = result.TimeTakenSeconds,
            CompletedAt = result.CompletedAt,
            Answers = result.ResultAnswers?.Select(a => new ResultAnswerResponseDto
            {
                Id = a.Id,
                QuestionId = a.QuestionId,
                GivenAnswer = a.GivenAnswer,
                PointsAwarded = a.PointsAwarded,
                IsCorrect = a.IsCorrect
            }).ToList() ?? new List<ResultAnswerResponseDto>()
        };
    }
}
