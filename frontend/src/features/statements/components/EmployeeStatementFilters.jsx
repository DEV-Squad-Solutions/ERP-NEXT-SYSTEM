// features/statements/components/EmployeeStatementFilters.jsx
import { Search, RotateCcw } from "lucide-react";
import DateInput from "../../../shared/components/ui/DateInput.jsx";

import { t } from "../../../i18n";
const SOURCE_TYPES = [
  { value: "", label: t("الكل") },
  { value: "OpeningBalance", label: t("رصيد افتتاحي") },
  { value: "SalaryTransfer", label: t("تحويل راتب") },
  { value: "Movement", label: t("حركة") },
  { value: "CashVoucher", label: t("سند نقدي") },
];

const MOVEMENT_TYPES = [
  { value: "", label: t("الكل") },
  { value: "Debit", label: t("مدين") },
  { value: "Credit", label: t("دائن") },
  { value: "Advance", label: t("سلفة") },
  { value: "Deduction", label: t("خصم") },
  { value: "Bonus", label: t("مكافأة") },
  { value: "Withdrawal", label: t("سحب") },
];

export default function EmployeeStatementFilters({
  draft,
  onChange,
  onSearch,
  onReset,
}) {
  const set = (key, value) => onChange({ ...draft, [key]: value });

  return (
    <div className="rounded-2xl border border-ink-400/10 bg-white/60 p-3 sm:p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <label className="mb-1 block text-xs text-ink-400">{t("بحث")}</label>
          <input
            type="text"
            value={draft.Search}
            onChange={(e) => set("Search", e.target.value)}
            placeholder={t("بحث برقم المستند أو الوصف...")}
            className="h-9 w-full rounded-lg border border-ink-400/15 bg-white px-3 text-sm outline-none focus:border-primary-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-ink-400">{t("من تاريخ")}</label>
          <DateInput
            type="date"
            value={draft.FromDate}
            onChange={(e) => set("FromDate", e.target.value)}
            className="h-9 w-full rounded-lg border border-ink-400/15 bg-white px-3 text-sm outline-none focus:border-primary-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-ink-400">{t("إلى تاريخ")}</label>
          <DateInput
            type="date"
            value={draft.ToDate}
            onChange={(e) => set("ToDate", e.target.value)}
            className="h-9 w-full rounded-lg border border-ink-400/15 bg-white px-3 text-sm outline-none focus:border-primary-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-ink-400">{t("نوع المصدر")}</label>
          <select
            value={draft.SourceType}
            onChange={(e) => set("SourceType", e.target.value)}
            className="h-9 w-full rounded-lg border border-ink-400/15 bg-white px-3 text-sm outline-none focus:border-primary-500"
          >
            {SOURCE_TYPES.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-ink-400">{t("نوع الحركة")}</label>
          <select
            value={draft.MovementType}
            onChange={(e) => set("MovementType", e.target.value)}
            className="h-9 w-full rounded-lg border border-ink-400/15 bg-white px-3 text-sm outline-none focus:border-primary-500"
          >
            {MOVEMENT_TYPES.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onReset}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs text-ink-400 hover:bg-ink-400/5 sm:text-sm"
        >
          <RotateCcw size={14} />
          {t("إعادة تعيين")}
        </button>
        <button
          type="button"
          onClick={onSearch}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary-500 px-4 text-xs font-medium text-white hover:bg-primary-600 sm:text-sm"
        >
          <Search size={14} />
          {t("بحث")}
        </button>
      </div>
    </div>
  );
}
