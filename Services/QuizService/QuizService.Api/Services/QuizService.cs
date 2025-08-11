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

    public async Task<ServiceResult<QuizWithQuestionsDto>> GetQuizWithQuestionsAsync(Guid id)
    {
        try
        {
            var quiz = await _context.Quizzes
                .Include(q => q.Questions)
                    .ThenInclude(q => q.Answers)
                .FirstOrDefaultAsync(q => q.Id == id);

            if (quiz == null)
            {
                return ServiceResult<QuizWithQuestionsDto>.FailureResult("Quiz not found", 404);
            }

            var result = new QuizWithQuestionsDto
            {
                Id = quiz.Id,
                Title = quiz.Title,
                Description = quiz.Description,
                Category = quiz.Category,
                Difficulty = quiz.Difficulty,
                TimeLimitSeconds = quiz.TimeLimitSeconds,
                CreatedByUserId = quiz.CreatedByUserId,
                Questions = quiz.Questions.Select(q => new QuestionDto
                {
                    Id = q.Id,
                    Text = q.Text,
                    QuestionType = q.QuestionType,
                    Points = q.Points,
                    IsCaseSensitive = q.IsCaseSensitive,
                    Explanation = q.Explanation,
                    Order = q.Order,
                    Answers = q.Answers.Select(a => new AnswerDto
                    {
                        Id = a.Id,
                        Text = a.Text,
                        IsCorrect = a.IsCorrect
                    }).ToList()
                }).ToList()
            };

            return ServiceResult<QuizWithQuestionsDto>.SuccessResult(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving quiz with questions for ID {QuizId}", id);
            return ServiceResult<QuizWithQuestionsDto>.FailureResult("An error occurred while retrieving the quiz with questions", 500);
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

            foreach (var questionDto in (createQuizDto.Questions ?? Enumerable.Empty<CreateQuestionRequestDto>()))
            {
                var question = new Question
                {
                    Id = Guid.NewGuid(),
                    QuizId = quiz.Id,
                    Text = questionDto.Text,
                    QuestionType = (QuestionType)questionDto.QuestionType,
                    Answers = (questionDto.Answers ?? Enumerable.Empty<CreateAnswerRequestDto>()).Select(a => new Answer
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
        using var transaction = await _context.Database.BeginTransactionAsync();
        
        try
        {
            // First, get the quiz with tracking disabled to avoid concurrency issues
            var quiz = await _context.Quizzes
                .AsNoTracking()
                .FirstOrDefaultAsync(q => q.Id == id);

            if (quiz == null)
            {
                return ServiceResult.FailureResult("Quiz not found", 404);
            }

            if (quiz.CreatedByUserId != userId)
            {
                return ServiceResult.FailureResult("You are not authorized to update this quiz", 403);
            }

            // Update the existing quiz properties
            quiz.Title = updateQuizDto.Title;
            quiz.Description = updateQuizDto.Description;
            quiz.Category = updateQuizDto.Category;
            quiz.Difficulty = (Difficulty)updateQuizDto.Difficulty;
            quiz.TimeLimitSeconds = updateQuizDto.TimeLimitSeconds;

            // Mark the entity as modified
            _context.Quizzes.Update(quiz);

            // Remove existing questions and answers in a separate query to avoid tracking issues
            var existingQuestions = await _context.Questions
                .Where(q => q.QuizId == id)
                .Include(q => q.Answers)
                .ToListAsync();

            if (existingQuestions.Any())
            {
                _context.Answers.RemoveRange(existingQuestions.SelectMany(q => q.Answers));
                _context.Questions.RemoveRange(existingQuestions);
                await _context.SaveChangesAsync();
            }

            // Add new questions and answers
            if (updateQuizDto.Questions != null && updateQuizDto.Questions.Any())
            {
                var newQuestions = updateQuizDto.Questions.Select(questionDto => new Question
                {
                    Id = Guid.NewGuid(),
                    QuizId = id,
                    Text = questionDto.Text,
                    QuestionType = (QuestionType)questionDto.QuestionType,
                    Answers = questionDto.Answers?.Select(a => new Answer
                    {
                        Id = Guid.NewGuid(),
                        Text = a.Text,
                        IsCorrect = a.IsCorrect
                    }).ToList()
                }).ToList();

                await _context.Questions.AddRangeAsync(newQuestions);
            }

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();
            
            return ServiceResult.SuccessResult();
        }
        catch (DbUpdateConcurrencyException ex)
        {
            await transaction.RollbackAsync();
            _logger.LogError(ex, "Concurrency error while updating quiz with ID {QuizId}", id);
            return ServiceResult.FailureResult("The quiz was modified by another user. Please refresh and try again.", 409);
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
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
