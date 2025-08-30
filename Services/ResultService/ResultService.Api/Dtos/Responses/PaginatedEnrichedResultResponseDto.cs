namespace ResultService.Api.Dtos.Responses;

public class PaginatedEnrichedResultResponseDto
{
    public List<EnrichedResultResponseDto> Items { get; set; } = new();
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalItems { get; set; }
    public int TotalPages { get; set; }
}