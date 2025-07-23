using Microsoft.EntityFrameworkCore;
using UserService.Api.Data;
using UserService.Api.Dtos.Requests;
using UserService.Api.Dtos.Results;
using UserService.Api.Services.UserValidationService;
using System.Security.Cryptography;
using System.Text;
using UserService.Api.Dtos.EntityDtos;

namespace UserService.Api.Services.UserService;

public class UserService : IUserService
{
    private readonly IUserDbContext _context;
    private readonly IUserValidationService _userValidationService;

    public UserService(IUserDbContext context, IUserValidationService userValidationService)
    {
        _context = context;
        _userValidationService = userValidationService;
    }

    public async Task<ServiceResult<List<UserDto>>> GetAllUsers(bool includeImages = false)
    {
        var users = await _context.Users.Select(user => new UserDto
        {
            Id = user.Id,
            Username = user.Username,
            Email = user.Email,
            Role = user.Role,
            AvatarImage = includeImages ? user.AvatarImage : null
        }).ToListAsync();

        return ServiceResult<List<UserDto>>.Ok(users);
    }

    public async Task<ServiceResult<UserDto>> GetById(Guid id, bool includeImage)
    {
        var user = await _context.Users
            .Where(u => u.Id == id)
            .Select(u => new UserDto
            {
                Id = u.Id,
                Username = u.Username,
                Email = u.Email,
                Role = u.Role,
                AvatarImage = includeImage ? u.AvatarImage : null 
            })
            .FirstOrDefaultAsync();

        return user == null
            ? ServiceResult<UserDto>.Fail("User not found.")
            : ServiceResult<UserDto>.Ok(user);
    }

    public async Task<ServiceResult<UserDto>> GetByUsername(string username, bool includeImage)
    {
        var user = await _context.Users
            .Where(u => u.Username == username)
            .Select(u => new UserDto
            {
                Id = u.Id,
                Username = u.Username,
                Email = u.Email,
                Role = u.Role,
                AvatarImage = includeImage ? u.AvatarImage : null
            })
            .FirstOrDefaultAsync();

        return user == null
            ? ServiceResult<UserDto>.Fail("User not found.")
            : ServiceResult<UserDto>.Ok(user);
    }

    public async Task<ServiceResult<UserDto>> GetByEmail(string email, bool includeImage)
    {
        var user = await _context.Users
            .Where(u => u.Email == email)
            .Select(u => new UserDto
            {
                Id = u.Id,
                Username = u.Username,
                Email = u.Email,
                Role = u.Role,
                AvatarImage = includeImage ? u.AvatarImage : null
            })
            .FirstOrDefaultAsync();

        return user == null
            ? ServiceResult<UserDto>.Fail("User not found.")
            : ServiceResult<UserDto>.Ok(user);
    }

    public async Task<ServiceResult> UpdateUserInfo(UpdateUserRequestDto request)
    {
        var validation = _userValidationService.ValidateUserUpdateRequest(request);
        if (!validation.IsValid)
            return ServiceResult.Fail(validation.Errors.ToArray());

        var existingUser = await _context.Users
            .FirstOrDefaultAsync(u =>
                (u.Email == request.Email || u.Username == request.Username) &&
                u.Id != request.UserId);

        if (existingUser != null)
            return ServiceResult.Fail("Email or username already taken.");

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == request.UserId);
        if (user == null)
            return ServiceResult.Fail("User not found.");

        if (!string.IsNullOrWhiteSpace(request.Email)) user.Email = request.Email;
        if (!string.IsNullOrWhiteSpace(request.Username)) user.Username = request.Username;
        if (request.AvatarImage != null && request.AvatarImage.Length > 0)
        {
            using var ms = new MemoryStream();
            await request.AvatarImage.CopyToAsync(ms);
            user.AvatarImage = ms.ToArray();
        }

        await _context.SaveChangesAsync();
        return ServiceResult.Ok();
    }

    public async Task<ServiceResult> ChangePassword(ResetPasswordRequestDto request)
    {
        if (request.UserId == Guid.Empty || string.IsNullOrWhiteSpace(request.NewPassword))
            return ServiceResult.Fail("Invalid input.");

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == request.UserId);
        if (user == null)
            return ServiceResult.Fail("User not found.");

        CreatePasswordHash(request.NewPassword, out byte[] hash, out byte[] salt);
        user.PasswordHash = hash;
        user.PasswordSalt = salt;

        await _context.SaveChangesAsync();
        return ServiceResult.Ok();
    }

    public async Task<ServiceResult> DeleteUser(Guid id)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == id);
        if (user == null)
            return ServiceResult.Fail("User not found.");

        _context.Users.Remove(user);
        await _context.SaveChangesAsync();
        return ServiceResult.Ok();
    }

    public async Task<ServiceResult> PromoteToAdmin(Guid id)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == id);
        if (user == null)
            return ServiceResult.Fail("User not found.");

        user.Role = "Admin";
        _context.Users.Update(user);
        await _context.SaveChangesAsync();
        return ServiceResult.Ok();
    }

    // Utility method for password hashing
    private void CreatePasswordHash(string password, out byte[] hash, out byte[] salt)
    {
        using var hmac = new HMACSHA512();
        salt = hmac.Key;
        hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(password));
    }
}
