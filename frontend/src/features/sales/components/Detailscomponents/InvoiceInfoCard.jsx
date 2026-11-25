import { t } from "../../../../i18n";
const paymentTermLabels = { Cash: t("نقدي"), Credit: t("آجل") };
const contentTypeLabels = { Items: t("أصناف"), Containers: t("عبوات") };

/**
 * @param {{ invoice: Object }} props
 */
export default function InvoiceInfoCard({ invoice }) {
  const driverLine = invoice.usesExternalDriver
    ? t("{0} (سائق خارجي)", { 0: invoice.externalDriverName })
    : invoice.driverName || "—";

  const rows = [
    { label: t("تاريخ الفاتورة"), value: invoice.invoiceDate, num: true },
    { label: t("تاريخ الاستحقاق"), value: invoice.dueDate, num: true },
    { label: t("العميل / المورد"), value: invoice.businessPartnerName },
    { label: t("المخزن"), value: invoice.storeName },
    ...(invoice.contentType === "Containers"
      ? [{ label: t("مخزن العبوات"), value: invoice.containerStoreName }]
      : []),
    { label: t("الدولة"), value: invoice.countryName },
    { label: t("السائق"), value: driverLine },
    ...(invoice.actualDriverName && invoice.actualDriverId !== invoice.driverId
      ? [{ label: t("السائق الفعلي"), value: invoice.actualDriverName }]
      : []),
    { label: t("رقم السيارة"), value: invoice.vehicleNumber, num: true },
    {
      label: t("طريقة الدفع"),
      value: paymentTermLabels[invoice.paymentTerm] || invoice.paymentTerm,
    },
    {
      label: t("محتوى الفاتورة"),
      value: contentTypeLabels[invoice.contentType] || invoice.contentType,
    },
    ...(invoice.itemsCategoryName
      ? [{ label: t("تصنيف الأصناف"), value: invoice.itemsCategoryName }]
      : []),
    ...(invoice.partnerInvoiceNo
      ? [
          {
            label: t("رقم فاتورة الشريك"),
            value: invoice.partnerInvoiceNo,
            num: true,
          },
        ]
      : []),
    ...(invoice.exportInvoiceCode
      ? [
          {
            label: t("كود فاتورة التصدير"),
            value: invoice.exportInvoiceCode,
            num: true,
          },
        ]
      : []),
    {
      label: t("العملة"),
      value:
        invoice.currency === invoice.baseCurrency
          ? invoice.currency
          : t("{0} (أساسي: {1})", { 0: invoice.currency, 1: invoice.baseCurrency }),
    },
    ...(invoice.currency !== invoice.baseCurrency
      ? [{ label: t("سعر الصرف"), value: invoice.exchangeRate, num: true }]
      : []),
  ];

  return (
    <div className="bg-white rounded-2xl border border-ink-400/10 shadow-card p-5">
      <h3 className="font-display font-bold text-ink-900 mb-4">
        {t("بيانات الفاتورة")}
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2.5 text-sm">
        {rows.map((row) => (
          <div key={row.label} className="flex justify-between text-ink-600">
            <span>{row.label}</span>
            <span
              className={`text-ink-900 font-medium ${row.num ? "num" : ""}`}
            >
              {row.value || "—"}
            </span>
          </div>
        ))}
      </div>
      {invoice.notes && (
        <div className="mt-4 pt-4 border-t border-ink-400/10">
          <p className="text-xs text-ink-400 mb-1">{t("ملاحظات")}</p>
          <p className="text-sm text-ink-700">{invoice.notes}</p>
        </div>
      )}
    </div>
  );
}
