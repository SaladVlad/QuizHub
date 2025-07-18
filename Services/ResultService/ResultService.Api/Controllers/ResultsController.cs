using Microsoft.AspNetCore.Mvc;
using ResultService.Api.Services;

namespace UserService.Api.Controllers;

[ApiController]
[Route("api/results/")]
public class ResultsController : ControllerBase
{
    private readonly IUserServiceClient _userService;

    public ResultsController(IUserServiceClient userServiceClient)
    {
        _userService = userServiceClient;
    }

    [HttpGet("hello")]
    public IActionResult Hello() => Ok("Hello from UserService!");

    [HttpGet("check-user/{id}")]
    public async Task<IActionResult> CheckUser(Guid id)
    {
        var user = /*await _userService.GetUserByIdAsync(id);*/
            "User 123";
        if (user == null) return NotFound("User not found");
        return Ok(user);
    }
}
