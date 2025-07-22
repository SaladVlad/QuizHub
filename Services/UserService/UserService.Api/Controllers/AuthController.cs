using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using UserService.Api.Dtos;
using UserService.Api.Services.AuthService;
using UserService.Api.Services.UserValidationService;
using UserService.Api.Utils;

namespace UserService.Api.Controllers;


[ApiController]
[Route("api/users/auth")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly IConfiguration _configuration;
    private readonly IUserValidationService _validationService;

    public AuthController(IAuthService authService, IConfiguration configuration, IUserValidationService validationService)
    {
        _authService = authService;
        _configuration = configuration;
        _validationService = validationService;
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

            var token = JwtHelper.GenerateJwt(user, _configuration["Jwt:Key"]);
            return Ok(new { Token = token, User = user });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromForm] RegisterRequestDto request)
    {
        try
        {
            _validationService.ValidateRegisterRequest(request);

            var user = await _authService.RegisterAsync(request);
            var token = JwtHelper.GenerateJwt(user, _configuration["Jwt:Key"]);
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
        catch (Exception)
        {
            return StatusCode(500, "An unexpected error occurred.");
        }
    }

    [Authorize]
    [HttpGet("me")]
    public IActionResult Me()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Ok(userId);
    }

    [HttpGet("test")]
    public async Task<IActionResult> Test()
    {
        return Ok("Test endpoint for user auth service is working!");
    }
}
