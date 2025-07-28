using System.ComponentModel.DataAnnotations;

namespace UserService.Api.Domain.Entities;

public class User
{
    public Guid Id { get; set; }
    [Required]
    public string Username { get; set; }
    [Required]
    public string Email { get; set; }
    [Required]
    public byte[] PasswordHash { get; set; }
    [Required]
    public byte[] PasswordSalt { get; set; }
    public byte[] AvatarImage { get; set; } = Array.Empty<byte>();
    public string Role { get; set; }
    
}

