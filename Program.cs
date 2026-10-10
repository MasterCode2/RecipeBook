using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Configuration.AddUserSecrets<RecipeBookContext>();

var connectionString = builder.Configuration.GetConnectionString("RecipeBook");

builder.Services.AddDbContext<RecipeBookContext>(options =>
{
    options.UseNpgsql(connectionString);
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

app.UseSwagger();
app.UseSwaggerUI();


app.MapPost("/recipes", (CreateRecipeRequest request, RecipeBookContext context) =>
{
    if (string.IsNullOrWhiteSpace(request.Title))
    {
        return Results.BadRequest("Название рецепта обязательно!");
    }

    if (request.Ingredients == null || request.Ingredients.Count == 0) return Results.BadRequest("Ингредиенты обязательны!");

    foreach (var str in request.Ingredients)
    {
        if (string.IsNullOrWhiteSpace(str)) return Results.BadRequest("Ингредиенты введены неверно!");
    }

    if (request.Steps == null || request.Steps.Count == 0) return Results.BadRequest("Написание шагов обязательно!");

    foreach (var str in request.Steps)
    {
        if (string.IsNullOrWhiteSpace(str)) return Results.BadRequest("Шаги введены неверно!");
    }

    if (request.CookingTimeMinutes < 1 || request.CookingTimeMinutes > 1440) return Results.BadRequest("Время приготовления должно быть от 1 до 1440!");


    var newRecipe = new Recipe();

    newRecipe.Title = request.Title;
    newRecipe.Ingredients = request.Ingredients;
    newRecipe.Steps = request.Steps;
    newRecipe.Notes = request.Notes;
    newRecipe.CookingTimeMinutes = request.CookingTimeMinutes;

    context.Recipes.Add(newRecipe);
    context.SaveChanges();

    return Results.Ok(newRecipe);
});

app.MapGet("/recipes/{id:int}", (int id, RecipeBookContext context) =>
{
    var foundRecipe = context.Recipes.Find(id);

    if (foundRecipe == null) return Results.NotFound("Рецепт не найден!");
    else return Results.Ok(foundRecipe);
});

app.MapDelete("/recipes/{id:int}", (int id, RecipeBookContext context) =>
{
    var foundRecipe = context.Recipes.Find(id);

    if (foundRecipe != null) 
    {
        context.Recipes.Remove(foundRecipe);
        context.SaveChanges();
        return Results.NoContent();
    }
    else return Results.NotFound("Рецепт не найден!");
});

app.MapPut("/recipes/{id:int}", (int id, UpdateRecipeRequest updatedRequest, RecipeBookContext context) =>
{
    if (string.IsNullOrWhiteSpace(updatedRequest.Title)) return Results.BadRequest("Название рецепта обязательно!");

    if (updatedRequest.Ingredients == null || updatedRequest.Ingredients.Count == 0) return Results.BadRequest("Ингредиенты обязательны!");

    foreach (var str in updatedRequest.Ingredients)
    {
        if (string.IsNullOrWhiteSpace(str)) return Results.BadRequest("Ингредиенты введены неверно!");
    }

    if (updatedRequest.Steps == null || updatedRequest.Steps.Count == 0) return Results.BadRequest("Написание шагов обязательно!");

    foreach (var str in updatedRequest.Steps)
    {
        if (string.IsNullOrWhiteSpace(str)) return Results.BadRequest("Шаги введены неверно!");
    }

    if (updatedRequest.CookingTimeMinutes < 1 || updatedRequest.CookingTimeMinutes > 1440) return Results.BadRequest("Время приготовления должно быть от 1 до 1440!");

    var foundRecipe = context.Recipes.Find(id);

    if (foundRecipe == null) return Results.NotFound("Рецепт не найден!");
    else
    {
        foundRecipe.Title = updatedRequest.Title;
        foundRecipe.Ingredients = updatedRequest.Ingredients;
        foundRecipe.Steps = updatedRequest.Steps;
        foundRecipe.Notes = updatedRequest.Notes;
        foundRecipe.CookingTimeMinutes = updatedRequest.CookingTimeMinutes;
        context.SaveChanges();
        return Results.Ok(foundRecipe);
    }
});

app.MapGet("/recipes", (int? maxCookingTime, string? title, RecipeBookContext context, int page = 1, int pageSize = 10) =>
{
    if (page < 1 || page > 10_000) return Results.BadRequest("Номер страницы должен быть в промежутке от 1 до 10000!");
    if (pageSize < 1 || pageSize > 100) return Results.BadRequest("Количество рецептов в странице должно быть в промежутке от 1 до 100!");

    var query = context.Recipes.AsQueryable();

    if (maxCookingTime != null)
    {
        if (maxCookingTime < 1 || maxCookingTime > 1440) return Results.BadRequest("Время готовки должно быть от 1 до 1440 минут!");
        query = query.Where(recipe => recipe.CookingTimeMinutes <= maxCookingTime);
    }

    if (title != null) 
    {
        if (string.IsNullOrWhiteSpace(title)) return Results.BadRequest("Название не может быть пустым!");

        var pattern = "%" + title.Trim() + "%";

        query = query.Where(recipe => EF.Functions.ILike(recipe.Title, pattern));
    }

    var totalCount = query.Count();

    var foundRecipes = query
    .OrderBy(recipe => recipe.CookingTimeMinutes)
    .ThenBy(recipe => recipe.Id)
    .Skip((page - 1) * pageSize)
    .Take(pageSize)
    .ToList();
    
    return Results.Ok(new
    {
        Items = foundRecipes,
        TotalCount = totalCount,
        Page = page,
        PageSize = pageSize

    });
});

app.Run();
