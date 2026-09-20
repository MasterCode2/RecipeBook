class Recipe
{
    public string Title { get; set; } = "Спагетти";
    public List<string> Ingredients { get; set; } = new List<string>();
    public List<string> Step { get; set; } = new List<string>();
    public string? Notes { get; set; } = string.Empty;
}