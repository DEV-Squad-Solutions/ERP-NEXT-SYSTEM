import { useMemo, useState } from "react";
import { useGetCashHandoverReportQuery } from "../../cashboxes/cashVouchersApi";
import { ReportHeader, DateRange, Cards, SimpleTable, todayISO, yearStartISO } from "./ReportKit";
import { t, getLocale } from "../../../i18n";

export default function CashHandoverReportPage() {
  const nf = useMemo(() => new Intl.NumberFormat(getLocale(), { maximumFractionDigits: 2 }), []);
  const [from, setFrom] = useState(yearStartISO());
  const [to, setTo] = useState(todayISO());
  const { data, isFetching, isError } = useGetCashHandoverReportQuery({
    fromDate: from || yearStartISO(),
    toDate: to || todayISO(),
    pageSize: 100,
  });
  const rows = data?.items ?? [];
  const sums = data?.summaries ?? [];
  return (
    <div className="space-y-4">
      <ReportHeader title={t("تقرير تسليم الخزينة")} subtitle={t("القبض والصرف لكل خزينة خلال الفترة")} />
      <DateRange from={from} to={to} setFrom={setFrom} setTo={setTo} />
      <Cards items={sums.flatMap((x) => [
        [`${t("قبض")} (${x.currency})`, nf.format(x.receipt ?? 0)],
        [`${t("صرف")} (${x.currency})`, nf.format(x.payment ?? 0)],
        [`${t("الصافي")} (${x.currency})`, nf.format(x.net ?? 0)],
      ])} />
      <SimpleTable isError={isError} isFetching={isFetching} rows={rows} empty={t("لا توجد سندات في الفترة")} cols={[
        { label: t("التاريخ"), render: (r) => (r.voucherDate ?? "").slice(0, 10) },
        { label: t("رقم السند"), render: (r) => r.voucherNumber },
        { label: t("الخزينة"), render: (r) => <b>{r.cashboxName}</b> },
        { label: t("الاتجاه"), render: (r) => r.direction },
        { label: t("المبلغ"), num: true, render: (r) => `${nf.format(r.amount ?? 0)} ${r.currency ?? ""}` },
        { label: t("البيان"), render: (r) => r.description || "-" },
      ]} />
    </div>
  );
}
