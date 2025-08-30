using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ResultService.Api.Dtos.Requests;
using ResultService.Api.Services.LeaderboardService;
using ResultService.Api.Services.ResultService;
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
            return BadRequest(ModelState);

        var userId = GetCurrentUserId();
        if (userId == Guid.Empty)
            return Unauthorized();

        var result = await _resultService.SubmitQuizResultAsync(submitResultDto, userId);
        if (!result.Success)
            return StatusCode(result.StatusCode, new { message = result.ErrorMessage });

        return CreatedAtAction(nameof(GetResult), new { id = result.Data?.Id }, result.Data);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetResult(Guid id)
    {
        var userId = GetCurrentUserId();
        if (userId == Guid.Empty)
            return Unauthorized();

        var result = await _resultService.GetResultByIdAsync(id, userId);
        return !result.Success 
            ? StatusCode(result.StatusCode, new { message = result.ErrorMessage })
            : Ok(result.Data);
    }

    [HttpGet]
    public async Task<IActionResult> GetAllResults([FromQuery] int page = 1, [FromQuery] int pageSize = 20, [FromQuery] string? search = null)
    {
        var currentUserId = GetCurrentUserId();
        if (currentUserId == Guid.Empty)
            return Unauthorized();

        if (!await IsUserAdmin(currentUserId))
            return Forbid();

        var (validPage, validPageSize) = ValidatePagination(page, pageSize, 20);
        var result = await _resultService.GetAllResultsAsync(validPage, validPageSize, search);
        
        return !result.Success
            ? StatusCode(result.StatusCode, new { message = result.ErrorMessage })
            : Ok(result.Data);
    }

    [HttpGet("user/{userId}")]
    public async Task<IActionResult> GetUserResults(Guid userId, [FromQuery] int page = 1, [FromQuery] int pageSize = 10)
    {
        var currentUserId = GetCurrentUserId();
        if (currentUserId == Guid.Empty)
            return Unauthorized();

        if (currentUserId != userId && !await IsUserAdmin(currentUserId))
            return Forbid();

        var (validPage, validPageSize) = ValidatePagination(page, pageSize, 10);
        var result = await _resultService.GetUserResultsAsync(userId, validPage, validPageSize);
        
        return !result.Success
            ? StatusCode(result.StatusCode, new { message = result.ErrorMessage })
            : Ok(result.Data);
    }

    [HttpGet("quiz/{quizId}")]
    public async Task<IActionResult> GetQuizResults(Guid quizId, [FromQuery] int page = 1, [FromQuery] int pageSize = 10)
    {
        var (validPage, validPageSize) = ValidatePagination(page, pageSize, 10);
        var result = await _resultService.GetQuizResultsAsync(quizId, validPage, validPageSize);
        
        return !result.Success
            ? StatusCode(result.StatusCode, new { message = result.ErrorMessage })
            : Ok(result.Data);
    }

    [HttpGet("stats/{userId}")]
    public async Task<IActionResult> GetUserStats(Guid userId)
    {
        var currentUserId = GetCurrentUserId();
        if (currentUserId == Guid.Empty)
            return Unauthorized();

        if (currentUserId != userId && !await IsUserAdmin(currentUserId))
            return Forbid();

        var result = await _resultService.GetUserStatsAsync(userId);
        return !result.Success
            ? StatusCode(result.StatusCode, new { message = result.ErrorMessage })
            : Ok(result.Data);
    }

    [HttpGet("leaderboard/global")]
    [AllowAnonymous]
    public async Task<IActionResult> GetGlobalLeaderboard([FromQuery] int top = 100)
    {
        var validTop = ValidateTopParameter(top);
        var result = await _leaderboardService.GetGlobalLeaderboardAsync(validTop);
        
        return !result.Success
            ? StatusCode(result.StatusCode, new { message = result.ErrorMessage })
            : Ok(result.Data);
    }

    [HttpGet("leaderboard/quiz/{quizId}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetQuizLeaderboard(Guid quizId, [FromQuery] int top = 100)
    {
        var validTop = ValidateTopParameter(top);
        var result = await _leaderboardService.GetQuizLeaderboardAsync(quizId, validTop);
        
        return !result.Success
            ? StatusCode(result.StatusCode, new { message = result.ErrorMessage })
            : Ok(result.Data);
    }

    [HttpGet("leaderboard/category/{category}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetCategoryLeaderboard(string category, [FromQuery] int top = 100)
    {
        var validTop = ValidateTopParameter(top);
        var result = await _leaderboardService.GetLeaderboardByCategoryAsync(category, validTop);
        
        return !result.Success
            ? StatusCode(result.StatusCode, new { message = result.ErrorMessage })
            : Ok(result.Data);
    }

    private Guid GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst("userId")?.Value ??
                         User.FindFirst("sub")?.Value ??
                         User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                         
        return !string.IsNullOrEmpty(userIdClaim) && Guid.TryParse(userIdClaim, out var userId)
            ? userId
            : Guid.Empty;
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

    private static (int page, int pageSize) ValidatePagination(int page, int pageSize, int defaultPageSize)
    {
        var validPage = page < 1 ? 1 : page;
        var validPageSize = pageSize < 1 || pageSize > 100 ? defaultPageSize : pageSize;
        return (validPage, validPageSize);
    }

    private static int ValidateTopParameter(int top)
    {
        return top < 1 || top > 1000 ? 100 : top;
    }
}
