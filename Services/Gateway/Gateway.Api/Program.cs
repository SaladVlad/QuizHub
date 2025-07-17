using Ocelot.DependencyInjection;
using Ocelot.Middleware;

var builder = WebApplication.CreateBuilder(args);

builder.Logging.ClearProviders();
builder.Logging.AddConsole();

// Add Ocelot + config
builder.Configuration.AddJsonFile("ocelot.json", optional: false, reloadOnChange: true);
builder.Services.AddOcelot();

builder.WebHost.UseUrls("http://*:80");

var app = builder.Build();

app.MapGet("/", () => "Gateway is running");
app.MapControllers();

await app.UseOcelot();
await app.RunAsync();
