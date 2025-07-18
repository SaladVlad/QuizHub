namespace ResultService.Api.Services;

public class UserServiceClient : IUserServiceClient
{
    private readonly HttpClient _httpClient;

    public UserServiceClient(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }


    //public async Task<UserDto?> GetUserByIdAsync(Guid id)
    //{
    //    var response = await _httpClient.GetAsync($"/api/users/{id}");
    //    if (!response.IsSuccessStatusCode) return null;

    //    return await response.Content.ReadFromJsonAsync<UserDto>();
    //}
}
