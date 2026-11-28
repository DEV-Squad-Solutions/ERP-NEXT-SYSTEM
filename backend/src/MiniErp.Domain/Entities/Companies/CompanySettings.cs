using MiniErp.Domain.Enums;

namespace MiniErp.Domain.Entities.Companies;

public sealed class CompanySettings
{
    public int CompanyId { get; set; }

    public CurrencyCode BaseCurrency { get; set; } = CurrencyCode.EGP;

    public StockBalanceCheckMode StockBalanceCheckMode { get; set; } =
        StockBalanceCheckMode.None;

    public InvoiceNumberMode InvoiceNumberMode { get; set; } =
        InvoiceNumberMode.Auto;

    public string DefaultColorTheme { get; set; } = "default";

    public string DefaultThemeMode { get; set; } = "light";

    /// <summary>Days to keep audit log entries. Null means keep forever (default).</summary>
    public int? AuditLogRetentionDays { get; set; }

    public Company Company { get; set; } = null!;
}
