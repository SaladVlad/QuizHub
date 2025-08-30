using Microsoft.EntityFrameworkCore;
using ResultService.Api.Clients;
using ResultService.Api.Data;
using ResultService.Api.Domain.Entities;
using ResultService.Api.Dtos.Requests;
using ResultService.Api.Dtos.Responses;
using ResultService.Api.Dtos.Results;
using ResultService.Api.Dtos.User;
using ResultService.Api.Services.GradingService;
using ResultService.Api.Services.UserService;

namespace ResultService.Api.Services.ResultService;

public class ResultService : IResultService
{
    private readonly ResultDbContext _context;
    private readonly ILogger<ResultService> _logger;
    private readonly IGradingService _gradingService;
    private readonly IUserServiceClient _userServiceClient;
    private readonly IQuizServiceClient _quizServiceClient;

    public ResultService(
        ResultDbContext context,
        ILogger<ResultService> logger,
        IGradingService gradingService,
        IUserServiceClient userServiceClient,
        IQuizServiceClient quizServiceClient)
    {
        _context = context;
        _logger = logger;
        _gradingService = gradingService;
        _userServiceClient = userServiceClient;
        _quizServiceClient = quizServiceClient;
    }

    public async Task<ServiceResult<ResultResponseDto>> SubmitQuizResultAsync(SubmitResultRequestDto submitResultDto, Guid userId)
    {
        try
        {
            if (submitResultDto.Answers == null || !submitResultDto.Answers.Any())
                return ServiceResult<ResultResponseDto>.FailureResult("No answers provided", 400);

            if (submitResultDto.TimeTakenSeconds <= 0)
                return ServiceResult<ResultResponseDto>.FailureResult("Invalid time taken", 400);

            var gradingResult = await _gradingService.GradeQuizAttemptAsync(submitResultDto);
            if (!gradingResult.Success)
                return ServiceResult<ResultResponseDto>.FailureResult($"Failed to grade quiz: {gradingResult.ErrorMessage}", 400);

            if (gradingResult.TotalScore > gradingResult.MaxPossibleScore)
                return ServiceResult<ResultResponseDto>.FailureResult("Invalid score: Score cannot be greater than maximum possible score", 400);

            var result = CreateResult(submitResultDto, userId, gradingResult);
            
            await _context.Results.AddAsync(result);
            await _context.SaveChangesAsync();

            var resultDto = MapToResultResponse(result);
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
            var (validPage, validPageSize) = ValidatePagination(page, pageSize, 10);

            var results = await _context.Results
                .Where(r => r.UserId == userId)
                .OrderByDescending(r => r.CompletedAt)
                .Skip((validPage - 1) * validPageSize)
                .Take(validPageSize)
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
            var (validPage, validPageSize) = ValidatePagination(page, pageSize, 10);

            var results = await _context.Results
                .Where(r => r.QuizId == quizId)
                .OrderByDescending(r => r.Score)
                .ThenBy(r => r.TimeTakenSeconds)
                .Skip((validPage - 1) * validPageSize)
                .Take(validPageSize)
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

    public async Task<ServiceResult<PaginatedEnrichedResultResponseDto>> GetAllResultsAsync(int page = 1, int pageSize = 20, string? search = null)
    {
        try
        {
            var (validPage, validPageSize) = ValidatePagination(page, pageSize, 20);
            var query = ApplySearchFilter(_context.Results.AsQueryable(), search);

            var totalItems = await query.CountAsync();
            var totalPages = (int)Math.Ceiling((double)totalItems / validPageSize);

            var results = await query
                .OrderByDescending(r => r.CompletedAt)
                .Skip((validPage - 1) * validPageSize)
                .Take(validPageSize)
                .Include(r => r.ResultAnswers)
                .ToListAsync();

            // Get unique user and quiz IDs
            var userIds = results.Select(r => r.UserId).Distinct().ToList();
            var quizIds = results.Select(r => r.QuizId).Distinct().ToList();

            // Batch fetch user and quiz data
            var usersTask = _userServiceClient.GetUsersBatchAsync(userIds);
            var quizzesTask = _quizServiceClient.GetQuizzesBatchAsync(quizIds);

            await Task.WhenAll(usersTask, quizzesTask);

            var users = await usersTask;
            var quizzes = await quizzesTask;

            // Map to enriched DTOs
            var enrichedResults = results.Select(r => MapToEnrichedResultResponse(r, users, quizzes)).ToList();
            
            var paginatedResponse = new PaginatedEnrichedResultResponseDto
            {
                Items = enrichedResults,
                Page = validPage,
                PageSize = validPageSize,
                TotalItems = totalItems,
                TotalPages = totalPages
            };

            return ServiceResult<PaginatedEnrichedResultResponseDto>.SuccessResult(paginatedResponse);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving all results. Page={Page}, PageSize={PageSize}, Search={Search}", page, pageSize, search);
            return ServiceResult<PaginatedEnrichedResultResponseDto>.FailureResult("An error occurred while retrieving results", 500);
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
                return ServiceResult<UserStatsDto>.FailureResult("No results found for user", 404);

            var stats = await CalculateUserStats(userId, userResults);
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

    private static (int page, int pageSize) ValidatePagination(int page, int pageSize, int defaultPageSize)
    {
        var validPage = page < 1 ? 1 : page;
        var validPageSize = pageSize < 1 || pageSize > 100 ? defaultPageSize : pageSize;
        return (validPage, validPageSize);
    }

    private static IQueryable<Result> ApplySearchFilter(IQueryable<Result> query, string? search)
    {
        if (string.IsNullOrWhiteSpace(search))
            return query;

        var searchLower = search.ToLower();
        return query.Where(r => 
            r.Id.ToString().Contains(searchLower) ||
            r.UserId.ToString().Contains(searchLower) ||
            r.QuizId.ToString().Contains(searchLower));
    }

    private Result CreateResult(SubmitResultRequestDto submitResultDto, Guid userId, GradingResult gradingResult)
    {
        return new Result
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
    }

    private async Task<UserStatsDto> CalculateUserStats(Guid userId, List<Result> userResults)
    {
        var userName = await GetUserNameAsync(userId) ?? "Unknown User";
        var totalQuizzes = userResults.Count;
        var totalScore = userResults.Sum(r => r.Score);
        var averageScore = userResults.Average(r => r.Score);
        var bestScore = userResults.Max(r => r.Score);
        var averageTime = TimeSpan.FromSeconds(userResults.Average(r => r.TimeTakenSeconds));

        return new UserStatsDto
        {
            UserId = userId,
            UserName = userName,
            TotalQuizzesTaken = totalQuizzes,
            TotalScore = totalScore,
            AverageScore = Math.Round(averageScore, 2),
            BestScore = bestScore,
            AverageTimePerQuiz = averageTime
        };
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

    private static EnrichedResultResponseDto MapToEnrichedResultResponse(
        Result result, 
        Dictionary<Guid, UserDto> users, 
        Dictionary<Guid, Dtos.Quiz.QuizDto> quizzes)
    {
        users.TryGetValue(result.UserId, out var user);
        quizzes.TryGetValue(result.QuizId, out var quiz);

        return new EnrichedResultResponseDto
        {
            Id = result.Id,
            UserId = result.UserId,
            QuizId = result.QuizId,
            Score = result.Score,
            MaxPossibleScore = result.MaxPossibleScore,
            TimeTakenSeconds = result.TimeTakenSeconds,
            CompletedAt = result.CompletedAt,
            UserName = user?.FirstName,
            UserSurname = user?.LastName,
            QuizTitle = quiz?.Title,
            QuizCategory = quiz?.Category,
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
