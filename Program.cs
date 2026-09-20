Recipe recipe = new Recipe();

Console.WriteLine("Enter the recipe title: " + recipe.Title);
Console.WriteLine("Enter the ingredients: " + recipe.Ingredients);
Console.WriteLine("Enter the steps: " + recipe.Step);
Console.WriteLine("Enter any notes: " + recipe.Notes ?? "No notes provided.");
