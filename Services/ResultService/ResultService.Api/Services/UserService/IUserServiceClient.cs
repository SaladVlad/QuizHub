using ResultService.Api.Dtos.User;

namespace ResultService.Api.Services.UserService;

public interface IUserServiceClient
{
    Task<UserDto?> GetUserAsync(Guid userId);
    Task<Dictionary<Guid, UserDto>> GetUsersBatchAsync(IEnumerable<Guid> userIds);
}
