import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { baseApi } from "../../../lib/baseApi";
import { useLoginMutation } from "../../auth/authApi";
import {
  useCreateCompanyMutation,
  useGetCompaniesForSelectQuery,
} from "../../permissions/companiesApi";
import { useCreateUserMutation } from "../../permissions/usersApi";
import {
  useGetSetupStatusQuery,
  useInitializeSetupMutation,
} from "../setupApi";

import { t } from "../../../i18n";
import { getDir } from "../../../i18n";
const ALL_ROLES = ["Admin", "User", "Accountant", "Cashier"];

const emptyAdmin = {
  userName: "",
  email: "",
  firstName: "",
  lastName: "",
  phoneNumber: "",
  password: "",
};

const emptyCompany = {
  name: "",
  address: "",
  commercialRegister: "",
  taxNumber: "",
  managerName: "",
};

const errorText = (error) => {
  const data = error?.data;
  if (data?.errors && typeof data.errors === "object") {
    const first = Object.values(data.errors).flat()[0];
    if (first) return String(first);
  }
  return (
    data?.detail ||
    data?.message ||
    data?.title ||
    t("تعذر تنفيذ العملية، راجع البيانات وحاول مرة أخرى.")
  );
};

function Field({ label, value, onChange, type = "text", dir, optional }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-semibold text-ink-600">
        {label}
        {optional ? t(" (اختياري)") : ""}
      </span>
      <input
        type={type}
        value={value}
        dir={dir}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-xl border border-ink-200 bg-white px-3 text-sm outline-none focus:border-primary-500"
      />
    </label>
  );
}

function AdminFields({ admin, setAdmin }) {
  const set = (key) => (value) => setAdmin((prev) => ({ ...prev, [key]: value }));
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label={t("الاسم الأول")} value={admin.firstName} onChange={set("firstName")} />
      <Field label={t("الاسم الأخير")} value={admin.lastName} onChange={set("lastName")} />
      <Field label={t("اسم المستخدم")} value={admin.userName} onChange={set("userName")} dir="ltr" />
      <Field label={t("البريد الإلكتروني")} type="email" value={admin.email} onChange={set("email")} dir="ltr" />
      <Field label={t("الهاتف")} value={admin.phoneNumber} onChange={set("phoneNumber")} dir="ltr" optional />
      <Field label={t("كلمة المرور (8 أحرف على الأقل)")} type="password" value={admin.password} onChange={set("password")} dir="ltr" />
    </div>
  );
}

function CompanyFields({ company, setCompany }) {
  const set = (key) => (value) => setCompany((prev) => ({ ...prev, [key]: value }));
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label={t("اسم الشركة")} value={company.name} onChange={set("name")} />
      <Field label={t("اسم المدير")} value={company.managerName} onChange={set("managerName")} />
      <Field label={t("السجل التجاري")} value={company.commercialRegister} onChange={set("commercialRegister")} />
      <Field label={t("الرقم الضريبي")} value={company.taxNumber} onChange={set("taxNumber")} />
      <div className="sm:col-span-2">
        <Field label={t("العنوان")} value={company.address} onChange={set("address")} />
      </div>
    </div>
  );
}

const Card = ({ title, children }) => (
  <section className="rounded-2xl border border-ink-200/70 bg-white p-5 shadow-card">
    <h2 className="mb-4 font-display text-base font-bold text-ink-900">{title}</h2>
    {children}
  </section>
);

const Button = ({ loading, children, ...props }) => (
  <button
    type="submit"
    disabled={loading}
    className="mt-4 h-11 rounded-xl bg-primary-500 px-6 text-sm font-semibold text-white disabled:opacity-60"
    {...props}
  >
    {loading ? t("جارٍ الحفظ...") : children}
  </button>
);

