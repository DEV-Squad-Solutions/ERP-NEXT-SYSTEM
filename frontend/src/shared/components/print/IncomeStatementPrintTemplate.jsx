// src/shared/components/print/IncomeStatementPrintTemplate.jsx
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

export default function IncomeStatementPrintTemplate({
  data,
  sections = [],
  summary = {},
  filters = {},
  companyName = "",
}) {
  const printedAt = formatDateTime(new Date());
  const isDetailed = filters.viewMode === "Detailed";
  const colCount = isDetailed ? 5 : 4;
  const { revenue = 0, expense = 0, netResult = 0 } = summary;

  return (
    <div className="p-8 text-ink-900" dir={getDir()}>
      <div className="flex items-center justify-between border-b border-ink-900/20 pb-4 mb-6">
        <div>
          {companyName && <p className="text-sm font-bold">{companyName}</p>}
          <h1 className="text-xl font-bold">{t("قائمة الدخل")}</h1>
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
        <span>{t("طريقة العرض:")} {isDetailed ? t("تفصيلي") : t("ملخص")}</span>
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
            <th className="py-2 px-2">{t("بند القائمة")}</th>
            {isDetailed && <th className="py-2 px-2">{t("الحساب")}</th>}
            <th className="py-2 px-2">{t("مدين الفترة")}</th>
            <th className="py-2 px-2">{t("دائن الفترة")}</th>
            <th className="py-2 px-2">{t("الصافي")}</th>
          </tr>
        </thead>
        <tbody>
          {sections.map((section) => (
            <Fragment key={section.key}>
              <tr className="bg-ink-900/5">
                <td colSpan={colCount} className="py-2 px-2 font-bold">
                  {section.title}
                </td>
              </tr>

              {section.rows.map((row, idx) => (
                <tr
                  key={`${section.key}-${row.financialStatementLineId}-${row.accountId ?? idx}`}
                  className="border-b border-ink-900/10"
                >
                  <td className="py-2 px-2 pe-5">
                    <span className="font-semibold">
                      {row.financialStatementLineName || "—"}
                    </span>
                    {row.financialStatementLineCode && (
                      <span className="me-2 font-mono text-xs text-ink-400">
                        {row.financialStatementLineCode}
                      </span>
                    )}
                  </td>
                  {isDetailed && (
                    <td className="py-2 px-2">
                      {row.accountName || "—"}
                      {row.accountCode && (
                        <span className="me-2 font-mono text-xs text-ink-400">
                          {row.accountCode}
                        </span>
                      )}
                    </td>
                  )}
                  <td className="py-2 px-2">{fmt(row.periodDebit)}</td>
                  <td className="py-2 px-2">{fmt(row.periodCredit)}</td>
                  <td className="py-2 px-2 font-semibold">{fmt(row.net)}</td>
                </tr>
              ))}

              <tr className="border-b-2 border-ink-900/30 font-bold">
                <td className="py-2 px-2" colSpan={isDetailed ? 2 : 1}>
                  {t("إجمالي")} {section.title}
                </td>
                <td className="py-2 px-2">{fmt(section.sum.debit)}</td>
                <td className="py-2 px-2">{fmt(section.sum.credit)}</td>
                <td className="py-2 px-2">{fmt(section.sum.net)}</td>
              </tr>
            </Fragment>
          ))}
        </tbody>

        {sections.length > 0 && (
          <tfoot>
            <tr className="font-bold">
              <td className="py-2 px-2" colSpan={colCount - 1}>
                {t("إجمالي الإيرادات")}
              </td>
              <td className="py-2 px-2">{fmt(revenue)}</td>
            </tr>
            <tr className="font-bold">
              <td className="py-2 px-2" colSpan={colCount - 1}>
                {t("إجمالي المصروفات")}
              </td>
              <td className="py-2 px-2">{fmt(expense)}</td>
            </tr>
            <tr className="font-bold border-t-2 border-ink-900">
              <td className="py-2 px-2" colSpan={colCount - 1}>
                {netResult >= 0 ? t("صافي ربح الفترة") : t("صافي خسارة الفترة")}
              </td>
              <td className="py-2 px-2">{fmt(netResult)}</td>
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
