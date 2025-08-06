using System.ComponentModel.DataAnnotations;

namespace UserService.Api.Domain.Entities;

public class User
{
    public Guid Id { get; set; }
    [Required]
    public required string Username { get; set; }
    [Required]
    public required string Email { get; set; }
    [Required]
    public required byte[] PasswordHash { get; set; }
    [Required]
    public required byte[] PasswordSalt { get; set; }
    public byte[] AvatarImage { get; set; } = Array.Empty<byte>();
    public required string Role { get; set; }
    
}

