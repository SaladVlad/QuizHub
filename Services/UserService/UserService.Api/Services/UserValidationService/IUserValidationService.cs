using UserService.Api.Dtos.Requests;

namespace UserService.Api.Services.UserValidationService;

public interface IUserValidationService
{
    ValidationResult ValidateRegisterRequest(RegisterRequestDto request);
    ValidationResult ValidateLoginRequest(LoginRequestDto request);
    ValidationResult ValidateUserUpdateRequest(UpdateUserRequestDto request);
}
