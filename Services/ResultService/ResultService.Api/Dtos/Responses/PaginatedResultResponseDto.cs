namespace ResultService.Api.Dtos.Responses;

public class PaginatedResultResponseDto
{
    public List<ResultResponseDto> Items { get; set; } = new();
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalItems { get; set; }
    public int TotalPages { get; set; }
}