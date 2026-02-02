using Ocelot.DependencyInjection;
using Ocelot.Middleware;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Serilog;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;

var builder = WebApplication.CreateBuilder(args);

// Configure Serilog
Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .CreateLogger();

builder.Host.UseSerilog();

// Configure OpenTelemetry Tracing
builder.Services.AddOpenTelemetry()
    .ConfigureResource(resource => resource
        .AddService(serviceName: "gateway-service", serviceVersion: "1.0.0")
        .AddAttributes(new Dictionary<string, object>
        {
            ["environment"] = builder.Environment.EnvironmentName,
            ["service.type"] = "api-gateway"
        }))
    .WithTracing(tracing => tracing
        .AddAspNetCoreInstrumentation(options =>
        {
            options.RecordException = true;
            options.EnrichWithHttpRequest = (activity, httpRequest) =>
            {
                activity.SetTag("http.request.size", httpRequest.ContentLength);
                activity.SetTag("http.request.path", httpRequest.Path);
            };
            options.EnrichWithHttpResponse = (activity, httpResponse) =>
            {
                activity.SetTag("http.response.size", httpResponse.ContentLength);
            };
        })
        .AddHttpClientInstrumentation(options =>
        {
            options.RecordException = true;
            options.EnrichWithHttpRequestMessage = (activity, httpRequestMessage) =>
            {
                activity.SetTag("http.request.url", httpRequestMessage.RequestUri?.ToString());
            };
            options.EnrichWithHttpResponseMessage = (activity, httpResponseMessage) =>
            {
                activity.SetTag("http.response.status_code", (int)httpResponseMessage.StatusCode);
            };
        })
        .AddOtlpExporter(options =>
        {
            options.Endpoint = new Uri(builder.Configuration["OpenTelemetry:OtlpEndpoint"]
                ?? "http://jaeger.observability.svc.cluster.local:4317");
        }));

// Clear default providers and let Serilog handle logging
builder.Logging.ClearProviders();

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

// Add custom logging middleware to log all gateway activities
app.Use(async (context, next) =>
{
    var logger = context.RequestServices.GetRequiredService<ILogger<Program>>();
    var startTime = DateTime.UtcNow;
    var requestId = Guid.NewGuid();
    
    logger.LogInformation("Gateway Request Started: {RequestId} {Method} {Path} from {RemoteIpAddress}",
        requestId, context.Request.Method, context.Request.Path, context.Connection.RemoteIpAddress);
    
    await next();
    
    var endTime = DateTime.UtcNow;
    var elapsed = endTime - startTime;
    
    logger.LogInformation("Gateway Request Completed: {RequestId} {Method} {Path} responded {StatusCode} in {ElapsedMs}ms",
        requestId, context.Request.Method, context.Request.Path, context.Response.StatusCode, elapsed.TotalMilliseconds);
});

app.MapGet("/", () => $"Gateway is running in {environment} environment");
app.MapControllers();

try
{
    app.UseRouting();
    app.UseCors();
    app.UseAuthentication();
    app.UseAuthorization();
    
    await app.UseOcelot();
    Log.Information("Ocelot middleware initialized successfully");
}
catch (Exception ex)
{
    Log.Fatal(ex, "Error initializing Ocelot");
    throw;
}

try
{
    Log.Information("Starting Gateway Service");
    await app.RunAsync();
}
catch (Exception ex)
{
    Log.Fatal(ex, "Gateway Service terminated unexpectedly");
}
finally
{
    Log.CloseAndFlush();
}