import { Package } from "lucide-react";

import { t } from "../../../../i18n";
import { getLocale } from "../../../../i18n";
/**
 * @param {{ items: Array, currency?: string }} props
 */
export default function InvoiceItemsTable({ items, currency }) {
  if (!items || items.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-ink-400/10 shadow-card text-center py-10">
        <Package
          size={26}
          className="mx-auto text-ink-400/40 mb-2"
          strokeWidth={1.6}
        />
        <p className="text-sm text-ink-400">{t("لا توجد أصناف في هذه الفاتورة")}</p>
      </div>
    );
  }

  const symbol = currency === "USD" ? "$" : t("ج.م");

  return (
    <div className="rounded-2xl border border-ink-400/10 bg-white shadow-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-5 py-4 border-b border-ink-400/10">
        <Package size={18} className="text-primary-500" />
        <h3 className="font-display text-base font-semibold text-ink-900">
          {t("أصناف الفاتورة")}
        </h3>
      </div>

      {/* Table */}
      <div className="overflow-x-auto custom-scroll">
        <table className="w-full text-start border-collapse text-sm min-w-[750px]">
          <thead>
            <tr className="bg-ink-900/[0.03] text-ink-400 text-xs">
              <th className="p-3 font-medium">{t("الكود")}</th>
              <th className="p-3 font-medium">{t("الصنف")}</th>
              <th className="p-3 font-medium">{t("الوحدة")}</th>
              <th className="p-3 font-medium">{t("العدد")}</th>
              <th className="p-3 font-medium">{t("وزن الوحدة")}</th>
              <th className="p-3 font-medium">{t("الكمية")}</th>
              <th className="p-3 font-medium">{t("السعر")}</th>
              <th className="p-3 font-medium">{t("الإجمالي")}</th>
              <th className="p-3 font-medium">{t("ملاحظات")}</th>
            </tr>
          </thead>

          <tbody>
            {items.map((item) => (
              <tr
                key={item.id}
                className="border-t border-ink-400/5 hover:bg-ink-900/[0.01] transition-colors"
              >
                <td className="p-3 num text-ink-400 text-xs">
                  {item.itemCode}
                </td>

                <td className="p-3 font-medium text-ink-900">
                  {item.itemName}
                </td>

                <td className="p-3 text-ink-600">{item.itemUnitName || "—"}</td>

                <td className="p-3 num text-center">
                  {item.count?.toLocaleString(getLocale(), { maximumFractionDigits: 2 }) || "—"}
                </td>

                <td className="p-3 num text-ink-600">
                  {(item.weight || 0).toLocaleString(getLocale(), { maximumFractionDigits: 2 })}
                </td>

                <td className="p-3 num font-medium text-ink-900">
                  {(item.quantity || 0).toLocaleString(getLocale(), { maximumFractionDigits: 2 })}
                </td>

                <td className="p-3 num text-ink-600">
                  {(item.price || 0).toLocaleString(getLocale(), { maximumFractionDigits: 2 })}
                </td>

                <td className="p-3 num font-medium">
                  {(item.total || 0).toLocaleString(getLocale(), { maximumFractionDigits: 2 })} {symbol}
                </td>

                <td className="p-3 text-ink-400 text-xs">
                  {item.notes || "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
