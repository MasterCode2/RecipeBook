using Microsoft.EntityFrameworkCore;

public class RecipeBookContext:DbContext
{
    public RecipeBookContext(DbContextOptions<RecipeBookContext> options)   
        : base(options)
    {

    }

    public DbSet<Recipe> Recipes => Set<Recipe>();
}