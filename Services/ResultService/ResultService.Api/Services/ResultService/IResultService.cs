using ResultService.Api.Dtos.Requests;
using ResultService.Api.Dtos.Responses;
using ResultService.Api.Dtos.Results;

namespace ResultService.Api.Services.ResultService;

public interface IResultService
{
    Task<ServiceResult<ResultResponseDto>> SubmitQuizResultAsync(SubmitResultRequestDto submitResultDto, Guid userId);
    Task<ServiceResult<ResultResponseDto>> GetResultByIdAsync(Guid id, Guid userId);
    Task<ServiceResult<List<ResultResponseDto>>> GetUserResultsAsync(Guid userId, int page = 1, int pageSize = 10);
    Task<ServiceResult<List<ResultResponseDto>>> GetQuizResultsAsync(Guid quizId, int page = 1, int pageSize = 10);
    Task<ServiceResult<PaginatedEnrichedResultResponseDto>> GetAllResultsAsync(int page = 1, int pageSize = 20, string? search = null);
    Task<ServiceResult<UserStatsDto>> GetUserStatsAsync(Guid userId);
}
