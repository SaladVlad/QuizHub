using Ocelot.DependencyInjection;
using Ocelot.Middleware;
using Microsoft.Extensions.Configuration;

var builder = WebApplication.CreateBuilder(args);

builder.Logging.ClearProviders();
builder.Logging.AddConsole();

// 1. Add environment variables first
builder.Configuration.AddEnvironmentVariables();

// 2. Get current environment
string environment = builder.Environment.EnvironmentName;

// 3. Load environment-specific configuration
builder.Configuration
    .SetBasePath(Directory.GetCurrentDirectory())
    .AddJsonFile($"ocelot.{environment}.json", optional: false, reloadOnChange: true)
    .AddJsonFile("ocelot.json", optional: true, reloadOnChange: true);

// 4. Configure Ocelot with validation
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