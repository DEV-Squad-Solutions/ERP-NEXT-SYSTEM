import Input from "../../../shared/components/ui/Input";
import TableLoadingRow from "../../../shared/components/ui/TableLoadingRow";
import { t } from "../../../i18n";

export const todayISO = () => new Date().toISOString().slice(0, 10);
export const yearStartISO = () => `${new Date().getFullYear()}-01-01`;

export function ReportHeader({ title, subtitle }) {
  return (
    <div>
      <h1 className="text-xl font-bold text-ink-900">{title}</h1>
      {subtitle && <p className="text-sm text-ink-500">{subtitle}</p>}
    </div>
  );
}

export function DateRange({ from, to, setFrom, setTo }) {
  return (
    <div className="grid grid-cols-1 gap-3 rounded-2xl border border-ink-400/10 bg-white p-3 sm:grid-cols-2">
      <Input label={t("من تاريخ")} type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
      <Input label={t("إلى تاريخ")} type="date" value={to} onChange={(e) => setTo(e.target.value)} />
    </div>
  );
}

export function Cards({ items }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
      {items.map(([label, value]) => (
        <div key={label} className="rounded-2xl border border-ink-400/10 bg-white p-3">
          <div className="text-[11px] text-ink-500">{label}</div>
          <div className="num mt-1 text-base font-bold text-ink-900 sm:text-lg">{value}</div>
        </div>
      ))}
    </div>
  );
}

export function SimpleTable({ cols, rows, empty, isError, isFetching }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-ink-400/10 bg-white">
      <table className="cards-on-phone w-full min-w-[640px] border-collapse text-start text-sm">
        <thead>
          <tr className="border-b border-ink-400/10 bg-ink-400/[0.03] text-xs text-ink-500">
            {cols.map((c) => (<th key={c.label} className="px-3 py-2.5 text-start">{c.label}</th>))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id ?? i} className="border-b border-ink-400/5">
              {cols.map((c) => (<td key={c.label} className={`px-3 py-2.5 ${c.num ? "num" : ""}`}>{c.render(r)}</td>))}
            </tr>
          ))}
          {isFetching && rows.length === 0 && <TableLoadingRow colSpan={cols.length} />}
            {!isFetching && rows.length === 0 && (
            <tr><td colSpan={cols.length} className="px-3 py-8 text-center text-ink-500">{isError ? t("تعذر تحميل التقرير") : empty}</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
