using ResultService.Api.Common;
using ResultService.Api.Dtos.Quiz;
using ResultService.Api.Dtos.Responses;

namespace ResultService.Api.Clients;

public interface IQuizServiceClient
{
    Task<ServiceResult<QuizWithQuestionsDto>> GetQuizWithQuestionsAsync(Guid quizId);
    Task<QuizDto?> GetQuizAsync(Guid quizId);
    Task<Dictionary<Guid, QuizDto>> GetQuizzesBatchAsync(IEnumerable<Guid> quizIds);
}
