namespace UserService.Api.Dtos.EntityDtos
{
    public class UserDto
    {
        public Guid Id { get; set; }
        public string Username { get; set; } = default!;
        public string Email { get; set; } = default!;
        public string Role { get; set; } = default!;
        public byte[]? AvatarImage { get; set; }
    }
}