import { useMemo, useState } from "react";
import { useGetInvoiceSummaryQuery } from "../hrReportsApi";
import { ReportHeader, DateRange, Cards, SimpleTable, todayISO, yearStartISO } from "./ReportKit";
import { t, getLocale } from "../../../i18n";

const TYPE_NAMES = { Sales: "مبيعات", Purchase: "مشتريات", SalesReturn: "مرتجع مبيعات", PurchaseReturn: "مرتجع مشتريات" };

export default function InvoiceSummaryReportPage() {
  const nf = useMemo(() => new Intl.NumberFormat(getLocale(), { maximumFractionDigits: 2 }), []);
  const [from, setFrom] = useState(yearStartISO());
  const [to, setTo] = useState(todayISO());
  const { data, isFetching, isError } = useGetInvoiceSummaryQuery({
    fromDate: from || yearStartISO(),
    toDate: to || todayISO(),
  });
  return (
    <div className="space-y-4">
      <ReportHeader title={t("ملخص المبيعات والمشتريات")} subtitle={t("إجماليات الفواتير حسب النوع وحسب الشهر")} />
      <DateRange from={from} to={to} setFrom={setFrom} setTo={setTo} />
      <Cards items={[
        [t("صافي المبيعات"), nf.format(data?.netSales ?? 0)],
        [t("صافي المشتريات"), nf.format(data?.netPurchases ?? 0)],
      ]} />
      <SimpleTable isError={isError} isFetching={isFetching} rows={data?.types ?? []} empty={t("لا توجد فواتير في الفترة")} cols={[
        { label: t("النوع"), render: (r) => <b>{t(TYPE_NAMES[r.invoiceType] ?? r.invoiceType)}</b> },
        { label: t("العدد"), num: true, render: (r) => nf.format(r.count) },
        { label: t("الإجمالي"), num: true, render: (r) => nf.format(r.total) },
        { label: t("المدفوع"), num: true, render: (r) => nf.format(r.paid) },
        { label: t("المتبقي"), num: true, render: (r) => nf.format(r.outstanding) },
      ]} />
      <SimpleTable isError={false} isFetching={isFetching} rows={data?.months ?? []} empty={t("لا توجد بيانات شهرية")} cols={[
        { label: t("الشهر"), render: (r) => `${r.year}/${String(r.month).padStart(2, "0")}` },
        { label: t("صافي المبيعات"), num: true, render: (r) => nf.format(r.salesTotal) },
        { label: t("صافي المشتريات"), num: true, render: (r) => nf.format(r.purchasesTotal) },
      ]} />
    </div>
  );
}
