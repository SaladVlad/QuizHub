using Microsoft.AspNetCore.Mvc;

namespace UserService.Api.Controllers;

[ApiController]
[Route("api/users")]
public class UserController : ControllerBase
{
    [HttpGet("hello")]
    public IActionResult Hello() => Ok("Hello from UserService!");
}
