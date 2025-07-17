using Microsoft.AspNetCore.Mvc;

namespace UserService.Api.Controllers;

[ApiController]
[Route("api/results/")]
public class ResultsController : ControllerBase
{
    [HttpGet("hello")]
    public IActionResult Hello() => Ok("Hello from UserService!");
}
