using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using UserService.Api.Dtos.Requests;
using UserService.Api.Services.AuthService;
using UserService.Api.Services.UserService;
using UserService.Api.Services.UserValidationService;
using UserService.Api.Utils;

namespace UserService.Api.Controllers;


[ApiController]
[Route("api/users/auth")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly IUserService _userService;
    private readonly IConfiguration _configuration;
    private readonly IUserValidationService _validationService;
    private readonly IJwtHelper _jwtHelper;

    public AuthController(IAuthService authService, IConfiguration configuration, IUserValidationService validationService, IJwtHelper jwtHelper, IUserService userService)
    {
        _authService = authService;
        _configuration = configuration;
        _validationService = validationService;
        _jwtHelper = jwtHelper;
        _userService = userService;
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequestDto request)
    {
        try
        {
            _validationService.ValidateLoginRequest(request);

            var user = await _authService.AuthenticateAsync(request);

            if (user == null)
                return Unauthorized("Invalid username or password");

            var jwtKey = _configuration["Jwt:Key"] ?? throw new InvalidOperationException("JWT Key is not configured");
            var token = _jwtHelper.GenerateJwt(user, jwtKey);
            return Ok(new { Token = token, User = user });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPost("register")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> Register([FromForm] RegisterRequestDto formRequest)
    {
        try
        {
            if (formRequest == null)
            {
                return BadRequest("Invalid form data");
            }

            _validationService.ValidateRegisterRequest(formRequest);
            var user = await _authService.RegisterAsync(formRequest);
            var jwtKey = _configuration["Jwt:Key"] ?? throw new InvalidOperationException("JWT Key is not configured");
            var token = _jwtHelper.GenerateJwt(user, jwtKey);
            return Ok(new { Token = token, User = user });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(ex.Message);
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"An unexpected error occurred: {ex.Message}");
        }
    }

    [Authorize]
    [HttpGet("currentUser")]
    public async Task<IActionResult> CurrentUser()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized("User is not authenticated.");

        var user = await _userService.GetById(new Guid(userId));
        return Ok(user);
    }

    [HttpGet("test")]
    public IActionResult Test()
    {
        return Ok("Test endpoint for user auth service is working!");
    }
}
