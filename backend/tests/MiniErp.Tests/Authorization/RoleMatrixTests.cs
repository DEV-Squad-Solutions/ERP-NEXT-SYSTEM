using System.Reflection;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MiniErp.Api.Controllers;
using MiniErp.Application.Common.Authentication;

namespace MiniErp.Tests.Authorization;

/// <summary>
/// Proves the role model for every state-changing endpoint, using the real
/// [Authorize] attributes (class chain AND method), not a copy of the rules.
/// Admin: everything. Accountant: finance and operations. User: operations
/// and sales. Cashier: sales only (create/edit invoices and partners).
/// </summary>
public sealed class RoleMatrixTests
{
    private static readonly string[] AllRoles =
        [ApplicationRoles.Admin, ApplicationRoles.Accountant, ApplicationRoles.User, ApplicationRoles.Cashier];

    private static readonly HashSet<string> SalesControllers =
        ["InvoicesController", "BusinessPartnersController"];

    // Endpoints any signed-in user may call by design (own profile/theme, AI chat reads).
    private static readonly HashSet<string> OpenByDesign =
        ["ThemeController", "AiController", "AnomaliesController", "ForecastsController",
         "CashboxPermissionsController", "DashboardController", "KpisController"];

    private static readonly HashSet<string> Finance =
    [
        "CashMovementTypesController", "CashVouchersController", "CashboxRevaluationsController",
        "CashboxTransfersController", "CashboxesController", "DriverOpeningBalancesController",
        "EmployeeAttendancesController", "EmployeeMovementsController", "EmployeeOpeningBalancesController",
        "EmployeesController", "FinancialStatementLinesController", "InventoryCountsController",
        "InvoiceItemPricingController", "JournalEntriesController", "MonetaryAccountRevaluationsController",
        "PartnerOpeningBalancesController", "PayrollEntriesController", "StockAdjustmentsController",
        "StockOpeningBalancesController", "StockTransfersController"
    ];

    private static readonly HashSet<string> Operations =
    [
        "ContainerMovementsController", "ContainersController", "CountriesController", "DriversController",
        "ItemUnitsController", "ItemsCategoriesController", "ItemsController", "StoreContainersController",
        "StoresController"
    ];

    private static bool IsMutation(MethodInfo m) =>
        m.GetCustomAttributes().Any(a => a is HttpPostAttribute or HttpPutAttribute or HttpDeleteAttribute or HttpPatchAttribute);

    private static IEnumerable<(Type Controller, MethodInfo Action)> Mutations() =>
        typeof(ApiControllerBase).Assembly.GetTypes()
            .Where(t => !t.IsAbstract && typeof(ApiControllerBase).IsAssignableFrom(t))
            .SelectMany(t => t.GetMethods(BindingFlags.Public | BindingFlags.Instance | BindingFlags.DeclaredOnly)
                .Where(IsMutation).Select(m => (t, m)));

    private static bool Allowed(Type controller, MethodInfo action, string role)
    {
        if (action.GetCustomAttribute<AllowAnonymousAttribute>() is not null ||
            controller.GetCustomAttribute<AllowAnonymousAttribute>() is not null)
        {
            return true;
        }

        var layers = new List<string?>();
        for (var t = controller; t is not null; t = t.BaseType)
        {
            layers.AddRange(t.GetCustomAttributes<AuthorizeAttribute>(inherit: false).Select(a => a.Roles));
        }
        layers.AddRange(action.GetCustomAttributes<AuthorizeAttribute>().Select(a => a.Roles));

        return layers.All(roles => string.IsNullOrEmpty(roles) ||
            roles.Split(',').Select(r => r.Trim()).Contains(role));
    }

    [Fact]
    public void Mutations_AreDiscovered()
    {
        Assert.True(Mutations().Count() > 100);
    }

    [Fact]
    public void FinanceMutations_AreAdminAndAccountantOnly()
    {
        foreach (var (c, a) in Mutations().Where(x => Finance.Contains(x.Controller.Name)))
        {
            Assert.True(Allowed(c, a, "Admin"), $"{c.Name}.{a.Name} Admin");
            Assert.False(Allowed(c, a, "User"), $"{c.Name}.{a.Name} User must be denied");
            Assert.False(Allowed(c, a, "Cashier"), $"{c.Name}.{a.Name} Cashier must be denied");
        }
    }

    [Fact]
    public void OperationsMutations_ExcludeCashier()
    {
        foreach (var (c, a) in Mutations().Where(x => Operations.Contains(x.Controller.Name)))
        {
            Assert.True(Allowed(c, a, "Admin"), $"{c.Name}.{a.Name} Admin");
            Assert.False(Allowed(c, a, "Cashier"), $"{c.Name}.{a.Name} Cashier must be denied");
        }
    }

    [Fact]
    public void SalesMutations_AllowCashier_ExceptInvoiceDelete()
    {
        foreach (var (c, a) in Mutations().Where(x => SalesControllers.Contains(x.Controller.Name)))
        {
            var isInvoiceDelete = c.Name == "InvoicesController" &&
                a.GetCustomAttribute<HttpDeleteAttribute>() is not null;
            Assert.True(Allowed(c, a, "Admin"), $"{c.Name}.{a.Name} Admin");
            Assert.True(Allowed(c, a, "Accountant"), $"{c.Name}.{a.Name} Accountant");
            Assert.Equal(!isInvoiceDelete, Allowed(c, a, "User"));
            Assert.Equal(!isInvoiceDelete, Allowed(c, a, "Cashier"));
        }
    }

    [Fact]
    public void EveryOtherMutation_IsAdminOnly_OrAnonymousByDesign_OrOpenByDesign()
    {
        var known = Finance.Concat(Operations).Concat(SalesControllers).ToHashSet();
        foreach (var (c, a) in Mutations().Where(x => !known.Contains(x.Controller.Name) && !OpenByDesign.Contains(x.Controller.Name)))
        {
            var anonymous = a.GetCustomAttribute<AllowAnonymousAttribute>() is not null ||
                c.GetCustomAttribute<AllowAnonymousAttribute>() is not null;
            if (anonymous)
            {
                Assert.Contains(c.Name, new[] { "AuthController", "SetupController", "RegistrationRequestsController" });
                continue;
            }

            var others = AllRoles.Where(r => r != "Admin").Where(r => Allowed(c, a, r)).ToList();
            Assert.True(others.Count == 0 || c.Name == "AccountingReadinessController" ||
                c.Name == "AuthController" || c.Name == "ScreenAccessController",
                $"{c.Name}.{a.Name} allows {string.Join(",", others)}");
        }
    }

    [Theory]
    [InlineData(typeof(CashVouchersController), "Create")]
    [InlineData(typeof(JournalEntriesController), "Create")]
    [InlineData(typeof(PayrollEntriesController), "Delete")]
    [InlineData(typeof(CashboxTransfersController), "Create")]
    public void Accountant_CanDoCoreFinanceWork(Type controller, string action)
    {
        var method = controller.GetMethod(action)!;
        Assert.True(Allowed(controller, method, "Accountant"));
        Assert.False(Allowed(controller, method, "Cashier"));
        Assert.False(Allowed(controller, method, "User"));
    }

    [Fact]
    public void Admin_IsAllowedEverywhere()
    {
        foreach (var (c, a) in Mutations())
        {
            Assert.True(Allowed(c, a, "Admin"), $"{c.Name}.{a.Name}");
        }
    }
}
