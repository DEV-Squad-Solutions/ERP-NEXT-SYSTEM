import { useSelector } from "react-redux";
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

const getCurrencySymbol = (currency) =>
  currencySymbols[currency] || currency || "";

const fmt = (value) =>
  Number(value ?? 0).toLocaleString(getLocale(), {
    maximumFractionDigits: 2,
  });

const fmtMoney = (value, currency) =>
  `${fmt(value)} ${getCurrencySymbol(currency)}`;

export default function DashboardPrintTemplate({ data }) {
  const company = useSelector((state) => state.auth.selectedCompany);

  if (!data) return null;

  const printedAt = formatDateTime(new Date());

  const sales = data.sales || {};
  const purchases = data.purchases || {};
  const profitability = data.profitability || {};
  const inventory = data.inventory || {};
  const counts = data.counts || {};
  const invoiceStatus = data.invoiceStatus || {};
  const accounting = data.accounting || {};
  const cashBalances = data.cashBalances || [];
  const alerts = data.alerts || [];
  const monthlyActivity = data.monthlyActivity || [];

  return (
    <div
      dir={getDir()}
      className="bg-white p-8 font-sans text-slate-900"
      style={{
        width: "277mm",
        minHeight: "190mm",
      }}
    >
      {/* Header */}
      <div className="mb-6 flex items-start justify-between border-b-2 border-slate-800 pb-4">
        <div>
          {" "}
          <h1
            style={{
              fontSize: "18px",
              fontWeight: 700,
              margin: 0,
            }}
          >
            {company?.name || "—"}
          </h1>
          <h3 className="text-2xl font-bold">{t("تقرير لوحة التحكم")}</h3>
          <p className="mt-1 text-sm text-slate-500">{t("الملخص التشغيلي والمالي")}</p>
        </div>

        <div className="text-left text-xs text-slate-500">
          <p>
            <span className="font-semibold text-slate-800">{t("السنة المالية:")}</span>{" "}
            {data.fiscalYearName || "—"}
          </p>

          <p className="mt-1">
            <span className="font-semibold text-slate-800">{t("الفترة:")}</span>{" "}
            {data.fromDate ? formatDate(data.fromDate) : "—"} {t("إلى")} {data.toDate ? formatDate(data.toDate) : "—"}
          </p>

          <p className="mt-1">
            <span className="font-semibold text-slate-800">
              {t("العملة الأساسية:")}
            </span>{" "}
            {data.baseCurrency || "—"}
          </p>

          <p className="mt-1">
            <span className="font-semibold text-slate-800">{t("تاريخ الطباعة:")}</span>{" "}
            {printedAt}
          </p>
        </div>
      </div>

      {/* KPI */}
      <section className="mb-6">
        <h2 className="mb-3 text-sm font-bold">{t("الملخص المالي والتشغيلي")}</h2>

        <div className="grid grid-cols-5 gap-3">
          <PrintStat
            label={t("صافي المبيعات")}
            value={fmtMoney(sales.net, data.baseCurrency)}
            sub={t("مستحق: {0}", { 0: fmtMoney(sales.outstanding, data.baseCurrency) })}
          />

          <PrintStat
            label={t("صافي المشتريات")}
            value={fmtMoney(purchases.net, data.baseCurrency)}
            sub={t("مستحق: {0}", { 0: fmtMoney(purchases.outstanding, data.baseCurrency) })}
          />

          <PrintStat
            label={t("إجمالي الربح")}
            value={fmtMoney(profitability.grossProfit, data.baseCurrency)}
            sub={t("الهامش: {0}%", { 0: Number(
              profitability.grossMarginPercentage ?? 0,
            ).toFixed(1) })}
          />

          <PrintStat
            label={t("قيمة المخزون")}
            value={fmtMoney(inventory.currentInventoryValue, data.baseCurrency)}
            sub={t("{0} بدون رصيد", { 0: inventory.zeroStockItemCount ?? 0 })}
          />

          <PrintStat
            label={t("عدد الفواتير")}
            value={fmt(invoiceStatus.totalCount ?? counts.invoiceCount)}
            sub={t("متأخرة: {0}", { 0: invoiceStatus.overdueCount ?? 0 })}
          />
        </div>
      </section>

      {/* Counts */}
      <section className="mb-6">
        <h2 className="mb-3 text-sm font-bold">{t("المؤشرات التشغيلية")}</h2>

        <div className="grid grid-cols-5 gap-3">
          <PrintStat
            label={t("الشركاء التجاريين")}
            value={fmt(counts.businessPartnerCount)}
            sub={t("عملاء وموردين")}
          />

          <PrintStat label={t("الموظفين")} value={fmt(counts.employeeCount)} />

          <PrintStat label={t("السائقين")} value={fmt(counts.driverCount)} />

          <PrintStat
            label={t("الأصناف النشطة")}
            value={fmt(inventory.activeItemCount)}
          />

          <PrintStat
            label={t("الأصناف ذات الرصيد")}
            value={fmt(inventory.itemsWithStockCount)}
          />
        </div>
      </section>

      {/* Invoice Status */}
      <section className="mb-6 print-break-inside-avoid">
        <h2 className="mb-3 text-sm font-bold">{t("حالة الفواتير")}</h2>

        <div className="grid grid-cols-5 gap-3">
          <PrintStat label={t("مدفوعة")} value={fmt(invoiceStatus.paidCount)} />

          <PrintStat
            label={t("مدفوعة جزئيًا")}
            value={fmt(invoiceStatus.partiallyPaidCount)}
          />

          <PrintStat
            label={t("غير مدفوعة")}
            value={fmt(invoiceStatus.unpaidCount)}
          />

          <PrintStat label={t("متأخرة")} value={fmt(invoiceStatus.overdueCount)} />

          <PrintStat
            label={t("قيمة المتأخرات")}
            value={fmtMoney(invoiceStatus.overdueAmount, data.baseCurrency)}
          />
        </div>
      </section>

      {/* Monthly Activity */}
      {monthlyActivity.length > 0 && (
        <section className="mb-6 print-break-inside-avoid">
          <h2 className="mb-3 text-sm font-bold">{t("النشاط الشهري")}</h2>

          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-y border-slate-300 bg-slate-50">
                <th className="px-3 py-2 text-right">{t("الشهر")}</th>

                <th className="px-3 py-2 text-left">{t("المبيعات")}</th>

                <th className="px-3 py-2 text-left">{t("المشتريات")}</th>
              </tr>
            </thead>

            <tbody>
              {monthlyActivity.map((month, index) => (
                <tr
                  key={`${month.year}-${month.month}-${index}`}
                  className="border-b border-slate-200"
                >
                  <td className="px-3 py-2">
                    {month.month}/{month.year}
                  </td>

                  <td className="px-3 py-2 text-left font-medium">
                    {fmtMoney(month.sales, data.baseCurrency)}
                  </td>

                  <td className="px-3 py-2 text-left font-medium">
                    {fmtMoney(month.purchases, data.baseCurrency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Cash Balances */}
      {cashBalances.length > 0 && (
        <section className="mb-6 print-break-inside-avoid">
          <h2 className="mb-3 text-sm font-bold">{t("أرصدة الخزائن حسب العملة")}</h2>

          <div className="grid grid-cols-4 gap-3">
            {cashBalances.map((cash) => (
              <div
                key={cash.currency}
                className="rounded-lg border border-slate-300 p-3"
              >
                <p className="mb-2 text-sm font-bold">
                  {getCurrencySymbol(cash.currency)} {cash.currency}
                </p>

                <PrintField
                  label={t("الرصيد الحالي")}
                  value={fmtMoney(cash.currentBalance, cash.currency)}
                />

                <PrintField
                  label={t("عدد الخزائن")}
                  value={fmt(cash.cashboxCount)}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Accounting */}
      <section className="mb-6 print-break-inside-avoid">
        <h2 className="mb-3 text-sm font-bold">{t("الجاهزية المحاسبية")}</h2>

        <div className="rounded-lg border border-slate-300 p-4">
          <div className="grid grid-cols-5 gap-4">
            <PrintField
              label={t("الحالة")}
              value={accounting.isReady ? t("جاهز") : t("يحتاج مراجعة")}
            />

            <PrintField
              label={t("عدد المشاكل")}
              value={fmt(accounting.issueCount)}
            />

            <PrintField
              label={t("مصادر قيود مفقودة")}
              value={fmt(accounting.missingJournalSources)}
            />

            <PrintField
              label={t("قيود غير متوازنة")}
              value={fmt(accounting.unbalancedJournals)}
            />

            <PrintField
              label={t("تكاليف مخزون معلقة")}
              value={fmt(accounting.pendingInventoryCosts)}
            />
          </div>
        </div>
      </section>

      {/* Alerts */}
      {alerts.length > 0 && (
        <section className="mb-6 print-break-inside-avoid">
          <h2 className="mb-3 text-sm font-bold">{t("التنبيهات")}</h2>

          <div className="space-y-2">
            {alerts.map((alert, index) => (
              <div
                key={`${alert.code || "alert"}-${index}`}
                className="flex items-center justify-between rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <span>{alert.message || t("تنبيه")}</span>

                {alert.count > 0 && (
                  <span className="font-bold">{fmt(alert.count)}</span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Footer */}
      <div className="mt-8 flex items-center justify-between border-t border-slate-300 pt-3 text-xs text-slate-500">
        <span>{t("تقرير لوحة التحكم")}</span>

        <span>{data.baseCurrency || "—"}</span>

        <span>{printedAt}</span>
      </div>
    </div>
  );
}

function PrintStat({ label, value, sub }) {
  return (
    <div className="rounded-lg border border-slate-300 p-3 print-break-inside-avoid">
      <p className="text-xs text-slate-500">{label}</p>

      <p className="mt-1 text-base font-bold text-slate-900">{value ?? "—"}</p>

      {sub && <p className="mt-1 text-[10px] text-slate-500">{sub}</p>}
    </div>
  );
}

function PrintField({ label, value }) {
  return (
    <div>
      <p className="mb-0.5 text-xs text-slate-500">{label}</p>

      <p className="text-sm font-medium text-slate-900">{value ?? "—"}</p>
    </div>
  );
}
