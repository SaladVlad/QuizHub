using UserService.Api.Dtos.EntityDtos;

namespace UserService.Api.Utils;

public interface IJwtHelper
{
    string GenerateJwt(UserDto user, string key, int expireMinutes = 60);
}
