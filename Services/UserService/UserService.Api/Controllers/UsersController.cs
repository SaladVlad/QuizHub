using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using UserService.Api.Dtos.Requests;
using UserService.Api.Services.UserService;

namespace UserService.Api.Controllers;

[ApiController]
[Route("api/users/")]
[Authorize]
public class UserController : ControllerBase
{
    private readonly IUserService _userService;

    public UserController(IUserService userService)
    {
        _userService = userService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] bool includeImages = false)
    {
        var result = await _userService.GetAllUsers(includeImages);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, [FromQuery] bool includeImage = false)
    {
        var result = await _userService.GetById(id, includeImage);
        return result.Success ? Ok(result.Data) : NotFound(result.Errors);
    }

    [HttpGet("by-username/{username}")]
    public async Task<IActionResult> GetByUsername(string username, bool includeImage)
    {
        var user = await _userService.GetByUsername(username, includeImage);
        return user != null ? Ok(user) : NotFound("User not found.");
    }

    [HttpGet("by-email/{email}")]
    public async Task<IActionResult> GetByEmail(string email, bool includeImage)
    {
        var user = await _userService.GetByEmail(email, includeImage);
        return user != null ? Ok(user) : NotFound("User not found.");
    }

    [HttpPut("update")]
    public async Task<IActionResult> UpdateUser([FromForm] UpdateUserRequestDto request)
    {
        var result = await _userService.UpdateUserInfo(request);
        return result.Success ? Ok("User updated successfully.") : BadRequest(result.Errors);
    }

    [HttpPut("{id:guid}/promote")]
    public async Task<IActionResult> PromoteToAdmin(Guid id)
    {
        var result = await _userService.PromoteToAdmin(id);
        return result.Success ? Ok("User promoted to Admin.") : NotFound(result.Errors);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var result = await _userService.DeleteUser(id);
        return result.Success ? Ok("User deleted successfully.") : NotFound(result.Errors);
    }

    [HttpPut("reset-password")]
    public async Task<IActionResult> ChangePassword([FromBody] ResetPasswordRequestDto request)
    {
        var result = await _userService.ChangePassword(request);
        return result.Success ? Ok("Password changed successfully.") : BadRequest(result.Errors);
    }
}
