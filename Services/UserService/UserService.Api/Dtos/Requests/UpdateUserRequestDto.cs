namespace UserService.Api.Dtos.Requests;

public class UpdateUserRequestDto
{
    public Guid UserId { get; set; }
    public string? Username { get; set; } = default!;
    public string? Email { get; set; } = default!;
    public IFormFile? AvatarImage { get; set; } = default!;
}
