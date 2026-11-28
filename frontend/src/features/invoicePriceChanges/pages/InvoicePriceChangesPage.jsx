import { useMemo, useState } from "react";
import { toast } from "sonner";

import Button from "../../../shared/components/ui/Button";
import DateInput from "../../../shared/components/ui/DateInput";
import NumericInput from "../../../shared/components/ui/NumericInput";
import SearchableSelect from "../../../shared/components/ui/SearchableSelect";
import { t, getLocale } from "../../../i18n";
import { useGetItemsSelectQuery } from "../../inventory/inventoryApi";
import {
  useApplyInvoicePriceChangeMutation,
  usePreviewInvoicePriceChangeMutation,
} from "../invoicePriceChangesApi";

const CURRENCIES = ["EGP", "USD", "EUR", "GBP", "SAR", "AED", "KWD"];

const REASON_AR = {
  HasPayments: "عليها دفعات (غير مضمّنة)",
  ClosedPeriod: "فترة مالية مغلقة",
  HasLinkedReturns: "لها مرتجعات مرتبطة",
  ReturnInvoice: "فاتورة مرتجع",
  PriceAlreadyEqual: "السعر مطابق",
  PaidAmountExceedsNewTotal: "المدفوع أكبر من الإجمالي الجديد",
};

const fmt = (v) =>
  Number(v || 0).toLocaleString(getLocale(), {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const cell = "px-3 py-2 text-start text-[13px] align-top";
const head = "px-3 py-2 text-start text-[12px] font-bold text-ink-500";

let rowKey = 1;
const newRow = () => ({ key: rowKey++, itemId: null, price: "" });

export default function InvoicePriceChangesPage() {
  const { data: itemsData } = useGetItemsSelectQuery();
  const items = useMemo(
    () => (Array.isArray(itemsData) ? itemsData : itemsData?.items || []),
    [itemsData],
  );

  const [rows, setRows] = useState([newRow()]);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [currency, setCurrency] = useState("EGP");
  const [invoiceType, setInvoiceType] = useState("");
  const [includePosted, setIncludePosted] = useState(false);
  const [confirmPosted, setConfirmPosted] = useState(false);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);

  const [runPreview, { isLoading: previewing }] =
    usePreviewInvoicePriceChangeMutation();
  const [runApply, { isLoading: applying }] =
    useApplyInvoicePriceChangeMutation();

  const duplicate = useMemo(() => {
    const ids = rows.map((r) => r.itemId).filter(Boolean);
    return new Set(ids).size !== ids.length;
  }, [rows]);

  const ready =
    rows.length > 0 &&
    rows.every((r) => r.itemId && Number(r.price) > 0) &&
    !duplicate &&
    fromDate &&
    toDate &&
    fromDate <= toDate;

  const body = () => ({
    items: rows.map((r) => ({ itemId: r.itemId, newPrice: Number(r.price) })),
    fromDate,
    toDate,
    currency,
    invoiceType: invoiceType || null,
    includePosted,
  });

  // أي تغيير في المدخلات يلغي المعاينة السابقة
  const touch = (fn) => (...a) => {
    setPreview(null);
    setResult(null);
    setConfirmPosted(false);
    fn(...a);
  };

  const errorText = (e) =>
    e?.data?.detail || e?.data?.title || t("تعذر تنفيذ الطلب");

  const onPreview = async () => {
    setResult(null);
    try {
      setPreview(await runPreview(body()).unwrap());
    } catch (e) {
      setPreview(null);
      toast.error(errorText(e));
    }
  };

  const onApply = async () => {
    try {
      const res = await runApply({
        ...body(),
        expectedInvoiceCount: preview.invoicesEligible,
        confirmIncludePosted: includePosted ? confirmPosted : false,
      }).unwrap();
      setResult(res);
      setPreview(null);
      toast.success(t("تم تعديل الأسعار"));
    } catch (e) {
      toast.error(errorText(e));
    }
  };

  const canApply =
    preview &&
    preview.invoicesEligible > 0 &&
    (!includePosted || confirmPosted) &&
    !applying;

  return (
    <div className="space-y-5" dir="rtl">
      <div>
        <h1 className="text-lg font-bold">{t("تعديل أسعار أصناف في الفواتير")}</h1>
        <p className="mt-1 text-[13px] text-ink-500">
          {t("يغيّر سعر الوحدة للأصناف المختارة في فواتير الفترة. اعرض المعاينة أولا ثم طبّق.")}
        </p>
      </div>

      <div className="space-y-3 rounded-2xl border border-ink-400/20 p-4">
        {rows.map((r, i) => (
          <div key={r.key} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_160px_auto]">
            <SearchableSelect
              data={items}
              value={r.itemId}
              getOptionLabel={(it) => `${it.code ? it.code + " - " : ""}${it.name}`}
              getOptionValue={(it) => it.id}
              placeholder={t("اختر الصنف")}
              onChange={touch((it) =>
                setRows((rs) =>
                  rs.map((x, j) => (j === i ? { ...x, itemId: it?.id ?? it ?? null } : x)),
                ),
              )}
            />
            <NumericInput
              value={r.price}
              placeholder={t("السعر الجديد")}
              onChange={touch((e) =>
                setRows((rs) =>
                  rs.map((x, j) =>
                    j === i ? { ...x, price: e?.target ? e.target.value : e } : x,
                  ),
                ),
              )}
            />
            <Button
              variant="ghost"
              disabled={rows.length === 1}
              onClick={touch(() => setRows((rs) => rs.filter((_, j) => j !== i)))}
            >
              {t("حذف")}
            </Button>
          </div>
        ))}
        {duplicate && (
          <p className="text-[13px] text-negative">{t("صنف مكرر في القائمة")}</p>
        )}
        <Button variant="outline" onClick={touch(() => setRows((rs) => [...rs, newRow()]))}>
          {t("إضافة صنف")}
        </Button>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <label className="text-[13px]">
            {t("من تاريخ")}
            <DateInput value={fromDate} onChange={touch((e) => setFromDate(e?.target ? e.target.value : e))} />
          </label>
          <label className="text-[13px]">
            {t("إلى تاريخ")}
            <DateInput value={toDate} onChange={touch((e) => setToDate(e?.target ? e.target.value : e))} />
          </label>
          <label className="text-[13px]">
            {t("العملة")}
            <select
              className="mt-1 h-10 w-full rounded-xl border border-ink-400/25 bg-white px-3 dark:bg-ink-900 dark:text-white"
              value={currency}
              onChange={touch((e) => setCurrency(e.target.value))}
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="text-[13px]">
            {t("نوع الفاتورة")}
            <select
              className="mt-1 h-10 w-full rounded-xl border border-ink-400/25 bg-white px-3 dark:bg-ink-900 dark:text-white"
              value={invoiceType}
              onChange={touch((e) => setInvoiceType(e.target.value))}
            >
              <option value="">{t("بيع وشراء")}</option>
              <option value="Sales">{t("بيع")}</option>
              <option value="Purchase">{t("شراء")}</option>
            </select>
          </label>
        </div>

        <label className="flex items-start gap-2 text-[13px]">
          <input
            type="checkbox"
            className="mt-1"
            checked={includePosted}
            onChange={touch((e) => setIncludePosted(e.target.checked))}
          />
          <span>
            {t("تضمين الفواتير المسددة أو التي عليها دفعات")}
            <span className="block text-ink-500">
              {t("الفواتير النقدية يتغير مبلغ سند الدفع فيها ليساوي الإجمالي الجديد.")}
            </span>
          </span>
        </label>

        <Button onClick={onPreview} disabled={!ready || previewing}>
          {previewing ? t("جاري المعاينة...") : t("معاينة")}
        </Button>
      </div>

      {preview && (
        <div className="space-y-4 rounded-2xl border border-ink-400/20 p-4">
          <h2 className="font-bold">{t("نتيجة المعاينة (لم يتغير شيء بعد)")}</h2>
          <div className="grid grid-cols-2 gap-3 text-[13px] sm:grid-cols-4">
            <div>{t("فواتير ستتغير")}: <b>{preview.invoicesEligible}</b></div>
            <div>{t("سطور ستتغير")}: <b>{preview.linesEligible}</b></div>
            <div>{t("فرق الإجمالي")}: <b dir="ltr">{fmt(preview.totalDelta)}</b></div>
            <div>{t("فواتير مسددة ضمنها")}: <b>{preview.paidInvoicesAffected}</b></div>
          </div>
          {!includePosted && preview.paidInvoicesNotIncluded > 0 && (
            <p className="text-[13px] text-warning-700">
              {t("فواتير عليها دفعات لم تُضمَّن")}: <b>{preview.paidInvoicesNotIncluded}</b>.{" "}
              {t("فعّل خيار التضمين لو تريد تعديلها.")}
            </p>
          )}
          {includePosted && (
            <p className="text-[13px]">
              {t("تغيير مبالغ الخزنة (الفواتير النقدية)")}:{" "}
              <b dir="ltr">{fmt(preview.cashboxAmountChange)}</b>
            </p>
          )}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px]">
              <thead><tr>
                <th className={head}>{t("الصنف")}</th>
                <th className={head}>{t("السعر الجديد")}</th>
                <th className={head}>{t("فواتير")}</th>
                <th className={head}>{t("سطور")}</th>
                <th className={head}>{t("الفرق")}</th>
              </tr></thead>
              <tbody>
                {preview.items.map((it) => (
                  <tr key={it.itemId} className="border-t border-ink-400/10">
                    <td className={`${cell} break-words`}>{it.itemName}</td>
                    <td className={cell} dir="ltr">{fmt(it.newPrice)}</td>
                    <td className={cell}>{it.invoicesAffected}</td>
                    <td className={cell}>{it.linesAffected}</td>
                    <td className={cell} dir="ltr">{fmt(it.totalDelta)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <details>
            <summary className="cursor-pointer text-[13px] font-bold">
              {t("الفواتير")} ({preview.invoices.length})
            </summary>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full min-w-[560px]">
                <thead><tr>
                  <th className={head}>{t("الرقم")}</th>
                  <th className={head}>{t("التاريخ")}</th>
                  <th className={head}>{t("قبل")}</th>
                  <th className={head}>{t("بعد")}</th>
                  <th className={head}>{t("الفرق")}</th>
                </tr></thead>
                <tbody>
                  {preview.invoices.map((r) => (
                    <tr key={r.invoiceId} className="border-t border-ink-400/10">
                      <td className={`${cell} break-all`}>{r.invoiceNumber}{r.hasPayments ? " *" : ""}</td>
                      <td className={cell} dir="ltr">{r.invoiceDate}</td>
                      <td className={cell} dir="ltr">{fmt(r.oldTotal)}</td>
                      <td className={cell} dir="ltr">{fmt(r.newTotal)}</td>
                      <td className={cell} dir="ltr">{fmt(r.totalDelta)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>

          {preview.skipped.length > 0 && (
            <details>
              <summary className="cursor-pointer text-[13px] font-bold">
                {t("فواتير تم تخطيها")} ({preview.skipped.length})
              </summary>
              <ul className="mt-2 space-y-1 text-[13px]">
                {preview.skipped.map((s) => (
                  <li key={s.invoiceId} className="break-all">
                    {s.invoiceNumber} ({s.invoiceDate}): {t(REASON_AR[s.reason] || s.reason)}
                  </li>
                ))}
              </ul>
            </details>
          )}

          {includePosted && (
            <label className="flex items-start gap-2 text-[13px]">
              <input
                type="checkbox"
                className="mt-1"
                checked={confirmPosted}
                onChange={(e) => setConfirmPosted(e.target.checked)}
              />
              <span>
                {t("أؤكد تعديل الفواتير المسددة وتغيير مبالغ السندات المرتبطة بها")}
              </span>
            </label>
          )}

          <Button onClick={onApply} disabled={!canApply}>
            {applying ? t("جاري التطبيق...") : t("تطبيق التعديل")}
          </Button>
        </div>
      )}

      {result && (
        <div className="rounded-2xl border border-positive/30 p-4 text-[13px]">
          <b>{t("تم التطبيق")}</b>: {result.invoicesChanged} {t("فاتورة")}،{" "}
          {result.linesChanged} {t("سطر")}، {t("فرق الإجمالي")}{" "}
          <span dir="ltr">{fmt(result.totalDelta)}</span>
          {result.paidInvoicesChanged > 0 && (
            <> ({result.paidInvoicesChanged} {t("منها مسددة")})</>
          )}
        </div>
      )}
    </div>
  );
}
