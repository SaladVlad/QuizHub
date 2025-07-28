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

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins("http://localhost:3000")
              .AllowAnyHeader()
              .AllowAnyMethod();
        policy.WithOrigins("http://frontend:80")
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});


builder.Services.AddOcelot(builder.Configuration);

// 5. Set production port
if (builder.Environment.IsProduction())
{
    builder.WebHost.UseUrls("http://*:80");
}

var app = builder.Build();

app.MapGet("/", () => $"Gateway is running in {environment} environment");
app.MapControllers();

try
{
    await app.UseOcelot();
    Console.WriteLine("Ocelot middleware initialized successfully");
}
catch (Exception ex)
{
    Console.WriteLine($"Error initializing Ocelot: {ex}");
    throw;
}

await app.RunAsync();