public class CreateRecipeRequest
{
    public string Title { get; set; } = string.Empty;
    public List<string> Ingredients { get; set; } = new List<string>();
    public List<string> Steps { get; set; } = new List<string>();
    public string? Notes { get; set; }
    public int CookingTimeMinutes { get; set; }
}