import { formatDateTime } from "../../../lib/date.js";
import { t } from "../../../i18n";
import { getDir, getLocale } from "../../../i18n";
// src/shared/components/print/PartyListPrintTemplate.jsx
export default function PartyListPrintTemplate({ parties = [], filters = {} }) {
  const printedAt = formatDateTime(new Date());

  const hasActiveFilters = Object.values(filters || {}).some((v) => v);

  return (
    <div className="p-8 text-ink-900" dir={getDir()}>
      <div className="flex items-center justify-between border-b border-ink-900/20 pb-4 mb-6">
        <div>
          <h1 className="text-xl font-bold">{t("تقرير العملاء والموردين")}</h1>
          <p className="text-xs text-ink-400 mt-1">
            {t("تاريخ الطباعة:")} {printedAt}
          </p>
        </div>
        <div className="text-sm text-ink-400">
          {t("إجمالي السجلات:")} {parties.length}
        </div>
      </div>

      {hasActiveFilters && (
        <div className="mb-4 text-xs text-ink-400 space-x-3 space-x-reverse">
          {filters.search && <span>{t("بحث:")} {filters.search}</span>}
          {filters.code && <span> {t("| كود:")} {filters.code}</span>}
          {filters.taxNumber && <span> {t("| رقم ضريبي:")} {filters.taxNumber}</span>}
          {filters.currency && <span> {t("| عملة:")} {filters.currency}</span>}
          {filters.isActive !== "" && (
            <span>
              {" "}
              {t("| الحالة:")} {filters.isActive === "true" ? t("نشط") : t("غير نشط")}
            </span>
          )}
        </div>
      )}

      <table className="w-full text-start text-sm border-collapse">
        <thead>
          <tr className="border-b-2 border-ink-900">
            <th className="py-2 px-2">{t("الكود")}</th>
            <th className="py-2 px-2">{t("الاسم")}</th>
            <th className="py-2 px-2">{t("التليفون")}</th>
            <th className="py-2 px-2">{t("العملة")}</th>
            <th className="py-2 px-2">{t("حد الائتمان")}</th>
            <th className="py-2 px-2">{t("الحالة")}</th>
          </tr>
        </thead>
        <tbody>
          {parties.map((party) => (
            <tr key={party.id} className="border-b border-ink-900/10">
              <td className="py-2 px-2 font-mono text-xs">{party.code}</td>
              <td className="py-2 px-2 font-semibold">{party.name}</td>
              <td className="py-2 px-2">{party.phoneNumber || "—"}</td>
              <td className="py-2 px-2 font-mono text-xs">{party.currency}</td>
              <td className="py-2 px-2">
                {party.creditLimit != null
                  ? party.creditLimit.toLocaleString(getLocale(), { maximumFractionDigits: 2 })
                  : "—"}
              </td>
              <td className="py-2 px-2">
                {party.isActive ? t("نشط") : t("غير نشط")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {parties.length === 0 && (
        <p className="text-center text-ink-400 py-10">{t("لا توجد بيانات للطباعة")}</p>
      )}
    </div>
  );
}
