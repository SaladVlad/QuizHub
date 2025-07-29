using System.ComponentModel.DataAnnotations;

namespace UserService.Api.Dtos.Requests;

public class LoginRequestDto
{
    [Required(ErrorMessage = "Username or email is required")]
    public string UsernameOrEmail { get; set; } = default!;
    
    [Required(ErrorMessage = "Password is required")]
    public string Password { get; set; } = default!;
}
