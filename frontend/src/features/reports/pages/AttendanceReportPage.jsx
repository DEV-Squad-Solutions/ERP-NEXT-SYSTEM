import { useMemo, useState } from "react";
import { useGetAttendanceReportQuery } from "../hrReportsApi";
import { ReportHeader, DateRange, Cards, SimpleTable, todayISO, yearStartISO } from "./ReportKit";
import { t, getLocale } from "../../../i18n";

export default function AttendanceReportPage() {
  const nf = useMemo(() => new Intl.NumberFormat(getLocale(), { maximumFractionDigits: 2 }), []);
  const [from, setFrom] = useState(yearStartISO());
  const [to, setTo] = useState(todayISO());
  const { data, isFetching, isError } = useGetAttendanceReportQuery({
    startDate: from || yearStartISO(),
    endDate: to || todayISO(),
  });
  const rows = data?.employees ?? [];
  return (
    <div className="space-y-4">
      <ReportHeader title={t("تقرير الحضور والانصراف")} subtitle={t("ملخص حضور وغياب كل موظف خلال الفترة")} />
      <DateRange from={from} to={to} setFrom={setFrom} setTo={setTo} />
      <Cards items={[
        [t("عدد الموظفين"), nf.format(data?.totalEmployees ?? 0)],
        [t("أيام الحضور"), nf.format(data?.totalPresentDays ?? 0)],
        [t("أيام الغياب"), nf.format(data?.totalAbsentDays ?? 0)],
        [t("وحدات العمل"), nf.format(data?.totalWorkedUnits ?? 0)],
        [t("وحدات الإضافي"), nf.format(data?.totalOvertimeUnits ?? 0)],
        [t("وحدات الخصم"), nf.format(data?.totalDeductionUnits ?? 0)],
      ]} />
      <SimpleTable isError={isError} isFetching={isFetching} rows={rows} empty={t("لا توجد بيانات حضور في الفترة")} cols={[
        { label: t("الكود"), render: (r) => r.employeeCode },
        { label: t("الموظف"), render: (r) => <b>{r.employeeName}</b> },
        { label: t("أيام الحضور"), num: true, render: (r) => nf.format(r.presentDays ?? 0) },
        { label: t("أيام الغياب"), num: true, render: (r) => nf.format(r.absentDays ?? 0) },
        { label: t("وحدات العمل"), num: true, render: (r) => nf.format(r.workedUnits ?? 0) },
        { label: t("الإضافي"), num: true, render: (r) => nf.format(r.overtimeUnits ?? 0) },
        { label: t("الخصم"), num: true, render: (r) => nf.format(r.deductionUnits ?? 0) },
      ]} />
    </div>
  );
}
