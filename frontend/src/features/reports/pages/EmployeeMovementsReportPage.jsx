import { useMemo, useState } from "react";
import { useGetEmployeeMovementsReportQuery } from "../hrReportsApi";
import { ReportHeader, DateRange, Cards, SimpleTable, todayISO, yearStartISO } from "./ReportKit";
import { t, getLocale } from "../../../i18n";

export default function EmployeeMovementsReportPage() {
  const nf = useMemo(() => new Intl.NumberFormat(getLocale(), { maximumFractionDigits: 2 }), []);
  const [from, setFrom] = useState(yearStartISO());
  const [to, setTo] = useState(todayISO());
  const { data, isFetching, isError } = useGetEmployeeMovementsReportQuery({
    fromDate: from || yearStartISO(),
    toDate: to || todayISO(),
  });
  const rows = data?.items ?? [];
  const s = data?.summary ?? {};
  return (
    <div className="space-y-4">
      <ReportHeader title={t("تقرير حركات الموظفين")} subtitle={t("السلف والمكافآت والخصومات خلال الفترة")} />
      <DateRange from={from} to={to} setFrom={setFrom} setTo={setTo} />
      <Cards items={[
        [t("عدد الحركات"), nf.format(s.totalMovements ?? 0)],
        [t("إجمالي المدين"), nf.format(s.totalDebits ?? 0)],
        [t("إجمالي الدائن"), nf.format(s.totalCredits ?? 0)],
        [t("الصافي"), nf.format(s.netBalance ?? 0)],
        [t("المكافآت"), nf.format(s.totalBonuses ?? 0)],
        [t("الخصومات"), nf.format(s.totalDeductions ?? 0)],
      ]} />
      <SimpleTable isError={isError} isFetching={isFetching} rows={rows} empty={t("لا توجد حركات في الفترة")} cols={[
        { label: t("التاريخ"), render: (r) => (r.date ?? "").slice(0, 10) },
        { label: t("الموظف"), render: (r) => <b>{r.employeeName}</b> },
        { label: t("النوع"), render: (r) => r.movementTypeName },
        { label: t("المبلغ"), num: true, render: (r) => nf.format(r.egpAmount ?? 0) },
        { label: t("مدين"), num: true, render: (r) => nf.format(r.debit ?? 0) },
        { label: t("دائن"), num: true, render: (r) => nf.format(r.credit ?? 0) },
        { label: t("السبب"), render: (r) => r.reason || "-" },
      ]} />
    </div>
  );
}
