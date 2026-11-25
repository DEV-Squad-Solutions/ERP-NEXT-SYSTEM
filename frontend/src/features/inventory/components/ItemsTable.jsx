import { useGetItemsQuery, useDeleteItemMutation } from "../inventoryApi";
import { Trash2, Boxes, AlertTriangle } from "lucide-react";

import { t } from "../../../i18n";
import { getLocale } from "../../../i18n";
export default function ItemsTable() {
  const { data: items, isLoading, isError } = useGetItemsQuery();
  const [deleteItem] = useDeleteItemMutation();

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 rounded-xl bg-ink-400/5 animate-pulse" />
        ))}
      </div>
    );
  }

  if (isError)
    return (
      <p className="p-6 text-center text-negative text-sm">
        {t("حدث خطأ في تحميل البيانات")}
      </p>
    );

  if (items?.length === 0) {
    return (
      <div className="text-center py-14 border border-dashed border-ink-400/20 rounded-2xl">
        <Boxes size={32} className="mx-auto text-ink-400/40 mb-2" />
        <p className="text-ink-400 text-sm">{t("لا توجد أصناف مسجلة بعد")}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto custom-scroll rounded-2xl border border-ink-400/10 bg-white shadow-card">
      <table className="w-full text-start border-collapse">
        <thead>
          <tr className="bg-ink-900/[0.02] border-b border-ink-400/10 text-ink-400 text-xs">
            <th className="p-3.5 font-medium">{t("الصنف")}</th>
            <th className="p-3.5 font-medium">{t("الكود")}</th>
            <th className="p-3.5 font-medium">{t("الرصيد")}</th>
            <th className="p-3.5 font-medium">{t("سعر البيع")}</th>
            <th className="p-3.5 font-medium">{t("إجراءات")}</th>
          </tr>
        </thead>
        <tbody>
          {items?.map((item) => {
            const isLow = item.quantity <= item.minQuantity;
            return (
              <tr
                key={item.id}
                className="border-b border-ink-400/5 last:border-0 hover:bg-ink-900/[0.015] transition-colors"
              >
                <td className="p-3.5 font-medium text-ink-900">{item.name}</td>
                <td className="p-3.5 text-ink-400 num">{item.code}</td>
                <td className="p-3.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`num font-medium ${isLow ? "text-negative" : "text-ink-900"}`}
                    >
                      {item.quantity} {item.unit}
                    </span>
                    {isLow && (
                      <span title={t("الرصيد وصل للحد الأدنى")}>
                        <AlertTriangle size={14} className="text-gold-500" />
                      </span>
                    )}
                  </div>
                </td>
                <td className="p-3.5 num text-ink-600">
                  {item.salePrice?.toLocaleString(getLocale(), { maximumFractionDigits: 2 })} {t("ج.م")}
                </td>
                <td className="p-3.5">
                  <button
                    onClick={() => deleteItem(item.id)}
                    className="p-1.5 rounded-lg text-negative hover:bg-negative/5 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
