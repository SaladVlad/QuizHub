using System.Text.RegularExpressions;
using UserService.Api.Dtos.Requests;

namespace UserService.Api.Services.UserValidationService;

public class UserValidationService : IUserValidationService
{
    public ValidationResult ValidateRegisterRequest(RegisterRequestDto request)
    {
        var result = new ValidationResult();

        if (request == null)
        {
            result.Errors.Add("Request cannot be null.");
            result.IsValid = false;
            return result;
        }

        if (string.IsNullOrWhiteSpace(request.Username))
            result.Errors.Add("Username is required.");
        else if (request.Username.Length < 3)
            result.Errors.Add("Username must be at least 3 characters long.");
        else if (request.Username.Length > 50)
            result.Errors.Add("Username cannot exceed 50 characters.");

        if (string.IsNullOrWhiteSpace(request.Email))
            result.Errors.Add("Email is required.");
        else
        {
            if (request.Email.Length < 5)
                result.Errors.Add("Email must be at least 5 characters long.");
            if (request.Email.Length > 256)
                result.Errors.Add("Email cannot exceed 256 characters.");
            if (!Regex.IsMatch(request.Email, @"^[^@\s]+@[^@\s]+\.[^@\s]+$"))
                result.Errors.Add("Invalid email format.");
        }

        if (string.IsNullOrWhiteSpace(request.Password))
            result.Errors.Add("Password is required.");
        else
        {
            if (request.Password.Length < 6)
                result.Errors.Add("Password must be at least 6 characters long.");
            if (request.Password.Length > 100)
                result.Errors.Add("Password cannot exceed 100 characters.");
            if (!Regex.IsMatch(request.Password, @"[0-9]") || !Regex.IsMatch(request.Password, @"[!@#$%^&*(),.?""{}|<>]"))
                result.Errors.Add("Password must contain at least one number and one special character.");
        }

        if (request.AvatarImage == null || request.AvatarImage.Length == 0)
            result.Errors.Add("Avatar image is required.");

        result.IsValid = result.Errors.Count == 0;
        return result;
    }

    public ValidationResult ValidateLoginRequest(LoginRequestDto request)
    {
        var result = new ValidationResult();

        if (request == null)
        {
            result.Errors.Add("Request cannot be null.");
            result.IsValid = false;
            return result;
        }

        if (string.IsNullOrWhiteSpace(request.Username))
            result.Errors.Add("Username is required.");

        if (string.IsNullOrWhiteSpace(request.Password))
            result.Errors.Add("Password is required.");

        result.IsValid = result.Errors.Count == 0;
        return result;
    }

    public ValidationResult ValidateUserUpdateRequest(UpdateUserRequestDto request)
    {
        var result = new ValidationResult();

        if (request == null)
        {
            result.Errors.Add("Request cannot be null.");
            result.IsValid = false;
            return result;
        }

        if (request.UserId == Guid.Empty)
            result.Errors.Add("UserId is required.");

        if (!string.IsNullOrWhiteSpace(request.Username))
        {
            if (request.Username.Length < 3)
                result.Errors.Add("Username must be at least 3 characters long.");
            if (request.Username.Length > 50)
                result.Errors.Add("Username cannot exceed 50 characters.");
        }

        if (!string.IsNullOrWhiteSpace(request.Email))
        {
            if (request.Email.Length < 5)
                result.Errors.Add("Email must be at least 5 characters long.");
            if (request.Email.Length > 256)
                result.Errors.Add("Email cannot exceed 256 characters.");
            if (!Regex.IsMatch(request.Email, @"^[^@\s]+@[^@\s]+\.[^@\s]+$"))
                result.Errors.Add("Invalid email format.");
        }

        if (request.AvatarImage != null && request.AvatarImage.Length > 0)
        {
            if (request.AvatarImage.Length > 1 * 1024 * 1024)
                result.Errors.Add("Avatar image cannot exceed 1MB.");
        }

        result.IsValid = result.Errors.Count == 0;
        return result;
    }
}
public class ValidationResult
{
    public bool IsValid { get; set; }
    public List<string> Errors { get; set; } = new();
}
