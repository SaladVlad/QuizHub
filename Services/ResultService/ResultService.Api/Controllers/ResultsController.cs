using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ResultService.Api.Dtos.Requests;
using ResultService.Api.Services.LeaderboardService;
using ResultService.Api.Services.ResultService;
using System.Text;
namespace ResultService.Api.Controllers;

[ApiController]
[Route("api/results")]
[Authorize]
public class ResultsController : ControllerBase
{
    private readonly IResultService _resultService;
    private readonly ILeaderboardService _leaderboardService;
    private readonly ILogger<ResultsController> _logger;

    public ResultsController(
        IResultService resultService,
        ILeaderboardService leaderboardService,
        ILogger<ResultsController> logger)
    {
        _resultService = resultService;
        _leaderboardService = leaderboardService;
        _logger = logger;
    }

    [HttpPost]
    public async Task<IActionResult> SubmitResult([FromBody] SubmitResultRequestDto submitResultDto)
    {
        _logger.LogInformation("[ResultsController] SubmitResult called. ModelState.IsValid={IsValid}", ModelState.IsValid);

        if (submitResultDto == null)
        {
            _logger.LogWarning("[ResultsController] SubmitResult received null body. Content-Type={ContentType}", Request?.ContentType);
            return BadRequest(new { message = "Request body was null or malformed JSON" });
        }

        if (!ModelState.IsValid)
        {
            // Log ModelState validation errors for diagnostics
            var sb = new StringBuilder();
            foreach (var kvp in ModelState)
            {
                var key = kvp.Key;
                var errors = kvp.Value?.Errors;
                if (errors != null && errors.Count > 0)
                {
                    foreach (var err in errors)
                    {
                        sb.AppendLine($"Key='{key}', Error='{err.ErrorMessage}'");
                    }
                }
            }
            _logger.LogWarning("[ResultsController] Invalid ModelState on SubmitResult. Errors:\n{Errors}", sb.ToString());
            return BadRequest(ModelState);
        }

        var userId = GetCurrentUserId();
        if (userId == Guid.Empty)
        {
            return Unauthorized();
        }

        // Log a concise summary of the incoming DTO (no PII)
        try
        {
            _logger.LogInformation(
                "[ResultsController] Submitting result. UserId={UserId}, QuizId={QuizId}, TimeTakenSeconds={TimeTakenSeconds}, AnswersCount={AnswersCount}, Score={Score}",
                userId,
                submitResultDto?.QuizId,
                submitResultDto?.TimeTakenSeconds,
                submitResultDto?.Answers?.Count,
                submitResultDto?.Score
            );
        }
        catch { }

        var result = await _resultService.SubmitQuizResultAsync(submitResultDto, userId);
        if (!result.Success)
        {
            _logger.LogWarning("[ResultsController] SubmitResult failed. StatusCode={StatusCode}, Message={Message}", result.StatusCode, result.ErrorMessage);
            return StatusCode(result.StatusCode, new { message = result.ErrorMessage });
        }
        _logger.LogInformation("[ResultsController] SubmitResult succeeded. ResultId={ResultId}", result.Data?.Id);
        return CreatedAtAction(nameof(GetResult), new { id = result.Data?.Id }, result.Data);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetResult(Guid id)
    {
        var userId = GetCurrentUserId();
        if (userId == Guid.Empty)
        {
            return Unauthorized();
        }

        var result = await _resultService.GetResultByIdAsync(id, userId);
        if (!result.Success)
        {
            return StatusCode(result.StatusCode, new { message = result.ErrorMessage });
        }
        return Ok(result.Data);
    }

    [HttpGet("user/{userId}")]
    public async Task<IActionResult> GetUserResults(Guid userId, [FromQuery] int page = 1, [FromQuery] int pageSize = 10)
    {
        var currentUserId = GetCurrentUserId();
        if (currentUserId == Guid.Empty)
        {
            return Unauthorized();
        }

        // Users can only view their own results unless they're an admin
        if (currentUserId != userId && !await IsUserAdmin(currentUserId))
        {
            return Forbid();
        }

        if (page < 1) page = 1;
        if (pageSize < 1 || pageSize > 100) pageSize = 10;

        var result = await _resultService.GetUserResultsAsync(userId, page, pageSize);
        if (!result.Success)
        {
            return StatusCode(result.StatusCode, new { message = result.ErrorMessage });
        }
        return Ok(result.Data);
    }

    [HttpGet("quiz/{quizId}")]
    public async Task<IActionResult> GetQuizResults(Guid quizId, [FromQuery] int page = 1, [FromQuery] int pageSize = 10)
    {
        if (page < 1) page = 1;
        if (pageSize < 1 || pageSize > 100) pageSize = 10;

        var result = await _resultService.GetQuizResultsAsync(quizId, page, pageSize);
        if (!result.Success)
        {
            return StatusCode(result.StatusCode, new { message = result.ErrorMessage });
        }
        return Ok(result.Data);
    }

    [HttpGet("stats/{userId}")]
    public async Task<IActionResult> GetUserStats(Guid userId)
    {
        var currentUserId = GetCurrentUserId();
        if (currentUserId == Guid.Empty)
        {
            return Unauthorized();
        }

        // Users can only view their own stats unless they're an admin
        if (currentUserId != userId && !await IsUserAdmin(currentUserId))
        {
            return Forbid();
        }

        var result = await _resultService.GetUserStatsAsync(userId);
        if (!result.Success)
        {
            return StatusCode(result.StatusCode, new { message = result.ErrorMessage });
        }
        return Ok(result.Data);
    }

    [HttpGet("leaderboard/global")]
    [AllowAnonymous]
    public async Task<IActionResult> GetGlobalLeaderboard([FromQuery] int top = 100)
    {
        if (top < 1 || top > 1000) top = 100;

        var result = await _leaderboardService.GetGlobalLeaderboardAsync(top);
        if (!result.Success)
        {
            return StatusCode(result.StatusCode, new { message = result.ErrorMessage });
        }
        return Ok(result.Data);
    }

    [HttpGet("leaderboard/quiz/{quizId}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetQuizLeaderboard(Guid quizId, [FromQuery] int top = 100)
    {
        if (top < 1 || top > 1000) top = 100;

        var result = await _leaderboardService.GetQuizLeaderboardAsync(quizId, top);
        if (!result.Success)
        {
            return StatusCode(result.StatusCode, new { message = result.ErrorMessage });
        }
        return Ok(result.Data);
    }

    [HttpGet("leaderboard/category/{category}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetCategoryLeaderboard(string category, [FromQuery] int top = 100)
    {
        if (top < 1 || top > 1000) top = 100;

        var result = await _leaderboardService.GetLeaderboardByCategoryAsync(category, top);
        if (!result.Success)
        {
            return StatusCode(result.StatusCode, new { message = result.ErrorMessage });
        }
        return Ok(result.Data);
    }

    private Guid GetCurrentUserId()
    {
        // Try different claim types that might contain the user ID
        var userIdClaim = User.FindFirst("userId")?.Value ??
                         User.FindFirst("sub")?.Value ??
                         User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                         
        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
        {
            _logger.LogWarning("Invalid or missing user ID in token. Available claims: {Claims}",                 string.Join(", ", User.Claims.Select(c => $"{c.Type}: {c.Value}")));
            return Guid.Empty;
        }
        return userId;
    }

    private async Task<bool> IsUserAdmin(Guid userId)
    {
        try
        {
            return await Task.FromResult(User.IsInRole("Admin"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking if user {UserId} is admin", userId);
            return false;
        }
    }
}
