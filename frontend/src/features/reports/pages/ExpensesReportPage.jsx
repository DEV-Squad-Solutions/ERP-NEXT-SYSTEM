import { useMemo, useState } from "react";
import TableLoadingRow from "../../../shared/components/ui/TableLoadingRow";
import { Receipt, Wallet } from "lucide-react";
import { useGetExpensesStatementQuery } from "../../statements/statementsApi";
import Input from "../../../shared/components/ui/Input";
import { t, getLocale } from "../../../i18n";

const todayISO = () => new Date().toISOString().slice(0, 10);
const yearStartISO = () => `${new Date().getFullYear()}-01-01`;

export default function ExpensesReportPage() {
  const nf = useMemo(() => new Intl.NumberFormat(getLocale(), { maximumFractionDigits: 2 }), []);
  const [fromDate, setFromDate] = useState(yearStartISO());
  const [toDate, setToDate] = useState(todayISO());
  const [withZero, setWithZero] = useState(false);

  const { data, isFetching, isError } = useGetExpensesStatementQuery({
    fromDate: fromDate || yearStartISO(),
    toDate: toDate || todayISO(),
    includeZeroBalances: withZero,
  });
  const rows = data?.items ?? [];
  const totals = data?.totals ?? {};
  const net = (r) => (r.periodDebit ?? 0) - (r.periodCredit ?? 0);
  const totalNet = (totals.periodDebit ?? 0) - (totals.periodCredit ?? 0);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-ink-900">{t("تقرير المصروفات")}</h1>
        <p className="text-sm text-ink-500">{t("إجمالي كل بند مصروف خلال الفترة")}</p>
      </div>

      <div className="grid grid-cols-1 gap-3 rounded-2xl border border-ink-400/10 bg-white p-3 sm:grid-cols-3">
        <Input label={t("من تاريخ")} type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        <Input label={t("إلى تاريخ")} type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        <label className="flex cursor-pointer items-center gap-2 self-end rounded-xl border border-ink-400/10 px-3 py-2.5 text-sm text-ink-700">
          <input type="checkbox" checked={withZero} onChange={(e) => setWithZero(e.target.checked)} className="h-4 w-4 accent-primary-500" />
          {t("إظهار البنود الصفرية")}
        </label>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        {[
          [Receipt, t("عدد البنود"), nf.format(rows.length)],
          [Wallet, t("إجمالي المصروفات"), nf.format(totalNet)],
        ].map(([Icon, label, value]) => (
          <div key={label} className="rounded-2xl border border-ink-400/10 bg-white p-3">
            <div className="flex items-center gap-1.5 text-[11px] text-ink-500"><Icon size={13} />{label}</div>
            <div className="num mt-1 text-base font-bold text-ink-900 sm:text-lg">{value}</div>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-ink-400/10 bg-white">
        <table className="cards-on-phone w-full min-w-[640px] border-collapse text-start text-sm">
          <thead>
            <tr className="border-b border-ink-400/10 bg-ink-400/[0.03] text-xs text-ink-500">
              <th className="px-3 py-2.5 text-start">{t("كود الحساب")}</th>
              <th className="px-3 py-2.5 text-start">{t("البند")}</th>
              <th className="px-3 py-2.5 text-start">{t("مدين الفترة")}</th>
              <th className="px-3 py-2.5 text-start">{t("دائن الفترة")}</th>
              <th className="px-3 py-2.5 text-start">{t("صافي المصروف")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.accountId} className="border-b border-ink-400/5">
                <td className="px-3 py-2.5 text-ink-600">{r.accountCode}</td>
                <td className="px-3 py-2.5 font-medium text-ink-900">{r.accountName}</td>
                <td className="num px-3 py-2.5">{nf.format(r.periodDebit ?? 0)}</td>
                <td className="num px-3 py-2.5">{nf.format(r.periodCredit ?? 0)}</td>
                <td className="num px-3 py-2.5 font-semibold">{nf.format(net(r))}</td>
              </tr>
            ))}
            {isFetching && rows.length === 0 && <TableLoadingRow colSpan={5} />}
            {!isFetching && rows.length === 0 && (
              <tr><td colSpan={5} className="px-3 py-8 text-center text-ink-500">{isError ? t("تعذر تحميل التقرير") : t("لا توجد مصروفات في الفترة")}</td></tr>
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="bg-ink-400/[0.03] font-bold">
                <td colSpan={2} className="px-3 py-2.5">{t("الإجمالي")}</td>
                <td className="num px-3 py-2.5">{nf.format(totals.periodDebit ?? 0)}</td>
                <td className="num px-3 py-2.5">{nf.format(totals.periodCredit ?? 0)}</td>
                <td className="num px-3 py-2.5">{nf.format(totalNet)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