/** First-run: creates the first admin + first company in one request, then signs in. */
function FirstRunSetup() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { data: status } = useGetSetupStatusQuery();
  const [initialize, { isLoading }] = useInitializeSetupMutation();
  const [login, { isLoading: loggingIn }] = useLoginMutation();
  const [admin, setAdmin] = useState(emptyAdmin);
  const [company, setCompany] = useState(emptyCompany);
  const [setupToken, setSetupToken] = useState("");
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await initialize({
        admin: { ...admin, phoneNumber: admin.phoneNumber || null },
        company,
        setupToken: setupToken || null,
      }).unwrap();
    } catch (err) {
      setError(errorText(err));
      return;
    }
    toast.success(t("تم إنشاء الأدمن والشركة"));
    dispatch(baseApi.util.resetApiState());
    await login({ userName: admin.userName.trim(), password: admin.password });
    navigate("/", { replace: true });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Card title={t("1) بيانات الأدمن")}>
        <AdminFields admin={admin} setAdmin={setAdmin} />
      </Card>
      <Card title={t("2) بيانات أول شركة")}>
        <CompanyFields company={company} setCompany={setCompany} />
      </Card>
      {status?.tokenRequired && (
        <Card title={t("رمز الإعداد")}>
          <Field label="Setup token" value={setupToken} onChange={setSetupToken} type="password" dir="ltr" />
        </Card>
      )}
      {error && <p className="text-sm error-text">{error}</p>}
      <Button loading={isLoading || loggingIn}>{t("إنشاء وبدء الاستخدام")}</Button>
    </form>
  );
}

/** Admin mode: add more companies and more admins from inside the app. */
function AdminSetup() {
  const [createCompany, { isLoading: addingCompany }] = useCreateCompanyMutation();
  const [createUser, { isLoading: addingUser }] = useCreateUserMutation();
  const { data: companies } = useGetCompaniesForSelectQuery();
  const [company, setCompany] = useState(emptyCompany);
  const [admin, setAdmin] = useState(emptyAdmin);
  const [error, setError] = useState("");

  const submitCompany = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await createCompany(company).unwrap();
      toast.success(t("تمت إضافة الشركة"));
      setCompany(emptyCompany);
    } catch (err) {
      setError(errorText(err));
    }
  };

  const submitAdmin = async (e) => {
    e.preventDefault();
    setError("");
    const companyIds = (Array.isArray(companies) ? companies : [])
      .map((c) => c.id ?? c.value)
      .filter(Boolean);
    try {
      await createUser({
        ...admin,
        phoneNumber: admin.phoneNumber || null,
        roles: ALL_ROLES,
        companyIds,
      }).unwrap();
      toast.success(t("تمت إضافة الأدمن"));
      setAdmin(emptyAdmin);
    } catch (err) {
      setError(errorText(err));
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={submitCompany}>
        <Card title={t("إضافة شركة")}>
          <CompanyFields company={company} setCompany={setCompany} />
          <Button loading={addingCompany}>{t("إضافة الشركة")}</Button>
        </Card>
      </form>
      <form onSubmit={submitAdmin}>
        <Card title={t("إضافة أدمن (يُربط بكل الشركات الحالية)")}>
          <AdminFields admin={admin} setAdmin={setAdmin} />
          <Button loading={addingUser}>{t("إضافة الأدمن")}</Button>
        </Card>
      </form>
      {error && <p className="text-sm error-text">{error}</p>}
    </div>
  );
}

export default function SetupPage({ mode = "first-run" }) {
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  const { data: status, isLoading, isError } = useGetSetupStatusQuery(undefined, {
    skip: mode !== "first-run",
  });

  if (mode === "admin") {
    return (
      <div dir={getDir()} className="mx-auto max-w-3xl p-4">
        <h1 className="mb-4 font-display text-xl font-bold">{t("إعداد النظام: الأدمن والشركات")}</h1>
        <AdminSetup />
      </div>
    );
  }

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  if (!isLoading && status && !status.requiresSetup) {
    return <Navigate to="/" replace />;
  }

  return (
    <main dir={getDir()} className="min-h-[100dvh] bg-paper px-4 py-8 text-ink-900">
      <div className="mx-auto max-w-3xl">
        <h1 className="font-display text-2xl font-bold text-primary-500">
          {t("إعداد النظام لأول مرة")}
        </h1>
        <p className="mb-6 mt-1 text-xs text-ink-400">
          {t("أضف الأدمن وأول شركة. بعد كده تقدر تضيف باقي الأدمن والشركات من قسم الإدارة داخل النظام.")}
        </p>
        {isLoading && <p className="text-sm">{t("جارٍ التحميل...")}</p>}
        {isError && (
          <p className="text-sm error-text">
            {t("تعذر الاتصال بالسيرفر.")} <Link to="/">{t("رجوع")}</Link>
          </p>
        )}
        {status?.requiresSetup && <FirstRunSetup />}
      </div>
    </main>
  );
}
