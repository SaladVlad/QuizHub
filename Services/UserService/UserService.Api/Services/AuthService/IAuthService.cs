using UserService.Api.Dtos.EntityDtos;
using UserService.Api.Dtos.Requests;

namespace UserService.Api.Services.AuthService;

public interface IAuthService
{
    Task<UserDto?> AuthenticateAsync(LoginRequestDto request);
    Task<UserDto> RegisterAsync(RegisterRequestDto request);
}
