using Microsoft.AspNetCore.Identity.Data;
using UserService.Api.Dtos.EntityDtos;
using UserService.Api.Dtos.Requests;
using UserService.Api.Dtos.Results;

namespace UserService.Api.Services.UserService;

public interface IUserService
{
    Task<ServiceResult<UserDto>> GetById(Guid id, bool includeImage = false);
    Task<ServiceResult<UserDto?>> GetByUsername(string username, bool includeImage = false);
    Task<ServiceResult<UserDto?>> GetByEmail(string email, bool includeImage = false);
    Task<ServiceResult<List<UserDto>?>> GetAllUsers(bool includeImage = false);
    Task<ServiceResult> DeleteUser(Guid id);
    Task<ServiceResult> UpdateUserInfo(UpdateUserRequestDto request);
    Task<ServiceResult> ChangePassword(ResetPasswordRequestDto request);
    Task<ServiceResult> PromoteToAdmin(Guid id);
}
