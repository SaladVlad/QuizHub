using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Polly;
using Polly.Extensions.Http;
using ResultService.Api.Data;
using ResultService.Api.Options;
using ResultService.Api.Services.GradingService;
using ResultService.Api.Services.LeaderboardService;
using ResultService.Api.Services.ResultService;
using ResultService.Api.Services.UserService;
using System.Net;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

// Configure Swagger with JWT Authentication
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "Result Service API", Version = "v1" });
    
    // Add JWT Authentication
    var securityScheme = new OpenApiSecurityScheme
    {
        Name = "JWT Authentication",
        Description = "Enter JWT Bearer token",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        Reference = new OpenApiReference
        {
            Id = JwtBearerDefaults.AuthenticationScheme,
            Type = ReferenceType.SecurityScheme
        }
    };
    c.AddSecurityDefinition(securityScheme.Reference.Id, securityScheme);
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        { securityScheme, Array.Empty<string>() }
    });
});

// Add JWT Authentication
var jwtKey = builder.Configuration["Jwt:Key"] ?? throw new InvalidOperationException("JWT Key is not configured");
var key = Encoding.ASCII.GetBytes(jwtKey);

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(key),
            ValidateIssuer = false,
            ValidateAudience = false,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.Zero
        };
    });

// Add DbContext
builder.Services.AddDbContext<ResultDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// Register services
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<IResultService, ResultService.Api.Services.ResultService.ResultService>();
builder.Services.AddScoped<ILeaderboardService, LeaderboardService>();
builder.Services.AddScoped<IGradingService, GradingService>();
builder.Services.AddScoped<IUserServiceClient, UserServiceClient>();

// Add logging
builder.Services.AddLogging();

// Configure QuizService HTTP client with retry policy
builder.Services.AddHttpClient("QuizService", (serviceProvider, client) =>
    {
        var config = serviceProvider.GetRequiredService<IConfiguration>();
        var quizServiceOptions = config.GetSection(QuizServiceOptions.SectionName).Get<QuizServiceOptions>();
        client.BaseAddress = new Uri(quizServiceOptions?.BaseUrl ?? throw new InvalidOperationException("QuizService BaseUrl is not configured"));
        client.Timeout = TimeSpan.FromSeconds(quizServiceOptions.TimeoutSeconds);
    })
    .AddPolicyHandler((serviceProvider, request) =>
    {
        var config = serviceProvider.GetRequiredService<IConfiguration>();
        var quizServiceOptions = config.GetSection(QuizServiceOptions.SectionName).Get<QuizServiceOptions>();
        
        return HttpPolicyExtensions
            .HandleTransientHttpError()
            .OrResult(msg => msg.StatusCode == System.Net.HttpStatusCode.NotFound)
            .WaitAndRetryAsync(
                quizServiceOptions?.MaxRetryAttempts ?? 3,
                retryAttempt => TimeSpan.FromSeconds(Math.Pow(2, retryAttempt)),
                onRetry: (outcome, timespan, retryAttempt, context) =>
                {
                    var logger = serviceProvider.GetRequiredService<ILogger<Program>>();
                    logger.LogWarning("Delaying for {delay}ms, then making retry {retry}.", timespan.TotalMilliseconds, retryAttempt);
                });
    });

// Configure UserService HTTP client with retry policy
builder.Services.AddHttpClient("UserService", (serviceProvider, client) =>
    {
        var config = serviceProvider.GetRequiredService<IConfiguration>();
        var userServiceOptions = config.GetSection(UserServiceOptions.SectionName).Get<UserServiceOptions>();
        client.BaseAddress = new Uri(userServiceOptions?.BaseUrl ?? throw new InvalidOperationException("UserService BaseUrl is not configured"));
        client.Timeout = TimeSpan.FromSeconds(userServiceOptions.TimeoutSeconds);
    })
    .AddPolicyHandler((serviceProvider, request) =>
    {
        var config = serviceProvider.GetRequiredService<IConfiguration>();
        var userServiceOptions = config.GetSection(UserServiceOptions.SectionName).Get<UserServiceOptions>();
        
        return HttpPolicyExtensions
            .HandleTransientHttpError()
            .OrResult(msg => msg.StatusCode == System.Net.HttpStatusCode.NotFound)
            .WaitAndRetryAsync(
                userServiceOptions?.MaxRetryAttempts ?? 2,
                retryAttempt => TimeSpan.FromSeconds(Math.Pow(1.5, retryAttempt)),
                onRetry: (outcome, timespan, retryAttempt, context) =>
                {
                    var logger = serviceProvider.GetRequiredService<ILogger<Program>>();
                    logger.LogWarning("UserService request failed. Delaying for {delay}ms, then making retry {retry}.", timespan.TotalMilliseconds, retryAttempt);
                });
    });

// Add HTTP client for any other external service calls
builder.Services.AddHttpClient();

if (builder.Environment.IsProduction())
{
    builder.WebHost.UseUrls("http://*:80");
}

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<ResultDbContext>();
    db.Database.Migrate();
}

// Middleware
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseRouting();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();
