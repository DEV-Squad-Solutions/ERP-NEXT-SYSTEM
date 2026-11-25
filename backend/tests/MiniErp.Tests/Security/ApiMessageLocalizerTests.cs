using Microsoft.AspNetCore.Http;
using MiniErp.Api.Localization;

namespace MiniErp.Tests.Security;

public sealed class ApiMessageLocalizerTests
{
    private static DefaultHttpContext Ctx(string? lang)
    {
        var c = new DefaultHttpContext();
        if (lang is not null) c.Request.Headers.AcceptLanguage = lang;
        return c;
    }

    [Fact]
    public void Keeps_arabic_without_english_header()
    {
        Assert.Equal("اسم المستخدم أو كلمة المرور غير صحيحة.",
            ApiMessageLocalizer.Translate("اسم المستخدم أو كلمة المرور غير صحيحة.", Ctx("ar")));
        Assert.Equal("اسم المستخدم أو كلمة المرور غير صحيحة.",
            ApiMessageLocalizer.Translate("اسم المستخدم أو كلمة المرور غير صحيحة.", Ctx(null)));
    }

    [Fact]
    public void Translates_exact_and_templated_messages_to_english()
    {
        Assert.Equal("Username or password is incorrect.",
            ApiMessageLocalizer.Translate("اسم المستخدم أو كلمة المرور غير صحيحة.", Ctx("en-US,en;q=0.9")));
        Assert.Equal("Account 42 was not found.",
            ApiMessageLocalizer.Translate("لم يتم العثور على الحساب رقم 42.", Ctx("en")));
        Assert.Equal("The field Password is required.",
            ApiMessageLocalizer.Translate("حقل كلمة المرور مطلوب.", Ctx("en")));
    }

    [Fact]
    public void Unknown_messages_fall_back_to_the_original()
    {
        Assert.Equal("رسالة غير معروفة", ApiMessageLocalizer.Translate("رسالة غير معروفة", Ctx("en")));
    }
}
