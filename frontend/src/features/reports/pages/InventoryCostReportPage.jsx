import { useMemo, useState } from "react";
import { ArrowDownToLine, ArrowUpFromLine, Wallet } from "lucide-react";
import { useGetInventoryCostReportQuery, useGetStoresSelectQuery } from "../../stores/storesApi";
import { useGetItemsSelectQuery } from "../../inventory/inventoryApi";
import CompactSelect from "../../../shared/components/ui/CompactSelect";
import Input from "../../../shared/components/ui/Input";
import Pagination from "../../../shared/components/ui/Pagination";
import { t, getLocale } from "../../../i18n";

export default function InventoryCostReportPage() {
  const nf = useMemo(() => new Intl.NumberFormat(getLocale(), { maximumFractionDigits: 2 }), []);
  const [storeId, setStoreId] = useState("");
  const [itemId, setItemId] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [pageNumber, setPageNumber] = useState(1);

  const { data: stores } = useGetStoresSelectQuery();
  const { data: items } = useGetItemsSelectQuery();
  const storeOptions = useMemo(
    () => (stores?.items ?? stores ?? []).map((s) => ({ value: String(s.id), label: s.name })),
    [stores],
  );
  const itemOptions = useMemo(
    () => (items?.items ?? items ?? []).map((s) => ({ value: String(s.id), label: s.name })),
    [items],
  );
  const activeStore = storeId || storeOptions[0]?.value || "";
  const activeItem = itemId || itemOptions[0]?.value || "";

  const { data, isFetching, isError } = useGetInventoryCostReportQuery(
    { storeId: activeStore, itemId: activeItem, pageNumber, pageSize: 25, fromDate: fromDate || undefined, toDate: toDate || undefined },
    { skip: !activeStore || !activeItem },
  );
  const rows = data?.items ?? [];
  const s = data?.summary ?? {};

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-ink-900">{t("تقرير تكلفة المخزون")}</h1>
        <p className="text-sm text-ink-500">{t("حركة الصنف وتكلفته ومتوسط التكلفة بعد كل حركة")}</p>
      </div>

      <div className="grid grid-cols-1 gap-3 rounded-2xl border border-ink-400/10 bg-white p-3 sm:grid-cols-2 lg:grid-cols-4">
        <CompactSelect label={t("المخزن")} options={storeOptions} value={activeStore} onChange={(v) => { setStoreId(v); setPageNumber(1); }} />
        <CompactSelect label={t("الصنف")} options={itemOptions} value={activeItem} onChange={(v) => { setItemId(v); setPageNumber(1); }} />
        <Input label={t("من تاريخ")} type="date" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setPageNumber(1); }} />
        <Input label={t("إلى تاريخ")} type="date" value={toDate} onChange={(e) => { setToDate(e.target.value); setPageNumber(1); }} />
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {[
          [ArrowDownToLine, t("إجمالي الوارد"), nf.format(s.totalQuantityIn ?? 0)],
          [ArrowUpFromLine, t("إجمالي الصادر"), nf.format(s.totalQuantityOut ?? 0)],
          [Wallet, t("قيمة الرصيد الحالي"), nf.format(s.currentInventoryValue ?? 0)],
        ].map(([Icon, label, value]) => (
          <div key={label} className="rounded-2xl border border-ink-400/10 bg-white p-3">
            <div className="flex items-center gap-1.5 text-[11px] text-ink-500"><Icon size={13} />{label}</div>
            <div className="num mt-1 text-base font-bold text-ink-900 sm:text-lg">{value}</div>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-ink-400/10 bg-white">
        <table className="cards-on-phone w-full min-w-[900px] border-collapse text-start text-sm">
          <thead>
            <tr className="border-b border-ink-400/10 bg-ink-400/[0.03] text-xs text-ink-500">
              <th className="px-3 py-2.5 text-start">{t("التاريخ")}</th>
              <th className="px-3 py-2.5 text-start">{t("المرجع")}</th>
              <th className="px-3 py-2.5 text-start">{t("وارد")}</th>
              <th className="px-3 py-2.5 text-start">{t("صادر")}</th>
              <th className="px-3 py-2.5 text-start">{t("تكلفة الوحدة")}</th>
              <th className="px-3 py-2.5 text-start">{t("إجمالي التكلفة")}</th>
              <th className="px-3 py-2.5 text-start">{t("الرصيد بعد")}</th>
              <th className="px-3 py-2.5 text-start">{t("متوسط التكلفة بعد")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.movementId} className="border-b border-ink-400/5">
                <td className="px-3 py-2.5">{String(r.movementDate || "").slice(0, 10)}</td>
                <td className="px-3 py-2.5 text-ink-700">{r.referenceNumber || r.description || "—"}</td>
                <td className="num px-3 py-2.5 text-positive">{nf.format(r.quantityIn ?? 0)}</td>
                <td className="num px-3 py-2.5 text-negative">{nf.format(r.quantityOut ?? 0)}</td>
                <td className="num px-3 py-2.5">{nf.format(r.unitCost ?? 0)}</td>
                <td className="num px-3 py-2.5 font-semibold">{nf.format(r.totalCost ?? 0)}</td>
                <td className="num px-3 py-2.5">{nf.format(r.quantityAfter ?? 0)}</td>
                <td className="num px-3 py-2.5">{nf.format(r.averageCostAfter ?? 0)}</td>
              </tr>
            ))}
            {!isFetching && rows.length === 0 && (
              <tr><td colSpan={8} className="px-3 py-8 text-center text-ink-500">{isError ? t("تعذر تحميل التقرير") : t("لا توجد حركات")}</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {(data?.totalPages ?? 0) > 1 && <Pagination currentPage={pageNumber} totalPages={data.totalPages} onPageChange={setPageNumber} />}
    </div>
  );
}
