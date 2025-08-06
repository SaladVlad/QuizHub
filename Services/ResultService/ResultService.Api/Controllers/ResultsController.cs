using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ResultService.Api.Dtos.Requests;
using ResultService.Api.Dtos.Responses;
using ResultService.Api.Dtos.Results;
using ResultService.Api.Services;

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
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var userId = GetCurrentUserId();
        if (userId == Guid.Empty)
        {
            return Unauthorized();
        }

        var result = await _resultService.SubmitQuizResultAsync(submitResultDto, userId);
        if (!result.Success)
        {
            return StatusCode(result.StatusCode, new { message = result.ErrorMessage });
        }
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
    [AllowAnonymous]
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
        var userIdClaim = User.FindFirst("userId")?.Value;
        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
        {
            _logger.LogWarning("Invalid or missing user ID in token");
            return Guid.Empty;
        }
        return userId;
    }

    private async Task<bool> IsUserAdmin(Guid userId)
    {
        try
        {
            // In a real implementation, this would check the user's roles
            // For now, we'll return false
            return await Task.FromResult(false);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking if user {UserId} is admin", userId);
            return false;
        }
    }
}
