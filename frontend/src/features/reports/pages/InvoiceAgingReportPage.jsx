import { useMemo, useState } from "react";
import { useGetInvoiceAgingQuery } from "../hrReportsApi";
import { ReportHeader, Cards, SimpleTable, todayISO } from "./ReportKit";
import Input from "../../../shared/components/ui/Input";
import { t, getLocale } from "../../../i18n";

export default function InvoiceAgingReportPage() {
  const nf = useMemo(() => new Intl.NumberFormat(getLocale(), { maximumFractionDigits: 2 }), []);
  const [kind, setKind] = useState("Sales");
  const [asOf, setAsOf] = useState(todayISO());
  const { data, isFetching, isError } = useGetInvoiceAgingQuery({ kind, asOfDate: asOf || todayISO() });
  const tot = data?.totals ?? {};
  return (
    <div className="space-y-4">
      <ReportHeader title={t("أعمار الديون")} subtitle={t("المبالغ المتبقية على الفواتير حسب مدة التأخير")} />
      <div className="grid grid-cols-1 gap-3 rounded-2xl border border-ink-400/10 bg-white p-3 sm:grid-cols-2">
        <div className="flex gap-2">
          {[["Sales", "العملاء (مبيعات)"], ["Purchases", "الموردين (مشتريات)"]].map(([k, l]) => (
            <button key={k} type="button" onClick={() => setKind(k)}
              className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-medium ${kind === k ? "border-primary-500 bg-primary-500/10 text-primary-700" : "border-ink-400/10 text-ink-700"}`}>
              {t(l)}
            </button>
          ))}
        </div>
        <Input label={t("حتى تاريخ")} type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} />
      </div>
      <Cards items={[
        [t("الإجمالي"), nf.format(tot.total ?? 0)],
        [t("غير مستحق"), nf.format(tot.notDue ?? 0)],
        [t("متأخر أكثر من 90 يوم"), nf.format(tot.over90 ?? 0)],
      ]} />
      <SimpleTable isError={isError} isFetching={isFetching} rows={data?.rows ?? []} empty={t("لا توجد مبالغ متبقية")} cols={[
        { label: t("الاسم"), render: (r) => <b>{r.partnerName}</b> },
        { label: t("غير مستحق"), num: true, render: (r) => nf.format(r.notDue) },
        { label: t("1-30 يوم"), num: true, render: (r) => nf.format(r.days1To30) },
        { label: t("31-60 يوم"), num: true, render: (r) => nf.format(r.days31To60) },
        { label: t("61-90 يوم"), num: true, render: (r) => nf.format(r.days61To90) },
        { label: t("أكثر من 90"), num: true, render: (r) => nf.format(r.over90) },
        { label: t("الإجمالي"), num: true, render: (r) => nf.format(r.total) },
      ]} />
    </div>
  );
}
