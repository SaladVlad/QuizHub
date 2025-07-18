using Microsoft.EntityFrameworkCore;
using ResultService.Api.Domain.Entities;
namespace ResultService.Api.Data;

public class ResultDbContext : DbContext
{
    public ResultDbContext(DbContextOptions<ResultDbContext> options) : base(options) { }

    public DbSet<Result> Results => Set<Result>();
    public DbSet<ResultAnswer> ResultAnswers => Set<ResultAnswer>();
}
