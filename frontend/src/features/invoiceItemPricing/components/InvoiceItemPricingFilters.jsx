// features/invoiceItemPricing/components/InvoiceItemPricingFilters.jsx
import { Search, RotateCcw } from "lucide-react";

import Input from "../../../shared/components/ui/Input";
import CompactSelect from "../../../shared/components/ui/CompactSelect";
import Button from "../../../shared/components/ui/Button";

import { t } from "../../../i18n";
const INVOICE_TYPE_OPTIONS = [
  { value: "", label: t("الكل") },
  { value: "Sales", label: t("مبيعات") },
  { value: "Purchase", label: t("مشتريات") },
  { value: "SalesReturn", label: t("مرتجع مبيعات") },
  { value: "PurchaseReturn", label: t("مرتجع مشتريات") },
];

export default function InvoiceItemPricingFilters({
  draft,
  onChange,
  onSearch,
  onReset,
}) {
  const setField = (key, value) => onChange({ ...draft, [key]: value });

  return (
    <div className="bg-white rounded-2xl border border-ink-400/10 shadow-card p-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="lg:col-span-2">
          <Input
            label={t("بحث")}
            value={draft.search}
            onChange={(event) => setField("search", event.target.value)}
            placeholder={t("بحث برقم الفاتورة أو الصنف...")}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-ink-400 mb-1">
            {t("نوع الفاتورة")}
          </label>

          <CompactSelect
            options={INVOICE_TYPE_OPTIONS}
            value={draft.invoiceType}
            onChange={(value) => setField("invoiceType", value)}
          />
        </div>

        <Input
          label={t("من تاريخ")}
          type="date"
          value={draft.fromDate}
          onChange={(event) => setField("fromDate", event.target.value)}
        />

        <Input
          label={t("إلى تاريخ")}
          type="date"
          value={draft.toDate}
          onChange={(event) => setField("toDate", event.target.value)}
        />
      </div>

      <div className="flex justify-end gap-2 mt-3">
        <Button onClick={onSearch} className="h-9">
          <Search size={14} />
          {t("بحث")}
        </Button>

        <Button variant="outline" onClick={onReset} className="h-9">
          <RotateCcw size={14} />
          {t("تصفير")}
        </Button>
      </div>
    </div>
  );
}
