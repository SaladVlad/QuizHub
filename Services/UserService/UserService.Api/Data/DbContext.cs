using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using UserService.Api.Domain.Entities;

namespace UserService.Api.Data;

public class UserDbContext : DbContext
{
    public UserDbContext(DbContextOptions<UserDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
}
