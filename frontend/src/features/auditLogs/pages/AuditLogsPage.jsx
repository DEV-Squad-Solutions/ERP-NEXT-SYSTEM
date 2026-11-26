import { useState } from "react";
import { toast } from "sonner";

import Pagination from "../../../shared/components/ui/Pagination";
import Input from "../../../shared/components/ui/Input";
import { t } from "../../../i18n";
import {
  useGetAuditLogsQuery,
  useGetAuditLogFiltersQuery,
  useGetAuditLogRetentionQuery,
  useSetAuditLogRetentionMutation,
} from "../auditLogsApi";

const selectCls =
  "h-[38px] w-full rounded-lg border border-ink-400/25 bg-white px-3 text-[13px] text-ink-800 dark:bg-ink-900 dark:text-white";

const ACTION_AR = { Created: "إضافة", Updated: "تعديل", Deleted: "حذف" };
const ENTITY_AR = {
  Employee: "موظف", Invoice: "فاتورة", Item: "صنف", Account: "حساب", JournalEntry: "قيد يومية",
  BusinessPartner: "عميل/مورد", Cashbox: "خزنة", CashVoucher: "سند", Store: "مخزن", Driver: "سائق",
  DriverTrip: "رحلة", PayrollEntry: "حركة مرتب", EmployeeAttendance: "حضور", EmployeeMovement: "حركة موظف",
  FiscalYear: "سنة مالية", Company: "شركة", User: "مستخدم", StockAdjustment: "تسوية مخزون", StockTransfer: "تحويل مخزني",
};
const actionLabel = (a) => (ACTION_AR[a] ? t(ACTION_AR[a]) : a);
const entityLabel = (e) => (ENTITY_AR[e] ? t(ENTITY_AR[e]) : e);

const fmt = (iso) => {
  if (!iso) return "";
  const d = new Date(iso.endsWith("Z") ? iso : iso + "Z");
  return d.toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" });
};

export default function AuditLogsPage() {
  const [filters, setFilters] = useState({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [open, setOpen] = useState(null);

  const params = { ...filters, pageNumber: page, pageSize };
  Object.keys(params).forEach((k) => (params[k] === "" || params[k] == null) && delete params[k]);

  const { data, isFetching, isError } = useGetAuditLogsQuery(params);
  const { data: opts } = useGetAuditLogFiltersQuery();
  const { data: ret } = useGetAuditLogRetentionQuery();
  const [setRetention, { isLoading: saving }] = useSetAuditLogRetentionMutation();

  const set = (k) => (e) => {
    setFilters((f) => ({ ...f, [k]: e?.target ? e.target.value : e }));
    setPage(1);
  };

  const onRetention = async (e) => {
    const v = e.target.value;
    try {
      await setRetention({ retentionDays: v === "" ? null : Number(v) }).unwrap();
      toast.success(t("تم حفظ مدة الاحتفاظ"));
    } catch {
      toast.error(t("تعذر حفظ مدة الاحتفاظ"));
    }
  };

  const items = data?.items ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink-900 dark:text-white">{t("سجل العمليات")}</h1>
          <p className="text-[13px] text-ink-500 dark:text-white/60">{t("من عمل إيه ومتى، لشركتك فقط")}</p>
        </div>
        <label className="w-56 text-[12px] text-ink-500 dark:text-white/60">
          {t("مدة الاحتفاظ بالسجل")}
          <select className={`${selectCls} mt-1`} value={ret?.retentionDays ?? ""} onChange={onRetention} disabled={saving || !ret}>
            <option value="">{t("بدون حذف (الاحتفاظ دائماً)")}</option>
            {(ret?.allowedDays ?? [7, 30, 90]).map((d) => (
              <option key={d} value={d}>
                {d === 7 ? t("حذف تلقائي كل أسبوع") : d === 30 ? t("حذف تلقائي كل شهر") : d === 90 ? t("حذف تلقائي كل 3 شهور") : `${d} ${t("يوم")}`}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-1 gap-3 rounded-2xl border border-ink-400/15 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4 dark:border-white/10 dark:bg-ink-900">
        <select className={selectCls} value={filters.userId ?? ""} onChange={set("userId")}>
          <option value="">{t("كل المستخدمين")}</option>
          {(opts?.users ?? []).map((u) => <option key={u.userId} value={u.userId}>{u.userName}</option>)}
        </select>
        <select className={selectCls} value={filters.action ?? ""} onChange={set("action")}>
          <option value="">{t("كل العمليات")}</option>
          {(opts?.actions ?? []).map((a) => <option key={a} value={a}>{actionLabel(a)}</option>)}
        </select>
        <select className={selectCls} value={filters.entityType ?? ""} onChange={set("entityType")}>
          <option value="">{t("كل الأنواع")}</option>
          {(opts?.entityTypes ?? []).map((a) => <option key={a} value={a}>{entityLabel(a)}</option>)}
        </select>
        <select className={selectCls} value={filters.role ?? ""} onChange={set("role")}>
          <option value="">{t("كل الأدوار")}</option>
          {(opts?.roles ?? []).map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <Input type="date" label={t("من تاريخ")} value={filters.fromDate ?? ""} onChange={(e) => set("fromDate")(e.target.value || "")} />
        <Input type="date" label={t("إلى تاريخ")} value={filters.toDate ?? ""} onChange={(e) => set("toDate")(e.target.value || "")} />
        <div className="sm:col-span-2">
          <Input label={t("بحث")} value={filters.search ?? ""} onChange={set("search")} />
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-ink-400/15 bg-white dark:border-white/10 dark:bg-ink-900">
        <table className="cards-on-phone w-full min-w-[720px] text-[13px]">
          <thead className="bg-ink-400/5 text-ink-600 dark:text-white/70">
            <tr>
              <th className="px-3 py-2 text-start">{t("الوقت")}</th>
              <th className="px-3 py-2 text-start">{t("المستخدم")}</th>
              <th className="px-3 py-2 text-start">{t("العملية")}</th>
              <th className="px-3 py-2 text-start">{t("النوع")}</th>
              <th className="px-3 py-2 text-start">{t("الوصف")}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((r) => (
              <tr key={r.id} className="cursor-pointer border-t border-ink-400/10 hover:bg-ink-400/5" onClick={() => setOpen(open === r.id ? null : r.id)}>
                <td className="whitespace-nowrap px-3 py-2">{fmt(r.occurredOn)}</td>
                <td className="px-3 py-2">{r.userName}</td>
                <td className="px-3 py-2">{actionLabel(r.action)}</td>
                <td className="px-3 py-2">{entityLabel(r.entityType)}</td>
                <td className="px-3 py-2">
                  {r.summary}
                  {open === r.id && r.details && (
                    <pre className="mt-2 whitespace-pre-wrap rounded-lg bg-ink-400/5 p-2 text-[12px]" dir="ltr">{r.details}</pre>
                  )}
                </td>
              </tr>
            ))}
            {!items.length && (
              <tr>
                <td colSpan={5} className="px-3 py-10 text-center text-ink-500">
                  {isFetching ? t("جاري التحميل...") : isError ? t("تعذر تحميل السجل") : t("لا توجد عمليات مسجلة")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={page} pageSize={pageSize} totalCount={data?.totalCount ?? 0} onPageChange={setPage} onPageSizeChange={(s) => { setPageSize(s); setPage(1); }} />
    </div>
  );
}
