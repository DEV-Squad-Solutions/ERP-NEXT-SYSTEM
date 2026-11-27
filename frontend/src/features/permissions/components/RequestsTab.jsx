import { useState } from "react";
import { toast } from "sonner";
import { t } from "../../../i18n";
import {
  useGetRegistrationRequestsQuery,
  useApproveRegistrationMutation,
  useRejectRegistrationMutation,
} from "../../auth/authApi";
import { useGetCompaniesForSelectQuery } from "../companiesApi";

function Row({ r, companies }) {
  const [role, setRole] = useState("User");
  const [ids, setIds] = useState([]);
  const [approve, { isLoading: a }] = useApproveRegistrationMutation();
  const [reject, { isLoading: j }] = useRejectRegistrationMutation();
  const busy = a || j;

  const toggle = (id) =>
    setIds((x) => (x.includes(id) ? x.filter((v) => v !== id) : [...x, id]));

  const doApprove = async () => {
    if (ids.length === 0) return toast.error(t("اختر شركة واحدة على الأقل"));
    const res = await approve({ id: r.id, role, companyIds: ids });
    if (res.error) toast.error(res.error?.data?.detail || res.error?.data?.title || "Error");
    else toast.success(t("تمت الموافقة على الحساب"));
  };
  const doReject = async () => {
    const res = await reject({ id: r.id, reason: null });
    if (res.error) toast.error(res.error?.data?.detail || "Error");
    else toast.success(t("تم رفض الطلب"));
  };

  return (
    <li className="rounded-xl border border-ink-100 bg-white p-4 dark:border-ink-700 dark:bg-ink-900">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="font-semibold text-ink-800">{r.firstName} {r.lastName}</p>
          <p dir="ltr" className="text-xs text-ink-500">{r.userName} · {r.email}{r.phoneNumber ? ` · ${r.phoneNumber}` : ""}</p>
        </div>
        <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[11px] text-ink-600">
          {r.status === "Pending" ? t("معلّق") : r.status === "Approved" ? t("مقبول") : t("مرفوض")}
        </span>
      </div>
      {r.note && <p className="mt-2 text-sm text-ink-600">{r.note}</p>}
      {r.status === "Pending" && (
        <div className="mt-3 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-ink-500">{t("الصلاحية")}</span>
            {["User", "Admin"].map((v) => (
              <button key={v} type="button" onClick={() => setRole(v)}
                className={`rounded-lg border px-3 py-1 text-xs transition-colors ${role === v ? "border-primary-500 bg-primary-500/10 text-primary-600" : "border-ink-200 text-ink-600"}`}>
                {v === "Admin" ? t("مسؤول") : t("مستخدم")}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-ink-500">{t("الشركات")}</span>
            {companies.map((c) => (
              <button key={c.id} type="button" onClick={() => toggle(c.id)}
                className={`rounded-lg border px-3 py-1 text-xs transition-colors ${ids.includes(c.id) ? "border-primary-500 bg-primary-500/10 text-primary-600" : "border-ink-200 text-ink-600"}`}>
                {c.name}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button type="button" disabled={busy} onClick={doApprove}
              className="rounded-lg bg-primary-500 px-4 py-1.5 text-xs font-semibold text-white transition-transform hover:bg-primary-600 active:scale-95 disabled:opacity-50">
              {t("موافقة")}
            </button>
            <button type="button" disabled={busy} onClick={doReject}
              className="rounded-lg border border-red-200 px-4 py-1.5 text-xs font-semibold text-red-600 transition-transform hover:bg-red-50 active:scale-95 disabled:opacity-50">
              {t("رفض")}
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

export default function RequestsTab() {
  const { data, isLoading } = useGetRegistrationRequestsQuery("Pending");
  const { data: companies = [] } = useGetCompaniesForSelectQuery();
  const list = Array.isArray(data) ? data : [];

  if (isLoading) return <p className="text-sm text-ink-400">...</p>;
  if (list.length === 0) return <p className="text-sm text-ink-400">{t("لا توجد طلبات")}</p>;
  return (
    <ul className="space-y-3">
      {list.map((r) => <Row key={r.id} r={r} companies={companies} />)}
    </ul>
  );
}
