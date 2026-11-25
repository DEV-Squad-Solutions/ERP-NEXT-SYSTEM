import { useMemo, useState } from "react";
import { Search, RotateCcw, Filter, ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import CompactSelect from "../../../shared/components/ui/CompactSelect";
import Input from "../../../shared/components/ui/Input";
import Button from "../../../shared/components/ui/Button";

import { t } from "../../../i18n";
const sourceTypeOptions = [
  { value: "OpeningBalance", label: t("رصيد افتتاحي") },
  { value: "Invoice", label: t("فاتورة") },
  { value: "CashVoucher", label: t("سند نقدي") },
];

const movementTypeOptions = [
  { value: "Sales", label: t("بيع") },
  { value: "SalesReturn", label: t("مرتجع بيع") },
  { value: "Purchase", label: t("شراء") },
  { value: "PurchaseReturn", label: t("مرتجع شراء") },
  { value: "CashReceipt", label: t("سند قبض") },
  { value: "CashPayment", label: t("سند صرف") },
];

/**
 * @param {{
 * draft: Object,
 * onChange: (draft: Object) => void,
 * onSearch: () => void,
 * onReset: () => void
 * }} props
 */
export default function StatementFilters({
  draft,
  onChange,
  onSearch,
  onReset,
}) {
  const [open, setOpen] = useState(false);

  const set = (key, value) =>
    onChange({
      ...draft,
      [key]: value,
    });

  const activeFilters = useMemo(() => {
    return Object.values(draft).filter(
      (v) => v !== "" && v !== null && v !== undefined,
    ).length;
  }, [draft]);

  return (
    <div className="mb-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-5 py-4 transition hover:bg-slate-50"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50">
            <Filter size={18} className="text-primary-600" />
          </div>

          <div className="text-right">
            <h3 className="font-semibold">{t("فلاتر كشف الحساب")}</h3>

            <span className="text-xs text-gray-500">
              {activeFilters} {t("فلتر مفعل")}
            </span>
          </div>
        </div>

        <motion.div
          animate={{
            rotate: open ? 180 : 0,
          }}
        >
          <ChevronDown size={20} />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.form
            onSubmit={(e) => {
              e.preventDefault();
              onSearch();
            }}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <div className="border-t p-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                <Input
                  label={t("بحث")}
                  value={draft.Search}
                  onChange={(e) => set("Search", e.target.value)}
                />

                <Input
                  type="date"
                  label={t("من تاريخ")}
                  value={draft.FromDate}
                  onChange={(e) => set("FromDate", e.target.value)}
                />

                <Input
                  type="date"
                  label={t("إلى تاريخ")}
                  value={draft.ToDate}
                  onChange={(e) => set("ToDate", e.target.value)}
                />

                <div>
                  <label className="mb-1.5 block text-sm font-medium">
                    {t("مصدر الحركة")}
                  </label>

                  <CompactSelect
                    options={sourceTypeOptions}
                    value={draft.SourceType}
                    onChange={(v) => set("SourceType", v)}
                    placeholder={t("الكل")}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium">
                    {t("نوع الحركة")}
                  </label>

                  <CompactSelect
                    options={movementTypeOptions}
                    value={draft.MovementType}
                    onChange={(v) => set("MovementType", v)}
                    placeholder={t("الكل")}
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3 border-t border-slate-200 pt-5">
                <Button type="button" variant="outline" onClick={onReset}>
                  <RotateCcw size={16} />
                  {t("إعادة تعيين")}
                </Button>

                <Button type="submit">
                  <Search size={16} />
                  {t("بحث")}
                </Button>
              </div>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
