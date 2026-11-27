using System.Net;
using System.Net.Mail;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using MiniErp.Application.Common.Abstractions;

namespace MiniErp.Infrastructure.Identity;

public sealed class SmtpPasswordResetNotifier(
    IOptions<EmailOptions> options,
    ILogger<SmtpPasswordResetNotifier> logger)
    : IPasswordResetNotifier
{
    private readonly EmailOptions settings = options.Value;

    public async Task SendAsync(
        string email,
        string userName,
        string token,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(settings.Host) ||
            string.IsNullOrWhiteSpace(settings.FromAddress) ||
            string.IsNullOrWhiteSpace(settings.ResetUrlBase))
        {
            logger.LogWarning(
                "Password reset requested but the Email settings are not configured. No email was sent.");
            return;
        }

        var separator = settings.ResetUrlBase.Contains('?') ? "&" : "?";
        var link = settings.ResetUrlBase
            + separator
            + "email=" + Uri.EscapeDataString(email)
            + "&token=" + Uri.EscapeDataString(token);

        using var message = new MailMessage
        {
            From = new MailAddress(settings.FromAddress, settings.FromName),
            Subject = "إعادة تعيين كلمة المرور / Password reset",
            IsBodyHtml = false,
            Body =
                $"مرحباً {userName}،{Environment.NewLine}" +
                "لإعادة تعيين كلمة المرور افتح الرابط التالي (صالح لمدة محدودة):" +
                Environment.NewLine + link + Environment.NewLine + Environment.NewLine +
                "Open this link to reset your password (valid for a limited time):" +
                Environment.NewLine + link + Environment.NewLine + Environment.NewLine +
                "إذا لم تطلب ذلك تجاهل هذه الرسالة. / If you did not ask for this, ignore this email."
        };
        message.To.Add(new MailAddress(email));

        using var client = new SmtpClient(settings.Host, settings.Port)
        {
            EnableSsl = settings.EnableSsl,
            DeliveryMethod = SmtpDeliveryMethod.Network,
            Timeout = 15000
        };
        if (!string.IsNullOrWhiteSpace(settings.UserName))
        {
            client.Credentials = new NetworkCredential(
                settings.UserName,
                settings.Password);
        }

        try
        {
            await client.SendMailAsync(message, cancellationToken);
        }
        catch (Exception exception) when (
            exception is SmtpException or InvalidOperationException)
        {
            // Never log the token or the link. Only the failure type.
            logger.LogError(
                "Password reset email could not be sent ({ErrorType}).",
                exception.GetType().Name);
        }
    }
}
