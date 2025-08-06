using ResultService.Api.Common;
using ResultService.Api.Dtos.Responses;

namespace ResultService.Api.Clients;

public interface IQuizServiceClient
{
    Task<ServiceResult<QuizWithQuestionsDto>> GetQuizWithQuestionsAsync(Guid quizId);
}
