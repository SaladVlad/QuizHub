using System.Text.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using ResultService.Api.Common;
using ResultService.Api.Dtos.Requests;
using ResultService.Api.Dtos.Responses;
using ResultService.Api.Options;

namespace ResultService.Api.Services;

public class GradingService : IGradingService
{
    private readonly ILogger<GradingService> _logger;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IOptions<QuizServiceOptions> _quizServiceOptions;

    public GradingService(
        ILogger<GradingService> logger,
        IHttpClientFactory httpClientFactory,
        IOptions<QuizServiceOptions> quizServiceOptions)
    {
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _httpClientFactory = httpClientFactory ?? throw new ArgumentNullException(nameof(httpClientFactory));
        _quizServiceOptions = quizServiceOptions ?? throw new ArgumentNullException(nameof(quizServiceOptions));
    }

    public async Task<GradingResult> GradeQuizAttemptAsync(SubmitResultRequestDto submitResultDto)
    {
        var result = new GradingResult();

        try
        {
            // Get the quiz with questions from QuizService
            var httpClient = _httpClientFactory.CreateClient("QuizService");
            var response = await httpClient.GetAsync($"api/quizzes/{submitResultDto.QuizId}/with-questions");

            if (!response.IsSuccessStatusCode)
            {
                result.ErrorMessage = "Failed to retrieve quiz details for grading";
                return result;
            }

            var content = await response.Content.ReadAsStringAsync();
            var quizResponse = JsonSerializer.Deserialize<ServiceResult<QuizWithQuestionsDto>>(
                content,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            if (quizResponse == null || !quizResponse.Success || quizResponse.Data == null)
            {
                result.ErrorMessage = "Failed to deserialize quiz details";
                return result;
            }

            var quiz = quizResponse.Data;

            // Grade each question
            if (quiz.Questions != null)
            {
                foreach (var question in quiz.Questions)
                {
                    if (question == null) continue;

                    var userAnswer = submitResultDto.Answers?.FirstOrDefault(a => a.QuestionId == question.Id);
                    var gradedQuestion = GradeQuestion(question, userAnswer);
                    result.GradedQuestions.Add(gradedQuestion);

                    result.TotalScore += (int)Math.Round(Convert.ToDouble(gradedQuestion.PointsAwarded), MidpointRounding.AwayFromZero);
                    result.MaxPossibleScore += gradedQuestion.MaxPoints;
                }
            }

            result.Success = true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error grading quiz attempt");
            result.Success = false;
            result.ErrorMessage = "An error occurred while grading the quiz";
        }

        return result;
    }

    private GradedQuestion GradeQuestion(QuestionDto question, ResultAnswerDto? userAnswer)
    {
        var gradedQuestion = new GradedQuestion
        {
            QuestionId = question.Id,
            MaxPoints = question.Points,
            Explanation = question.Explanation
        };

        // If no answer was provided
        if (userAnswer == null || string.IsNullOrWhiteSpace(userAnswer.GivenAnswer))
        {
            gradedQuestion.PointsAwarded = 0;
            gradedQuestion.IsCorrect = false;
            return gradedQuestion;
        }

        var gradedQuestionResult = question.Type switch
        {
            QuestionType.SingleChoice => GradeSingleChoiceQuestion(question, userAnswer),
            QuestionType.MultipleChoice => GradeMultipleChoiceQuestion(question, userAnswer),
            QuestionType.TrueFalse => GradeTrueFalseQuestion(question, userAnswer),
            QuestionType.FillInTheBlank => GradeFillInTheBlankQuestion(question, userAnswer),
            _ => throw new ArgumentOutOfRangeException(nameof(question.Type), $"Unsupported question type: {question.Type}")
        };

        // Ensure we don't award more points than the question is worth
        gradedQuestionResult.PointsAwarded = Math.Min(gradedQuestionResult.PointsAwarded, question.Points);
        return gradedQuestionResult;
    }

    private GradedQuestion GradeSingleChoiceQuestion(QuestionDto question, ResultAnswerDto userAnswer)
    {
        var correctAnswer = question.Answers.FirstOrDefault(a => a.IsCorrect);
        var userSelectedAnswer = question.Answers.FirstOrDefault(a => a.Id.ToString() == userAnswer.GivenAnswer);

        var gradedAnswer = new GradedAnswer
        {
            AnswerId = userSelectedAnswer?.Id ?? Guid.Empty,
            GivenAnswer = userAnswer.GivenAnswer,
            IsCorrect = userSelectedAnswer?.IsCorrect == true,
            PointsAwarded = userSelectedAnswer?.IsCorrect == true ? question.Points : 0,
            Explanation = userSelectedAnswer?.Explanation
        };

        var gradedQuestion = new GradedQuestion
        {
            QuestionId = question.Id,
            MaxPoints = question.Points,
            Explanation = question.Explanation,
            PointsAwarded = gradedAnswer.PointsAwarded,
            IsCorrect = gradedAnswer.IsCorrect,
            GradedAnswers = new List<GradedAnswer> { gradedAnswer }
        };

        return gradedQuestion;
    }

    private GradedQuestion GradeMultipleChoiceQuestion(QuestionDto question, ResultAnswerDto userAnswer)
    {
        var selectedAnswerIds = userAnswer.GivenAnswer.Split(',').Select(id => id.Trim()).ToList();
        var correctAnswers = question.Answers.Where(a => a.IsCorrect).ToList();
        if (correctAnswers.Count == 0)
        {
            return new GradedQuestion
            {
                QuestionId = question.Id,
                PointsAwarded = 0,
                MaxPoints = question.Points,
                IsCorrect = false
            };
        }

        float pointsPerCorrectAnswer = (float)question.Points / correctAnswers.Count;
        float pointsAwarded = 0;
        bool allCorrect = true;

        var gradedAnswers = new List<GradedAnswer>();

        // Check each selected answer
        foreach (var answerId in selectedAnswerIds)
        {
            var answer = question.Answers.FirstOrDefault(a => a.Id.ToString() == answerId);
            if (answer != null)
            {
                var isCorrect = answer.IsCorrect;
                var answerPoints = isCorrect ? pointsPerCorrectAnswer : 0;
                pointsAwarded += answerPoints;

                if (!isCorrect)
                    allCorrect = false;

                gradedAnswers.Add(new GradedAnswer
                {
                    AnswerId = answer.Id,
                    GivenAnswer = answerId,
                    IsCorrect = isCorrect,
                    PointsAwarded = answerPoints,
                    Explanation = answer.Explanation
                });
            }
        }

        // Check for missing correct answers
        foreach (var correctAnswer in correctAnswers)
        {
            if (!selectedAnswerIds.Contains(correctAnswer.Id.ToString()))
            {
                allCorrect = false;
                gradedAnswers.Add(new GradedAnswer
                {
                    AnswerId = correctAnswer.Id,
                    IsCorrect = true,
                    PointsAwarded = 0,
                    Explanation = correctAnswer.Explanation,
                    GivenAnswer = "(Not selected)"
                });
            }
        }

        var gradedQuestion = new GradedQuestion
        {
            QuestionId = question.Id,
            MaxPoints = question.Points,
            Explanation = question.Explanation,
            PointsAwarded = (float)Math.Round(pointsAwarded, 2),  // Round to 2 decimal places
            IsCorrect = allCorrect && selectedAnswerIds.Count == correctAnswers.Count,
            GradedAnswers = gradedAnswers
        };

        return gradedQuestion;
    }

    private GradedQuestion GradeTrueFalseQuestion(QuestionDto question, ResultAnswerDto userAnswer)
    {
        bool isCorrect = question.Answers.Any(a =>
            a.IsCorrect &&
            string.Equals(a.Text, userAnswer.GivenAnswer, StringComparison.OrdinalIgnoreCase));

        var gradedQuestion = new GradedQuestion
        {
            QuestionId = question.Id,
            MaxPoints = question.Points,
            Explanation = question.Explanation,
            PointsAwarded = isCorrect ? question.Points : 0,
            IsCorrect = isCorrect
        };

        foreach (var answer in question.Answers)
        {
            gradedQuestion.GradedAnswers.Add(new GradedAnswer
            {
                AnswerId = answer.Id,
                GivenAnswer = userAnswer.GivenAnswer,
                IsCorrect = answer.IsCorrect && string.Equals(answer.Text, userAnswer.GivenAnswer, StringComparison.OrdinalIgnoreCase),
                PointsAwarded = isCorrect ? question.Points : 0,
                Explanation = answer.Explanation
            });
        }

        return gradedQuestion;
    }

    private GradedQuestion GradeFillInTheBlankQuestion(QuestionDto question, ResultAnswerDto userAnswer)
    {
        // If no answer was provided
        if (userAnswer == null || string.IsNullOrWhiteSpace(userAnswer.GivenAnswer))
        {
            return new GradedQuestion
            {
                QuestionId = question.Id,
                PointsAwarded = 0,
                MaxPoints = question.Points,
                IsCorrect = false
            };
        }

        // If no correct answers are marked, treat all as incorrect
        var correctAnswers = question.Answers?.Where(a => a.IsCorrect).ToList() ?? new List<AnswerDto>();
        if (correctAnswers.Count == 0)
        {
            return new GradedQuestion
            {
                QuestionId = question.Id,
                PointsAwarded = 0,
                MaxPoints = question.Points,
                IsCorrect = false
            };
        }

        bool isCorrect = correctAnswers.Any(correctAnswer =>
            string.Equals(userAnswer.GivenAnswer, correctAnswer.Text,
            question.IsCaseSensitive ? StringComparison.Ordinal : StringComparison.OrdinalIgnoreCase));

        var gradedQuestion = new GradedQuestion
        {
            QuestionId = question.Id,
            MaxPoints = question.Points,
            Explanation = question.Explanation,
            PointsAwarded = isCorrect ? question.Points : 0,
            IsCorrect = isCorrect,
            GradedAnswers = new List<GradedAnswer>()
        };

        foreach (var answer in correctAnswers)
        {
            gradedQuestion.GradedAnswers.Add(new GradedAnswer
            {
                AnswerId = answer.Id,
                GivenAnswer = userAnswer.GivenAnswer,
                IsCorrect = isCorrect,
                PointsAwarded = isCorrect ? question.Points : 0,
                Explanation = answer.Explanation
            });
        }

        return gradedQuestion;
    }
}
