using UserService.Api.Dtos;

namespace UserService.Api.Services.UserValidationService;

public class UserValidationService : IUserValidationService
{
    public void ValidateRegisterRequest(RegisterRequestDto request)
    {
        if (request == null)
            throw new ArgumentNullException(nameof(request), "Request cannot be null.");

        if (string.IsNullOrWhiteSpace(request.Username))
            throw new ArgumentException("Username is required.", nameof(request.Username));

        if (string.IsNullOrWhiteSpace(request.Email))
            throw new ArgumentException("Email is required.", nameof(request.Email));

        if (string.IsNullOrWhiteSpace(request.Password))
            throw new ArgumentException("Password is required.", nameof(request.Password));

        if (request.AvatarImage == null || request.AvatarImage.Length == 0)
            throw new ArgumentException("Avatar image is required.", nameof(request.AvatarImage));
    }

    public void ValidateLoginRequest(LoginRequestDto request)
    {
        if (request == null)
            throw new ArgumentNullException(nameof(request), "Request cannot be null.");

        if (string.IsNullOrWhiteSpace(request.Username))
            throw new ArgumentException("Username is required.", nameof(request.Username));

        if (string.IsNullOrWhiteSpace(request.Password))
            throw new ArgumentException("Password is required.", nameof(request.Password));
    }
}
