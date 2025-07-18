using Microsoft.EntityFrameworkCore;
using QuizService.Api.Domain.Entities;

namespace QuizService.Api.Data;

public class QuizDbContext : DbContext
{
    public QuizDbContext(DbContextOptions<QuizDbContext> options) : base(options) { }

    public DbSet<Quiz> Users => Set<Quiz>();
    public DbSet<Question> Questions => Set<Question>();
    public DbSet<Answer> Answers => Set<Answer>();
}
