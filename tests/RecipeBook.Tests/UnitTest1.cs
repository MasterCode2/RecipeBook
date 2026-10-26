using System.Net;
using Microsoft.AspNetCore.Mvc.Testing;
using System.Text.Json;
using System.Net.Http.Json;

namespace RecipeBook.Tests;

public class UnitTest1
{
    [Theory]
    [InlineData ("/recipes?page=0")]
    [InlineData ("/recipes?pageSize=0")]
    [InlineData ("/recipes?pageSize=101")]
    public async Task GetRecipes_InvalidPagination_ReturnsBadRequest(string url)
    {
        using RecipeBookTestFactory factory = new();
        using HttpClient client = factory.CreateClient();

        using HttpResponseMessage response = await client.GetAsync(url);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Theory]
    [InlineData(1, 10)]
    [InlineData(4, 15)]
    [InlineData(7, 20)]
    public async Task GetRecipes_ValidPagination_ReturnsOk(int expectedPage, int expectedPageSize)
    {
        using RecipeBookTestFactory factory = new();
        using HttpClient client = factory.CreateClient();

        using HttpResponseMessage response = await client.GetAsync(
            $"/recipes?page={expectedPage}&pageSize={expectedPageSize}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        string json = await response.Content.ReadAsStringAsync();
        using JsonDocument document = JsonDocument.Parse(json);

        int page = document.RootElement.GetProperty("page").GetInt32();
        int pageSize = document.RootElement.GetProperty("pageSize").GetInt32();
        int countRecipesOnPage = document.RootElement.GetProperty("items").GetArrayLength();

        Assert.Equal(expectedPage, page);
        Assert.Equal(expectedPageSize, pageSize);
        Assert.True(countRecipesOnPage <= expectedPageSize);
    }

    [Fact]
    public async Task GetRecipes_EmptyDatabase_ReturnsZeroRecipes()
    {
        using RecipeBookTestFactory factory = new();
        using HttpClient client = factory.CreateClient();

        using HttpResponseMessage response = await client.GetAsync("/recipes");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        string json = await response.Content.ReadAsStringAsync();
        using JsonDocument document = JsonDocument.Parse(json);

        int totalCount = document.RootElement.GetProperty("totalCount").GetInt32();
        int countRecipesOnPage = document.RootElement.GetProperty("items").GetArrayLength();

        Assert.Equal(0, totalCount);
        Assert.Equal(0, countRecipesOnPage);
    }

    [Fact]
    public async Task CreateRecipe_ValidData_ReturnsSuccess()
    {
        using RecipeBookTestFactory factory = new();
        using HttpClient client = factory.CreateClient();

        CreateRecipeRequest recipe = new()
        {
            Title = "Пицца",
            Ingredients = new List<string> {"Тесто", "Томат", "Сыр", "Колбаса"},
            Steps = new List<string> {"Подготовить", "Пожарить"},
            CookingTimeMinutes = 40
        };

        using HttpResponseMessage responsePost = await client.PostAsJsonAsync("/recipes", recipe);

        Assert.True(responsePost.IsSuccessStatusCode);

        using HttpResponseMessage responseGet = await client.GetAsync("/recipes");

        string json = await responseGet.Content.ReadAsStringAsync();
        using JsonDocument document = JsonDocument.Parse(json);

        int totalCount = document.RootElement.GetProperty("totalCount").GetInt32();

        JsonElement firstElement = document.RootElement.GetProperty("items")[0];

        string? title = firstElement.GetProperty("title").GetString();

        Assert.Equal(1, totalCount);
        Assert.Equal(recipe.Title, title);
    }

    [Fact]
    public async Task DeleteRecipe_ExistingRecipe_RemovesIt()
    {
        using RecipeBookTestFactory factory = new();
        using HttpClient client = factory.CreateClient();

        CreateRecipeRequest recipe = new()
        {
            Title = "Пицца",
            Ingredients = new List<string> {"Тесто", "Томат", "Сыр", "Колбаса"},
            Steps = new List<string> {"Подготовить", "Пожарить"},
            CookingTimeMinutes = 40           
        };

        using HttpResponseMessage responsePost = await client.PostAsJsonAsync("/recipes", recipe);

        Assert.True(responsePost.IsSuccessStatusCode);

        using HttpResponseMessage responseGetBefore = await client.GetAsync("/recipes");

        Assert.True(responseGetBefore.IsSuccessStatusCode);

        string json = await responseGetBefore.Content.ReadAsStringAsync();
        using JsonDocument document = JsonDocument.Parse(json);

        JsonElement firstElement = document.RootElement.GetProperty("items")[0];

        int id = firstElement.GetProperty("id").GetInt32();

        using HttpResponseMessage responseDelete = await client.DeleteAsync($"/recipes/{id}");

        Assert.True(responseDelete.IsSuccessStatusCode);

        using HttpResponseMessage responseGetAfter = await client.GetAsync("/recipes");

        Assert.True(responseGetAfter.IsSuccessStatusCode);

        string jsonAfter = await responseGetAfter.Content.ReadAsStringAsync();
        using JsonDocument documentAfter = JsonDocument.Parse(jsonAfter);

        int totalCount = documentAfter.RootElement.GetProperty("totalCount").GetInt32();

        Assert.Equal(0, totalCount);
    }

    [Fact]
    public async Task UpdateRecipe_ExistingRecipe_UpdatesData()
    {
        using RecipeBookTestFactory factory = new();
        using HttpClient client = factory.CreateClient();

        CreateRecipeRequest recipe = new()
        {
            Title = "Пицца",
            Ingredients = new List<string> {"Тесто", "Томат", "Сыр", "Колбаса"},
            Steps = new List<string> {"Подготовить", "Пожарить"},
            CookingTimeMinutes = 40   
        };

        using HttpResponseMessage responsePost = await client.PostAsJsonAsync("/recipes", recipe);

        Assert.True(responsePost.IsSuccessStatusCode);

        using HttpResponseMessage responseGetBefore = await client.GetAsync("/recipes");

        Assert.True(responseGetBefore.IsSuccessStatusCode);

        string json = await responseGetBefore.Content.ReadAsStringAsync();
        using JsonDocument document = JsonDocument.Parse(json);

        JsonElement firstElement = document.RootElement.GetProperty("items")[0];

        int id = firstElement.GetProperty("id").GetInt32();

        UpdateRecipeRequest updatedRecipe  = new()
        {
            Title = "Пепперони",
            Ingredients = new List<string> {"Тесто", "Томат", "Сыр", "Колбаса"},
            Steps = new List<string> {"Подготовить", "Пожарить"},
            CookingTimeMinutes = 50   
        };

        using HttpResponseMessage responseUpdate = await client.PutAsJsonAsync($"/recipes/{id}", updatedRecipe );

        Assert.True(responseUpdate.IsSuccessStatusCode);

        using HttpResponseMessage responseGetAfter = await client.GetAsync("/recipes");

        Assert.True(responseGetAfter.IsSuccessStatusCode);

        string jsonAfter = await responseGetAfter.Content.ReadAsStringAsync();
        using JsonDocument documentAfter = JsonDocument.Parse(jsonAfter);

        JsonElement firstElementAfter = documentAfter.RootElement.GetProperty("items")[0];

        string? title = firstElementAfter.GetProperty("title").GetString();
        int cookingTimeMinutes = firstElementAfter.GetProperty("cookingTimeMinutes").GetInt32();

        Assert.Equal(updatedRecipe.Title, title);
        Assert.Equal(updatedRecipe.CookingTimeMinutes, cookingTimeMinutes);
    }

}
