import { useMemo, useState } from "react";
import { ShoppingCart, Truck, Scale } from "lucide-react";
import { useGetPartnerItemMovementsQuery } from "../../statements/statementsApi";
import { useGetPartiesSelectQuery } from "../../partners/partiesApi";
import { useGetItemsSelectQuery } from "../../inventory/inventoryApi";
import CompactSelect from "../../../shared/components/ui/CompactSelect";
import Input from "../../../shared/components/ui/Input";
import { t, getLocale } from "../../../i18n";

export default function PartnerItemsReportPage() {
  const nf = useMemo(() => new Intl.NumberFormat(getLocale(), { maximumFractionDigits: 2 }), []);
  const [partnerId, setPartnerId] = useState("");
  const [itemId, setItemId] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const { data: parties } = useGetPartiesSelectQuery();
  const { data: items } = useGetItemsSelectQuery();
  const partyOptions = useMemo(() => (parties?.items ?? parties ?? []).map((p) => ({ value: String(p.id), label: p.name })), [parties]);
  const itemOptions = useMemo(() => (items?.items ?? items ?? []).map((p) => ({ value: String(p.id), label: p.name })), [items]);
  const activeParty = partnerId || partyOptions[0]?.value || "";
  const activeItem = itemId || itemOptions[0]?.value || "";

  const { data, isFetching, isError } = useGetPartnerItemMovementsQuery(
    { businessPartnerId: activeParty, itemId: activeItem, fromDate, toDate },
    { skip: !activeParty || !activeItem },
  );
  const rows = data?.movements ?? [];
  const s = data?.summary ?? {};

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-ink-900">{t("تقرير أصناف العملاء والموردين")}</h1>
        <p className="text-sm text-ink-500">{t("كل فواتير الصنف مع العميل أو المورد المختار")}</p>
      </div>

      <div className="grid grid-cols-1 gap-3 rounded-2xl border border-ink-400/10 bg-white p-3 sm:grid-cols-2 lg:grid-cols-4">
        <CompactSelect label={t("العميل / المورد")} options={partyOptions} value={activeParty} onChange={setPartnerId} />
        <CompactSelect label={t("الصنف")} options={itemOptions} value={activeItem} onChange={setItemId} />
        <Input label={t("من تاريخ")} type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        <Input label={t("إلى تاريخ")} type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        {[
          [ShoppingCart, t("كمية المبيعات"), nf.format(s.totalSalesQuantity ?? 0)],
          [Truck, t("كمية المشتريات"), nf.format(s.totalPurchaseQuantity ?? 0)],
          [Scale, t("وزن المبيعات"), nf.format(s.totalSalesWeight ?? 0)],
          [Scale, t("وزن المشتريات"), nf.format(s.totalPurchaseWeight ?? 0)],
        ].map(([Icon, label, value]) => (
          <div key={label} className="rounded-2xl border border-ink-400/10 bg-white p-3">
            <div className="flex items-center gap-1.5 text-[11px] text-ink-500"><Icon size={13} />{label}</div>
            <div className="num mt-1 text-base font-bold text-ink-900 sm:text-lg">{value}</div>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-ink-400/10 bg-white">
        <table className="cards-on-phone w-full min-w-[800px] border-collapse text-start text-sm">
          <thead>
            <tr className="border-b border-ink-400/10 bg-ink-400/[0.03] text-xs text-ink-500">
              <th className="px-3 py-2.5 text-start">{t("التاريخ")}</th>
              <th className="px-3 py-2.5 text-start">{t("الفاتورة")}</th>
              <th className="px-3 py-2.5 text-start">{t("النوع")}</th>
              <th className="px-3 py-2.5 text-start">{t("العدد")}</th>
              <th className="px-3 py-2.5 text-start">{t("الوزن")}</th>
              <th className="px-3 py-2.5 text-start">{t("الكمية")}</th>
              <th className="px-3 py-2.5 text-start">{t("سعر الوحدة")}</th>
              <th className="px-3 py-2.5 text-start">{t("الإجمالي")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={`${r.invoiceId}-${i}`} className="border-b border-ink-400/5">
                <td className="px-3 py-2.5">{String(r.invoiceDate || "").slice(0, 10)}</td>
                <td className="px-3 py-2.5 text-ink-700">{r.invoiceNumber}</td>
                <td className="px-3 py-2.5">{r.movementType}</td>
                <td className="num px-3 py-2.5">{nf.format(r.count ?? 0)}</td>
                <td className="num px-3 py-2.5">{nf.format(r.weight ?? 0)}</td>
                <td className="num px-3 py-2.5">{nf.format(r.quantity ?? 0)}</td>
                <td className="num px-3 py-2.5">{nf.format(r.unitPrice ?? 0)}</td>
                <td className="num px-3 py-2.5 font-semibold">{nf.format(r.totalAmount ?? 0)}</td>
              </tr>
            ))}
            {!isFetching && rows.length === 0 && (
              <tr><td colSpan={8} className="px-3 py-8 text-center text-ink-500">{isError ? t("تعذر تحميل التقرير") : t("لا توجد حركات لهذا الصنف مع الطرف المختار")}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
