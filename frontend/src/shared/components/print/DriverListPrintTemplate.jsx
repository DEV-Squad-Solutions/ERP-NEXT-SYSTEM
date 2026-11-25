import { formatDateTime } from "../../../lib/date.js";
import { formatDate } from "../../../lib/date.js";
import { t } from "../../../i18n";
import { getDir } from "../../../i18n";
export default function DriverListPrintTemplate({
  drivers = [],
  filters = {},
}) {
  const printedAt = formatDateTime(new Date());
  const hasActiveFilters = Object.values(filters || {}).some((v) => v);

  return (
    <div className="p-8 text-ink-900" dir={getDir()}>
      <div className="flex items-center justify-between border-b border-ink-900/20 pb-4 mb-6">
        <div>
          <h1 className="text-xl font-bold">{t("تقرير السائقين")}</h1>
          <p className="text-xs text-ink-400 mt-1">
            {t("تاريخ الطباعة:")} {printedAt}
          </p>
        </div>
        <div className="text-sm text-ink-400">
          {t("إجمالي السائقين:")} {drivers.length}
        </div>
      </div>

      {hasActiveFilters && (
        <div className="mb-4 text-xs text-ink-400 space-x-3 space-x-reverse">
          {filters.search && <span>{t("بحث:")} {filters.search}</span>}
          {filters.code && <span> {t("| كود:")} {filters.code}</span>}
          {filters.licenseNumber && (
            <span> {t("| رقم رخصة:")} {filters.licenseNumber}</span>
          )}
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
            <th className="py-2 px-2">{t("رقم الرخصة")}</th>
            <th className="py-2 px-2">{t("انتهاء الرخصة")}</th>
            <th className="py-2 px-2">{t("الحالة")}</th>
          </tr>
        </thead>
        <tbody>
          {drivers.map((driver) => (
            <tr key={driver.id} className="border-b border-ink-900/10">
              <td className="py-2 px-2 font-mono text-xs">{driver.code}</td>
              <td className="py-2 px-2 font-semibold">{driver.name}</td>
              <td className="py-2 px-2">{driver.phoneNumber || "—"}</td>
              <td className="py-2 px-2 font-mono text-xs">
                {driver.licenseNumber || "—"}
              </td>
              <td className="py-2 px-2">{driver.licenseExpiryDate ? formatDate(driver.licenseExpiryDate) : "—"}</td>
              <td className="py-2 px-2">
                {driver.isActive ? t("نشط") : t("غير نشط")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {drivers.length === 0 && (
        <p className="text-center text-ink-400 py-10">{t("لا توجد بيانات للطباعة")}</p>
      )}
    </div>
  );
}
