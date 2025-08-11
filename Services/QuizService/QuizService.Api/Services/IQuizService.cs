using QuizService.Api.Dtos.Requests;
using QuizService.Api.Dtos.Responses;
using QuizService.Api.Dtos.Results;

namespace QuizService.Api.Services;

public interface IQuizService
{
    Task<ServiceResult<QuizResponseDto>> GetQuizByIdAsync(Guid id);
    Task<ServiceResult<QuizWithQuestionsDto>> GetQuizWithQuestionsAsync(Guid id);
    Task<ServiceResult<List<QuizResponseDto>>> GetAllQuizzesAsync(int page = 1, int pageSize = 10);
    Task<ServiceResult<List<QuizResponseDto>>> GetQuizzesByCategoryAsync(string category, int page = 1, int pageSize = 10);
    Task<ServiceResult<QuizResponseDto>> CreateQuizAsync(CreateQuizRequestDto createQuizDto, Guid createdByUserId);
    Task<ServiceResult> UpdateQuizAsync(Guid id, CreateQuizRequestDto updateQuizDto, Guid userId);
    Task<ServiceResult> DeleteQuizAsync(Guid id, Guid userId);
    Task<ServiceResult> ValidateQuizOwnershipAsync(Guid quizId, Guid userId);
}
