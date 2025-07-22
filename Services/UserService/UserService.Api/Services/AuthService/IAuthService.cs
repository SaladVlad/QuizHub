using UserService.Api.Dtos;

namespace UserService.Api.Services.AuthService;

public interface IAuthService
{
    Task<UserDto?> AuthenticateAsync(LoginRequestDto request);
    Task<UserDto> RegisterAsync(RegisterRequestDto request);
}
