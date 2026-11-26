import { useMemo, useState } from "react";
import { Boxes, Package, Wallet, Search } from "lucide-react";
import { useGetStoreStockReportQuery, useGetStoresSelectQuery } from "../../stores/storesApi";
import CompactSelect from "../../../shared/components/ui/CompactSelect";
import Input from "../../../shared/components/ui/Input";
import Pagination from "../../../shared/components/ui/Pagination";
import { t, getLocale } from "../../../i18n";

const today = new Date().toISOString().slice(0, 10);

export default function InventoryStockReportPage() {
  const nf = useMemo(() => new Intl.NumberFormat(getLocale(), { maximumFractionDigits: 2 }), []);
  const [storeId, setStoreId] = useState("");
  const [search, setSearch] = useState("");
  const [asOfDate, setAsOfDate] = useState(today);
  const [onlyStock, setOnlyStock] = useState(true);
  const [pageNumber, setPageNumber] = useState(1);

  const { data: stores, isLoading: storesLoading } = useGetStoresSelectQuery();
  const storeOptions = useMemo(
    () => (stores?.items ?? stores ?? []).map((s) => ({ value: String(s.id), label: s.name })),
    [stores],
  );
  const activeStore = storeId || storeOptions[0]?.value || "";

  const { data, isFetching, isError } = useGetStoreStockReportQuery(
    {
      storeId: activeStore,
      pageNumber,
      pageSize: 25,
      asOfDate,
      search: search.trim() || undefined,
      hasStock: onlyStock ? true : undefined,
    },
    { skip: !activeStore },
  );

  const rows = data?.items ?? [];
  const summary = data?.summary ?? {};

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-ink-900">{t("تقرير أرصدة المخزون")}</h1>
        <p className="text-sm text-ink-500">{t("رصيد كل صنف وقيمته في المخزن المختار")}</p>
      </div>

      <div className="grid grid-cols-1 gap-3 rounded-2xl border border-ink-400/10 bg-white p-3 sm:grid-cols-2 lg:grid-cols-4">
        <CompactSelect
          label={t("المخزن")}
          options={storeOptions}
          value={activeStore}
          onChange={(v) => { setStoreId(v); setPageNumber(1); }}
          loading={storesLoading}
        />
        <Input
          label={t("الرصيد في تاريخ")}
          type="date"
          value={asOfDate}
          onChange={(e) => { setAsOfDate(e.target.value); setPageNumber(1); }}
        />
        <div className="relative">
          <Input
            label={t("بحث بالصنف")}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPageNumber(1); }}
            placeholder={t("اسم أو كود الصنف")}
          />
          <Search size={14} className="pointer-events-none absolute end-3 top-9 text-ink-400" />
        </div>
        <label className="flex cursor-pointer items-center gap-2 self-end rounded-xl border border-ink-400/10 px-3 py-2.5 text-sm text-ink-700">
          <input type="checkbox" checked={onlyStock} onChange={(e) => { setOnlyStock(e.target.checked); setPageNumber(1); }} className="h-4 w-4 accent-primary-500" />
          {t("الأصناف اللي ليها رصيد بس")}
        </label>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {[
          [Boxes, t("عدد الأصناف"), nf.format(summary.totalItemCount ?? 0)],
          [Package, t("أصناف ليها رصيد"), nf.format(summary.itemsWithStockCount ?? 0)],
          [Wallet, t("قيمة المخزون"), nf.format(summary.totalInventoryValue ?? 0)],
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
              <th className="px-3 py-2.5 text-start">{t("كود الصنف")}</th>
              <th className="px-3 py-2.5 text-start">{t("الصنف")}</th>
              <th className="px-3 py-2.5 text-start">{t("الوحدة")}</th>
              <th className="px-3 py-2.5 text-start">{t("الرصيد")}</th>
              <th className="px-3 py-2.5 text-start">{t("متوسط التكلفة")}</th>
              <th className="px-3 py-2.5 text-start">{t("قيمة المخزون")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={`${r.itemId}-${r.itemUnitId}`} className="border-b border-ink-400/5">
                <td className="px-3 py-2.5 text-ink-600">{r.itemCode}</td>
                <td className="px-3 py-2.5 font-medium text-ink-900">{r.itemName}</td>
                <td className="px-3 py-2.5 text-ink-600">{r.itemUnitName}</td>
                <td className="num px-3 py-2.5">{nf.format(r.balance ?? 0)}</td>
                <td className="num px-3 py-2.5">{nf.format(r.averageCost ?? 0)}</td>
                <td className="num px-3 py-2.5 font-semibold">{nf.format(r.inventoryValue ?? 0)}</td>
              </tr>
            ))}
            {!isFetching && rows.length === 0 && (
              <tr><td colSpan={6} className="px-3 py-8 text-center text-ink-500">{isError ? t("تعذر تحميل التقرير") : t("لا توجد أصناف مطابقة")}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {(data?.totalPages ?? 0) > 1 && (
        <Pagination currentPage={pageNumber} totalPages={data.totalPages} onPageChange={setPageNumber} />
      )}
    </div>
  );
}
