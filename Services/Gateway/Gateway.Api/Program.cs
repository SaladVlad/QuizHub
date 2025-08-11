using Ocelot.DependencyInjection;
using Ocelot.Middleware;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;

var builder = WebApplication.CreateBuilder(args);

builder.Logging.ClearProviders();
builder.Logging.AddConsole();

builder.Configuration.AddEnvironmentVariables();
string environment = builder.Environment.EnvironmentName;

builder.Configuration
    .SetBasePath(Directory.GetCurrentDirectory())
    .AddJsonFile($"ocelot.{environment}.json", optional: false, reloadOnChange: true)
    .AddJsonFile("ocelot.json", optional: true, reloadOnChange: true);


builder.Services.AddAuthentication()
    .AddJwtBearer("JwtBearer" ,options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = false,
            ValidateAudience = false,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]!))
        };
    });

// Configure CORS to allow requests from the frontend
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(
                "http://localhost:3000",  // Local development
                "http://frontend:80",     // Docker network
                "http://localhost:5004"   // Gateway URL for testing
            )
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials()
            .WithExposedHeaders("Content-Disposition");
    });
});

builder.Services.AddOcelot(builder.Configuration);

if (builder.Environment.IsProduction())
{
    builder.WebHost.UseUrls("http://*:80");
}

var app = builder.Build();

app.MapGet("/", () => $"Gateway is running in {environment} environment");
app.MapControllers();

try
{
    app.UseRouting();
    app.UseCors();
    app.UseAuthentication();
    app.UseAuthorization();
    
    await app.UseOcelot();
    Console.WriteLine("Ocelot middleware initialized successfully");
}
catch (Exception ex)
{
    Console.WriteLine($"Error initializing Ocelot: {ex}");
    throw;
}

await app.RunAsync();