using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;
using System.Text;
using UserService.Api.Data;
using UserService.Api.Domain.Entities;
using UserService.Api.Dtos.EntityDtos;
using UserService.Api.Dtos.Requests;

namespace UserService.Api.Services.AuthService;


public class AuthService : IAuthService
{
    private readonly IUserDbContext _context;

    public AuthService(IUserDbContext dbContext)
    {
        _context = dbContext;
    }

    public async Task<UserDto?> AuthenticateAsync(LoginRequestDto request)
    {
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Username == request.UsernameOrEmail || u.Email == request.UsernameOrEmail);

        if (user == null || !VerifyPassword(request.Password, user.PasswordHash, user.PasswordSalt))
            return null;

        return new UserDto
        {
            Id = user.Id,
            Username = user.Username,
            Email = user.Email,
            FirstName = user.FirstName,
            LastName = user.LastName,
            Role = user.Role
        };
    }

    public async Task<UserDto> RegisterAsync(RegisterRequestDto request)
    {
        if (await _context.Users.AnyAsync(u => u.Username == request.Username || u.Email == request.Email))
            throw new InvalidOperationException("User already exists");

        CreatePasswordHash(request.Password, out byte[] hash, out byte[] salt);

        byte[] avatarBytes = Array.Empty<byte>();

        if (request.AvatarImage != null && request.AvatarImage.Length > 0)
        {
            using var memoryStream = new MemoryStream();
            await request.AvatarImage.CopyToAsync(memoryStream);
            avatarBytes = memoryStream.ToArray();
        }

        var user = new User
        {
            Id = Guid.NewGuid(),
            Username = request.Username,
            Email = request.Email,
            FirstName = request.FirstName,
            LastName = request.LastName,
            PasswordHash = hash,
            PasswordSalt = salt,
            Role = "User",
            AvatarImage = avatarBytes
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        return new UserDto
        {
            Id = user.Id,
            Username = user.Username,
            Email = user.Email,
            FirstName = user.FirstName,
            LastName = user.LastName,
            Role = user.Role
        };
    }


    private void CreatePasswordHash(string password, out byte[] hash, out byte[] salt)
    {
        using var hmac = new HMACSHA512();
        salt = hmac.Key;
        hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(password));
    }

    private bool VerifyPassword(string password, byte[] storedHash, byte[] storedSalt)
    {
        using var hmac = new HMACSHA512(storedSalt);
        var computedHash = hmac.ComputeHash(Encoding.UTF8.GetBytes(password));
        return computedHash.SequenceEqual(storedHash);
    }
}
