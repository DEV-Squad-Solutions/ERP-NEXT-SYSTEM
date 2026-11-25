// features/sales/components/Detailscomponents/InvoicePaymentCard.jsx
import { Wallet } from "lucide-react";

import { t } from "../../../../i18n";
import { getLocale } from "../../../../i18n";
/**
 * @param {{ invoice: Object }} props
 */
export default function InvoicePaymentCard({ invoice }) {
  if (!invoice.cashboxId && !invoice.paidAmount) return null;

  const rows = [
    { label: t("الخزنة"), value: invoice.cashboxName },
    { label: t("نوع الحركة"), value: invoice.cashMovementTypeName },
    {
      label: t("المبلغ بعملة الخزنة"),
      value: `${Number(invoice.cashboxAmount || 0).toLocaleString(getLocale(), { maximumFractionDigits: 2 })} ${invoice.cashboxCurrency || ""}`,
    },
    ...(invoice.cashboxCurrency &&
    invoice.cashboxCurrency !== invoice.baseCurrency
      ? [
          {
            label: t("سعر صرف الخزنة"),
            value: invoice.cashboxExchangeRate,
            num: true,
          },
        ]
      : []),
    ...(invoice.realizedExchangeDifference
      ? [
          {
            label: t("فرق العملة المحقق"),
            value: `${Number(invoice.realizedExchangeDifference).toLocaleString(getLocale(), { maximumFractionDigits: 2 })} ${invoice.baseCurrency || ""}`,
            tone:
              invoice.realizedExchangeDifference >= 0
                ? "text-positive"
                : "text-negative",
          },
        ]
      : []),
  ];

  return (
    <div className="bg-white rounded-2xl border border-ink-400/10 shadow-card p-5">
      <h3 className="font-display font-bold text-ink-900 mb-4 flex items-center gap-2">
        <Wallet size={16} />
        {t("بيانات الدفع")}
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2.5 text-sm">
        {rows.map((row) => (
          <div key={row.label} className="flex justify-between text-ink-600">
            <span>{row.label}</span>
            <span
              className={`font-medium ${row.num ? "num" : ""} ${row.tone || "text-ink-900"}`}
            >
              {row.value || "—"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
