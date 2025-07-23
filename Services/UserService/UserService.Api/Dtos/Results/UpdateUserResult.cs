namespace UserService.Api.Dtos.Results;
public class UpdateUserResult
{
    public bool Success { get; set; }
    public List<string> Errors { get; set; } = new();
}
