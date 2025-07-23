namespace UserService.Api.Dtos.Results;

public class ServiceResult
{
    public bool Success { get; set; }
    public List<string> Errors { get; set; } = new();

    public static ServiceResult Ok() => new() { Success = true };
    public static ServiceResult Fail(params string[] errors) =>
        new() { Success = false, Errors = errors.ToList() };
}
public class ServiceResult<T> : ServiceResult
{
    public T? Data { get; set; }

    public static ServiceResult<T> Ok(T data) =>
        new() { Success = true, Data = data };

    public new static ServiceResult<T> Fail(params string[] errors) =>
        new() { Success = false, Errors = errors.ToList() };
}
