using ResultService.Api.Dtos.Responses;
using ResultService.Api.Dtos.Results;

namespace ResultService.Api.Services;

public interface ILeaderboardService
{
    Task<ServiceResult<QuizLeaderboardDto>> GetGlobalLeaderboardAsync(int top = 100);
    Task<ServiceResult<QuizLeaderboardDto>> GetQuizLeaderboardAsync(Guid quizId, int top = 100);
    Task<ServiceResult<List<QuizLeaderboardDto>>> GetLeaderboardByCategoryAsync(string category, int top = 100);
}
