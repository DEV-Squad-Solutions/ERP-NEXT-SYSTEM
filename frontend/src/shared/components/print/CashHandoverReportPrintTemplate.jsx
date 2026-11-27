import { formatDateTime } from "../../../lib/date.js";
import { formatDate } from "../../../lib/date.js";
import { t } from "../../../i18n";
import { getDir, getLocale } from "../../../i18n";
const currencySymbols = {
  EGP: t("ج.م"),
  USD: "$",
  EUR: "€",
  GBP: "£",
  SAR: "﷼",
  AED: t("د.إ"),
  KWD: t("د.ك"),
};

const fmt = (n) =>
  Number(n ?? 0).toLocaleString(getLocale(), {
    maximumFractionDigits: 2,
  });

export default function CashHandoverReportPrintTemplate({
  cashboxName,
  items = [],
  summaries = [],
  cashboxBalances = [],
  fromDate,
  toDate,
}) {
  const printedAt = formatDateTime(new Date());

  return (
    <div
      dir={getDir()}
      className="p-8 font-sans text-ink-900"
      style={{ width: "210mm", fontFamily: "'Cairo', 'Tajawal', sans-serif" }}
    >
      <div className="mb-6 flex items-center justify-between border-b border-ink-200 pb-4">
        <div>
          <h1 className="text-xl font-bold">{t("تقرير تسليم العهدة")}</h1>

          <p className="mt-1 text-sm text-ink-500">{cashboxName || t("الخزنة")}</p>
        </div>

        <div className="text-end text-xs text-ink-400">
          <p>{t("تاريخ الطباعة")}</p>
          <p>{printedAt}</p>
        </div>
      </div>

      {(fromDate || toDate) && (
        <div className="mb-6 rounded-lg border border-ink-200 p-3 text-sm">
          <span className="text-ink-500">{t("الفترة:")} </span>
          <span className="font-medium">
            {fromDate ? formatDate(fromDate) : "—"} {t("إلى")} {toDate ? formatDate(toDate) : "—"}
          </span>
        </div>
      )}

      {cashboxBalances.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-3 text-sm font-bold">{t("أرصدة الخزنة")}</h2>

          <div className="grid grid-cols-2 gap-4">
            {cashboxBalances.map((balance) => (
              <div
                key={`${balance.cashboxId}-${balance.currency}`}
                className="rounded-lg border border-ink-200 p-4"
              >
                <p className="mb-3 text-sm font-bold">
                  {currencySymbols[balance.currency] || ""} {balance.currency}
                </p>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <PrintField
                    label={t("الرصيد الحالي")}
                    value={fmt(balance.currentBalance)}
                  />

                  <PrintField
                    label={t("الرصيد المتوقع بعد الترحيل")}
                    value={fmt(balance.expectedBalance)}
                  />

                  <PrintField
                    label={t("مسودات وارد")}
                    value={fmt(balance.draftReceipt)}
                  />

                  <PrintField
                    label={t("مسودات صادر")}
                    value={fmt(balance.draftPayment)}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {summaries.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-3 text-sm font-bold">{t("ملخص التقرير")}</h2>

          <div className="grid grid-cols-2 gap-4">
            {summaries.map((summary) => (
              <div
                key={summary.currency}
                className="rounded-lg border border-ink-200 p-4"
              >
                <p className="mb-3 text-sm font-bold">
                  {currencySymbols[summary.currency] || ""} {summary.currency} —{" "}
                  {summary.count} {t("سند")}
                </p>

                <div className="grid grid-cols-3 gap-3 text-center">
                  <PrintField label={t("وارد")} value={fmt(summary.receipt)} />

                  <PrintField label={t("صادر")} value={fmt(summary.payment)} />

                  <PrintField label={t("الصافي")} value={fmt(summary.net)} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="mb-3 text-sm font-bold">{t("السندات")}</h2>

        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-ink-200">
              <th className="px-3 py-2 text-start font-semibold">{t("رقم السند")}</th>

              <th className="px-3 py-2 text-start font-semibold">{t("التاريخ")}</th>

              <th className="px-3 py-2 text-start font-semibold">{t("الاتجاه")}</th>

              <th className="px-3 py-2 text-start font-semibold">{t("البيان")}</th>

              <th className="px-3 py-2 text-end font-semibold">{t("المبلغ")}</th>
            </tr>
          </thead>

          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-ink-100">
                <td className="px-3 py-2">{item.voucherNumber}</td>

                <td className="px-3 py-2 text-ink-500">{formatDate(item.voucherDate)}</td>

                <td className="px-3 py-2">
                  {item.direction === "Receipt" ? t("وارد") : t("صادر")}
                </td>

                <td className="px-3 py-2 text-ink-500">
                  {item.description || "-"}
                </td>

                <td className="px-3 py-2 text-end font-semibold">
                  {fmt(item.amount)}{" "}
                  {currencySymbols[item.currency] || item.currency}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PrintField({ label, value }) {
  return (
    <div>
      <p className="mb-0.5 text-xs text-ink-500">{label}</p>

      <p className="font-medium">{value ?? "—"}</p>
    </div>
  );
}
