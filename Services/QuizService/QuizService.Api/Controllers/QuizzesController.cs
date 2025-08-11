using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuizService.Api.Dtos.Requests;
using QuizService.Api.Dtos.Responses;
using QuizService.Api.Dtos.Results;
using QuizService.Api.Services;
using System.Security.Claims;

namespace QuizService.Api.Controllers;

[ApiController]
[Route("api/quizzes")]
[Authorize]
public class QuizzesController : ControllerBase
{
    private readonly IQuizService _quizService;
    private readonly ILogger<QuizzesController> _logger;

    public QuizzesController(IQuizService quizService, ILogger<QuizzesController> logger)
    {
        _quizService = quizService;
        _logger = logger;
    }

    [HttpGet("{id}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetQuizById(Guid id)
    {
        var result = await _quizService.GetQuizByIdAsync(id);
        if (!result.Success)
        {
            return StatusCode(result.StatusCode, new { message = result.ErrorMessage });
        }
        return Ok(result.Data);
    }
    
    [HttpGet("{id}/with-questions")]
    [AllowAnonymous]
    public async Task<IActionResult> GetQuizWithQuestions(Guid id)
    {
        var result = await _quizService.GetQuizWithQuestionsAsync(id);
        if (!result.Success)
        {
            return StatusCode(result.StatusCode, new { message = result.ErrorMessage });
        }
        return Ok(result.Data);
    }

    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetAllQuizzes([FromQuery] int page = 1, [FromQuery] int pageSize = 10)
    {
        if (page < 1) page = 1;
        if (pageSize < 1 || pageSize > 100) pageSize = 10;

        var result = await _quizService.GetAllQuizzesAsync(page, pageSize);
        if (!result.Success)
        {
            return StatusCode(result.StatusCode, new { message = result.ErrorMessage });
        }
        return Ok(result.Data);
    }

    [HttpGet("category/{category}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetQuizzesByCategory(string category, [FromQuery] int page = 1, [FromQuery] int pageSize = 10)
    {
        if (page < 1) page = 1;
        if (pageSize < 1 || pageSize > 100) pageSize = 10;

        var result = await _quizService.GetQuizzesByCategoryAsync(category, page, pageSize);
        if (!result.Success)
        {
            return StatusCode(result.StatusCode, new { message = result.ErrorMessage });
        }
        return Ok(result.Data);
    }

    [HttpPost]
    [Authorize(Roles = "Admin,Teacher")]
    public async Task<IActionResult> CreateQuiz([FromBody] CreateQuizRequestDto createQuizDto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var userId = GetCurrentUserId();
        if (userId == Guid.Empty)
        {
            return Unauthorized();
        }

        var result = await _quizService.CreateQuizAsync(createQuizDto, userId);
        if (!result.Success)
        {
            return StatusCode(result.StatusCode, new { message = result.ErrorMessage });
        }
        return CreatedAtAction(nameof(GetQuizById), new { id = result.Data?.Id }, result.Data);
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateQuiz(Guid id, [FromBody] CreateQuizRequestDto updateQuizDto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var userId = GetCurrentUserId();
        if (userId == Guid.Empty)
        {
            return Unauthorized();
        }

        var result = await _quizService.UpdateQuizAsync(id, updateQuizDto, userId);
        if (!result.Success)
        {
            return StatusCode(result.StatusCode, new { message = result.ErrorMessage });
        }
        return NoContent();
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> DeleteQuiz(Guid id)
    {
        var userId = GetCurrentUserId();
        if (userId == Guid.Empty)
        {
            return Unauthorized();
        }

        var result = await _quizService.DeleteQuizAsync(id, userId);
        if (!result.Success)
        {
            return StatusCode(result.StatusCode, new { message = result.ErrorMessage });
        }
        return NoContent();
    }

    private Guid GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ??
                         User.FindFirst("sub")?.Value ??
                         User.FindFirst("userId")?.Value;

        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
        {
            _logger.LogWarning("Invalid or missing user ID in token");
            return Guid.Empty;
        }
        return userId;
    }
}
