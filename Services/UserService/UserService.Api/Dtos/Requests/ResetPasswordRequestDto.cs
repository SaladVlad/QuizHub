using System.ComponentModel.DataAnnotations;

namespace UserService.Api.Dtos.Requests;

public class ResetPasswordRequestDto
{
    [Required]
    public Guid UserId { get; set; }
    [Required]
    public string NewPassword { get; set; } = default!;
    [Required]
    public string ConfirmPassword { get; set; } = default!;
}
