import { formatDate, formatDateTime } from "../../../lib/date.js";
import { t } from "../../../i18n";
import { getDir, getLocale } from "../../../i18n";
export default function StorePrintTemplate({ store, stats }) {
  if (!store) return null;

  const printedAt = formatDateTime(new Date());

  return (
    <div
      dir={getDir()}
      className="p-8 font-sans text-ink-900"
      style={{ width: "100%", maxWidth: "210mm" }}
    >
      <div className="flex items-center justify-between border-b border-ink-200 pb-4 mb-6">
        <div>
          <h1 className="text-xl font-bold">{store.name}</h1>
          <p className="text-sm text-ink-500 font-mono mt-1">{store.code}</p>
        </div>
        <div className="text-end text-xs text-ink-400">
          <p>{t("تاريخ الطباعة")}</p>
          <p>{printedAt}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
        <PrintField label={t("نوع المخزن")} value={store.type ?? store.storeType} />
        <PrintField
          label={t("الحالة")}
          value={
            (store.isActive ?? store.status === "Active") ? t("نشط") : t("غير نشط")
          }
        />
        <PrintField label={t("العنوان")} value={store.address} />
        <PrintField
          label={t("تاريخ الإنشاء")}
          value={
            store.createdOn
              ? formatDate(new Date(store.createdOn))
              : "—"
          }
        />
      </div>

      {store.description && (
        <div className="mb-6 text-sm">
          <p className="text-ink-500 mb-1">{t("الوصف")}</p>
          <p>{store.description}</p>
        </div>
      )}

      {stats && (
        <div className="grid grid-cols-3 gap-4 border-t border-ink-200 pt-4">
          <PrintField label={t("عدد الأصناف")} value={Number(stats.itemsCount ?? 0).toLocaleString(getLocale())} />
          <PrintField label={t("إجمالي قيمة المخزون")} value={Number(stats.totalValue ?? 0).toLocaleString(getLocale(), { maximumFractionDigits: 2 })} />
          <PrintField label={t("آخر تحديث")} value={printedAt} />
        </div>
      )}
    </div>
  );
}

function PrintField({ label, value }) {
  return (
    <div>
      <p className="text-ink-500 text-xs mb-0.5">{label}</p>
      <p className="font-medium">{value ?? "—"}</p>
    </div>
  );
}
