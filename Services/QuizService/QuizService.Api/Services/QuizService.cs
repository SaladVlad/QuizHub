using Microsoft.EntityFrameworkCore;
using QuizService.Api.Data;
using QuizService.Api.Domain.Entities;
using QuizService.Api.Dtos.Requests;
using QuizService.Api.Dtos.Responses;
using QuizService.Api.Dtos.Results;

namespace QuizService.Api.Services;

public class QuizService : IQuizService
{
    private readonly QuizDbContext _context;
    private readonly ILogger<QuizService> _logger;

    public QuizService(QuizDbContext context, ILogger<QuizService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<ServiceResult<QuizResponseDto>> GetQuizByIdAsync(Guid id)
    {
        try
        {
            var quiz = await _context.Quizzes
                .Include(q => q.Questions)
                .ThenInclude(q => q.Answers)
                .FirstOrDefaultAsync(q => q.Id == id);

            if (quiz == null)
            {
                return ServiceResult<QuizResponseDto>.FailureResult("Quiz not found", 404);
            }

            var result = MapToQuizResponse(quiz);
            return ServiceResult<QuizResponseDto>.SuccessResult(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving quiz with ID {QuizId}", id);
            return ServiceResult<QuizResponseDto>.FailureResult("An error occurred while retrieving the quiz", 500);
        }
    }

    public async Task<ServiceResult<List<QuizResponseDto>>> GetAllQuizzesAsync(int page = 1, int pageSize = 10)
    {
        try
        {
            var quizzes = await _context.Quizzes
                .Include(q => q.Questions)
                .ThenInclude(q => q.Answers)
                .OrderBy(q => q.Title)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var result = quizzes.Select(MapToQuizResponse).ToList();
            return ServiceResult<List<QuizResponseDto>>.SuccessResult(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving quizzes");
            return ServiceResult<List<QuizResponseDto>>.FailureResult("An error occurred while retrieving quizzes", 500);
        }
    }

    public async Task<ServiceResult<List<QuizResponseDto>>> GetQuizzesByCategoryAsync(string category, int page = 1, int pageSize = 10)
    {
        try
        {
            var quizzes = await _context.Quizzes
                .Where(q => q.Category == category)
                .Include(q => q.Questions)
                .ThenInclude(q => q.Answers)
                .OrderBy(q => q.Title)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var result = quizzes.Select(MapToQuizResponse).ToList();
            return ServiceResult<List<QuizResponseDto>>.SuccessResult(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving quizzes by category {Category}", category);
            return ServiceResult<List<QuizResponseDto>>.FailureResult("An error occurred while retrieving quizzes by category", 500);
        }
    }

    public async Task<ServiceResult<QuizResponseDto>> CreateQuizAsync(CreateQuizRequestDto createQuizDto, Guid createdByUserId)
    {
        try
        {
            var quiz = new Quiz
            {
                Id = Guid.NewGuid(),
                Title = createQuizDto.Title,
                Description = createQuizDto.Description,
                Category = createQuizDto.Category,
                Difficulty = (Difficulty)createQuizDto.Difficulty,
                TimeLimitSeconds = createQuizDto.TimeLimitSeconds,
                CreatedByUserId = createdByUserId,
                Questions = new List<Question>()
            };

            foreach (var questionDto in createQuizDto.Questions)
            {
                var question = new Question
                {
                    Id = Guid.NewGuid(),
                    QuizId = quiz.Id,
                    Text = questionDto.Text,
                    QuestionType = (QuestionType)questionDto.QuestionType,
                    Answers = questionDto.Answers.Select(a => new Answer
                    {
                        Id = Guid.NewGuid(),
                        Text = a.Text,
                        IsCorrect = a.IsCorrect
                    }).ToList()
                };
                quiz.Questions.Add(question);
            }

            _context.Quizzes.Add(quiz);
            await _context.SaveChangesAsync();

            var result = MapToQuizResponse(quiz);
            return ServiceResult<QuizResponseDto>.SuccessResult(result, 201);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating quiz");
            return ServiceResult<QuizResponseDto>.FailureResult("An error occurred while creating the quiz", 500);
        }
    }

    public async Task<ServiceResult> UpdateQuizAsync(Guid id, CreateQuizRequestDto updateQuizDto, Guid userId)
    {
        try
        {
            var quiz = await _context.Quizzes
                .Include(q => q.Questions)
                .ThenInclude(q => q.Answers)
                .FirstOrDefaultAsync(q => q.Id == id);

            if (quiz == null)
            {
                return ServiceResult.FailureResult("Quiz not found", 404);
            }

            if (quiz.CreatedByUserId != userId)
            {
                return ServiceResult.FailureResult("You are not authorized to update this quiz", 403);
            }

            // Update quiz properties
            quiz.Title = updateQuizDto.Title;
            quiz.Description = updateQuizDto.Description;
            quiz.Category = updateQuizDto.Category;
            quiz.Difficulty = (Difficulty)updateQuizDto.Difficulty;
            quiz.TimeLimitSeconds = updateQuizDto.TimeLimitSeconds;

            // Remove existing questions and answers
            _context.Questions.RemoveRange(quiz.Questions);
            quiz.Questions.Clear();

            // Add updated questions and answers
            foreach (var questionDto in updateQuizDto.Questions)
            {
                var question = new Question
                {
                    Id = Guid.NewGuid(),
                    QuizId = quiz.Id,
                    Text = questionDto.Text,
                    QuestionType = (QuestionType)questionDto.QuestionType,
                    Answers = questionDto.Answers.Select(a => new Answer
                    {
                        Id = Guid.NewGuid(),
                        Text = a.Text,
                        IsCorrect = a.IsCorrect
                    }).ToList()
                };
                quiz.Questions.Add(question);
            }

            await _context.SaveChangesAsync();
            return ServiceResult.SuccessResult();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating quiz with ID {QuizId}", id);
            return ServiceResult.FailureResult("An error occurred while updating the quiz", 500);
        }
    }

    public async Task<ServiceResult> DeleteQuizAsync(Guid id, Guid userId)
    {
        try
        {
            var quiz = await _context.Quizzes.FindAsync(id);
            if (quiz == null)
            {
                return ServiceResult.FailureResult("Quiz not found", 404);
            }

            if (quiz.CreatedByUserId != userId)
            {
                return ServiceResult.FailureResult("You are not authorized to delete this quiz", 403);
            }

            _context.Quizzes.Remove(quiz);
            await _context.SaveChangesAsync();
            return ServiceResult.SuccessResult();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting quiz with ID {QuizId}", id);
            return ServiceResult.FailureResult("An error occurred while deleting the quiz", 500);
        }
    }

    public async Task<ServiceResult> ValidateQuizOwnershipAsync(Guid quizId, Guid userId)
    {
        try
        {
            var quiz = await _context.Quizzes.FindAsync(quizId);
            if (quiz == null)
            {
                return ServiceResult.FailureResult("Quiz not found", 404);
            }

            if (quiz.CreatedByUserId != userId)
            {
                return ServiceResult.FailureResult("You are not authorized to modify this quiz", 403);
            }

            return ServiceResult.SuccessResult();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error validating quiz ownership for quiz {QuizId} and user {UserId}", quizId, userId);
            return ServiceResult.FailureResult("An error occurred while validating quiz ownership", 500);
        }
    }

    private static QuizResponseDto MapToQuizResponse(Quiz quiz)
    {
        return new QuizResponseDto
        {
            Id = quiz.Id,
            Title = quiz.Title,
            Description = quiz.Description,
            Category = quiz.Category,
            Difficulty = (int)quiz.Difficulty,
            TimeLimitSeconds = quiz.TimeLimitSeconds,
            Questions = quiz.Questions?.Select(q => new QuestionResponseDto
            {
                Id = q.Id,
                Text = q.Text,
                QuestionType = (int)q.QuestionType,
                Answers = q.Answers?.Select(a => new AnswerResponseDto
                {
                    Id = a.Id,
                    Text = a.Text,
                    IsCorrect = a.IsCorrect
                }).ToList() ?? new List<AnswerResponseDto>()
            }).ToList() ?? new List<QuestionResponseDto>()
        };
    }
}
