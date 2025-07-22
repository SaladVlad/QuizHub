namespace UserService.Api.Dtos
{
    public class RegisterRequestDto
    {
        public string Username { get; set; } = default!;
        public string Email { get; set; } = default!;
        public string Password { get; set; } = default!;
        public IFormFile AvatarImage { get; set; } = default!;
    }
}
