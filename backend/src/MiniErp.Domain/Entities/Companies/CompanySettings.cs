using MiniErp.Domain.Enums;

namespace MiniErp.Domain.Entities.Companies;

public sealed class CompanySettings
{
    public int CompanyId { get; set; }

    public CurrencyCode BaseCurrency { get; set; } = CurrencyCode.EGP;

    public StockBalanceCheckMode StockBalanceCheckMode { get; set; } =
        StockBalanceCheckMode.None;

    public string DefaultColorTheme { get; set; } = "default";

    public string DefaultThemeMode { get; set; } = "light";

    public Company Company { get; set; } = null!;
}
