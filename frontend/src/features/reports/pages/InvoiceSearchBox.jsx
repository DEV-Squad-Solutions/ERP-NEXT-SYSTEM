import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { useGetInvoiceProfitabilityQuery } from "../profitabilityApi";
import { t } from "../../../i18n";

// بحث برقم الفاتورة أو اسم العميل: اقتراحات أثناء الكتابة + تطبيق تلقائي
export default function InvoiceSearchBox({ value, fromDate, toDate, onChange, onCommit }) {
  const [open, setOpen] = useState(false);
  const [debounced, setDebounced] = useState(value ?? "");
  const wrapRef = useRef(null);
  const first = useRef(true);

  useEffect(() => {
    const h = setTimeout(() => setDebounced((value ?? "").trim()), 350);
    return () => clearTimeout(h);
  }, [value]);

  // تطبيق البحث تلقائياً بعد التوقف عن الكتابة
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    onCommit(debounced);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  const { data } = useGetInvoiceProfitabilityQuery(
    { fromDate: `${new Date().getFullYear()}-01-01`, toDate: new Date().toISOString().slice(0, 10), search: debounced, pageNumber: 1, pageSize: 8, includeReturns: true },
    { skip: debounced.length < 1 || !open },
  );

  const suggestions = useMemo(() => {
    const seen = new Set();
    const out = [];
    for (const inv of data?.invoices ?? []) {
      for (const [text, kind] of [[inv.invoiceNumber, t("فاتورة")], [inv.businessPartnerName, t("عميل")]]) {
        if (text && !seen.has(text)) { seen.add(text); out.push({ text, kind }); }
      }
    }
    return out.slice(0, 8);
  }, [data]);

  useEffect(() => {
    const close = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  const pick = (text) => { onChange(text); setOpen(false); };

  return (
    <div ref={wrapRef} className="relative">
      <div className="flex items-center gap-2 rounded-xl border border-ink-400/20 bg-white px-3 py-2.5 focus-within:border-primary-500">
        <Search size={16} className="shrink-0 text-ink-400" />
        <input
          type="text"
          enterKeyHint="search"
          autoComplete="off"
          value={value ?? ""}
          placeholder={t("رقم الفاتورة أو اسم العميل...")}
          onFocus={() => setOpen(true)}
          onChange={(e) => { onChange(e.target.value); setOpen(true); }}
          onKeyDown={(e) => { if (e.key === "Enter") { onCommit((value ?? "").trim()); setOpen(false); e.currentTarget.blur(); } }}
          style={{ border: 0, boxShadow: "none", outline: "none", background: "transparent" }}
          className="min-w-0 flex-1 text-sm text-ink-900 placeholder:text-ink-400"
        />
        {value ? (
          <button type="button" onClick={() => { onChange(""); onCommit(""); }} aria-label={t("مسح")} className="text-ink-400">
            <X size={16} />
          </button>
        ) : null}
      </div>
      {open && suggestions.length > 0 && (
        <ul className="absolute inset-x-0 top-full z-30 mt-1 max-h-64 overflow-auto rounded-xl border border-ink-400/15 bg-white py-1 shadow-lg">
          {suggestions.map((s) => (
            <li key={s.text}>
              <button type="button" onClick={() => pick(s.text)} className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-start text-sm hover:bg-ink-400/5">
                <span className="truncate text-ink-900">{s.text}</span>
                <span className="shrink-0 text-[11px] text-ink-500">{s.kind}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
