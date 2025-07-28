using Microsoft.EntityFrameworkCore;
using UserService.Api.Domain.Entities;

namespace UserService.Api.Data;

public interface IUserDbContext
{
    DbSet<User> Users { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
