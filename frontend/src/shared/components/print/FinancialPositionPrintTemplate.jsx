// src/shared/components/print/FinancialPositionPrintTemplate.jsx
import { Fragment } from "react";
import { formatDateTime } from "../../../lib/date.js";
import { formatDate } from "../../../lib/date.js";

import { t } from "../../../i18n";
import { getDir, getLocale } from "../../../i18n";
function fmt(n) {
  return new Intl.NumberFormat(getLocale(), { maximumFractionDigits: 2 }).format(
    n ?? 0,
  );
}

export default function FinancialPositionPrintTemplate({
  data,
  sections = [],
  summary = {},
  filters = {},
  companyName = "",
}) {
  const printedAt = formatDateTime(new Date());
  const isDetailed = filters.viewMode === "Detailed";
  const { totalAssets, totalLE, difference, balanced } = summary;

  return (
    <div className="p-8 text-ink-900" dir={getDir()}>
      <div className="flex items-center justify-between border-b border-ink-900/20 pb-4 mb-6">
        <div>
          {companyName && <p className="text-sm font-bold">{companyName}</p>}
          <h1 className="text-xl font-bold">{t("قائمة المركز المالي")}</h1>
          <p className="text-xs text-ink-400 mt-1">
            {t("تاريخ الطباعة:")} {printedAt}
          </p>
        </div>
        <div className="text-sm text-ink-400 text-end">
          {data?.fiscalYearName && <p>{t("السنة المالية:")} {data.fiscalYearName}</p>}
          <p>
            {t("من")} {formatDate(filters.fromDate)} {t("إلى")} {formatDate(filters.toDate)}
          </p>
        </div>
      </div>

      <div className="mb-4 text-xs text-ink-400 space-x-3 space-x-reverse">
        <span>
          {t("طريقة العرض:")} {filters.viewMode === "Detailed" ? t("تفصيلي") : t("ملخص")}
        </span>
        <span>
          {t("| التسويات:")}{" "}
          {filters.adjustmentView === "BeforeAdjustments"
            ? t("قبل التسوية")
            : t("بعد التسوية")}
        </span>
        <span>{t("| العملة:")} {data?.baseCurrency || "EGP"}</span>
      </div>

      <table className="w-full text-start text-sm border-collapse">
        <thead>
          <tr className="border-b-2 border-ink-900">
            <th className="py-2 px-2">{isDetailed ? t("الحساب") : t("البند")}</th>
            <th className="py-2 px-2">{t("رصيد أول المدة")}</th>
            <th className="py-2 px-2">{t("حركة الفترة")}</th>
            <th className="py-2 px-2">{t("رصيد آخر المدة")}</th>
          </tr>
        </thead>
        <tbody>
          {sections.map((section) => (
            <Fragment key={section.key}>
              <tr className="bg-ink-900/5">
                <td colSpan={4} className="py-2 px-2 font-bold">
                  {section.title}
                </td>
              </tr>

              {section.rows.map((row, idx) => {
                const v = row.v;
                return (
                  <tr
                    key={`${section.key}-${row.financialStatementLineId}-${row.accountId ?? idx}`}
                    className="border-b border-ink-900/10"
                  >
                    <td className="py-2 px-2 pe-5">
                      {isDetailed ? (
                        <>
                          <span className="font-semibold">
                            {row.accountName || "—"}
                          </span>
                          {row.accountCode && (
                            <span className="me-2 font-mono text-xs text-ink-400">
                              {row.accountCode}
                            </span>
                          )}
                        </>
                      ) : (
                        <>
                          <span className="font-semibold">
                            {row.financialStatementLineName || "—"}
                          </span>
                          {row.financialStatementLineCode && (
                            <span className="me-2 font-mono text-xs text-ink-400">
                              {row.financialStatementLineCode}
                            </span>
                          )}
                        </>
                      )}
                    </td>
                    <td className="py-2 px-2">{fmt(v.opening)}</td>
                    <td className="py-2 px-2">{fmt(v.movement)}</td>
                    <td className="py-2 px-2 font-semibold">
                      {fmt(v.closing)}
                    </td>
                  </tr>
                );
              })}

              <tr className="border-b-2 border-ink-900/30 font-bold">
                <td className="py-2 px-2">{t("إجمالي")} {section.title}</td>
                <td className="py-2 px-2">{fmt(section.sum.opening)}</td>
                <td className="py-2 px-2">{fmt(section.sum.movement)}</td>
                <td className="py-2 px-2">{fmt(section.sum.closing)}</td>
              </tr>
            </Fragment>
          ))}
        </tbody>

        {sections.length > 0 && (
          <tfoot>
            <tr className="font-bold">
              <td className="py-2 px-2" colSpan={3}>
                {t("إجمالي الأصول")}
              </td>
              <td className="py-2 px-2">{fmt(totalAssets)}</td>
            </tr>
            <tr className="font-bold">
              <td className="py-2 px-2" colSpan={3}>
                {t("إجمالي الالتزامات وحقوق الملكية")}
              </td>
              <td className="py-2 px-2">{fmt(totalLE)}</td>
            </tr>
            <tr className="font-bold border-t-2 border-ink-900">
              <td className="py-2 px-2" colSpan={3}>
                {balanced ? t("الميزانية متوازنة") : t("الفرق بين الطرفين")}
              </td>
              <td className="py-2 px-2">{balanced ? "✓" : fmt(difference)}</td>
            </tr>
          </tfoot>
        )}
      </table>

      {sections.length === 0 && (
        <p className="text-center text-ink-400 py-10">{t("لا توجد بيانات للطباعة")}</p>
      )}
    </div>
  );
}
