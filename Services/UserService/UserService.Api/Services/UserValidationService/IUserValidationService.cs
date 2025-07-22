using UserService.Api.Dtos;

namespace UserService.Api.Services.UserValidationService;

public interface IUserValidationService
{
    void ValidateRegisterRequest(RegisterRequestDto request);
    void ValidateLoginRequest(LoginRequestDto request);
}
