using MiniErp.Application.Common.Results;

namespace MiniErp.Application.Features.Setup;

public static class SetupErrors
{
    public static Error AlreadyInitialized() =>
        Error.Conflict(
            "Setup.AlreadyInitialized",
            "تم إعداد النظام من قبل. سجّل الدخول كمدير لإضافة مديرين أو شركات.");

    public static Error InvalidToken() =>
        Error.Forbidden(
            "Setup.InvalidToken",
            "رمز الإعداد غير صحيح.",
            nameof(SetupInitializeRequest.SetupToken));
}
