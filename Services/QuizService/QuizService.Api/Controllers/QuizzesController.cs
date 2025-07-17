using Microsoft.AspNetCore.Mvc;

namespace UserService.Api.Controllers;

[ApiController]
[Route("api/quizzes")]
public class QuizzesController : ControllerBase
{
    [HttpGet("hello")]
    public IActionResult Hello() => Ok("Hello from UserService!");
}
