using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

public class RecipeBookTestFactory : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        string databaseName = Guid.NewGuid().ToString();

        builder.ConfigureTestServices(services =>
        {
            services.RemoveAll<IDbContextOptionsConfiguration<RecipeBookContext>>();
            services.RemoveAll<DbContextOptions<RecipeBookContext>>();

            services.AddDbContext<RecipeBookContext>(options =>
            {
                options.UseInMemoryDatabase(databaseName);
            });
        });
    }
}

