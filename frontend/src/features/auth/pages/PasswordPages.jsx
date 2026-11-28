import { useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, KeyRound, MailCheck, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { t, getDir } from "../../../i18n";
import DevSquadCard from "../../../shared/components/brand/DevSquadCard";
import {
  useForgotPasswordMutation,
  useSubmitRegistrationMutation,
  useResetPasswordMutation,
} from "../authApi";

const inputCls =
  "h-11 w-full rounded-xl border border-ink-200 bg-white px-4 text-left text-sm text-ink-800 outline-none transition-[border-color,box-shadow] duration-200 hover:border-ink-300 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 disabled:bg-ink-50";
const btnCls =
  "flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary-500 text-sm font-semibold text-white shadow-sm transition-[background-color,transform] duration-300 hover:bg-primary-600 active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-50";

export function errText(error) {
  return (
    error?.data?.detail ||
    error?.data?.title ||
    error?.data?.message ||
    t("حدث خطأ، حاول مرة أخرى")
  );
}

function Shell({ title, subtitle, children }) {
  return (
    <main
      dir={getDir()}
      className="flex min-h-[100dvh] w-full items-center justify-center bg-paper px-4 py-8 text-ink-900"
    >
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="w-full max-w-sm rounded-2xl border border-ink-100 bg-white p-6 shadow-sm"
      >
        <div className="mb-5 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary-500/10 text-primary-500">
            <KeyRound size={18} strokeWidth={1.8} />
          </div>
          <h1 className="font-display text-lg font-bold text-ink-800">{title}</h1>
          {subtitle && (
            <p className="mt-1.5 text-[11px] leading-5 text-ink-400">{subtitle}</p>
          )}
        </div>
        {children}
        <div className="mt-4 text-center">
          <Link to="/" className="text-[11px] font-medium text-primary-500 hover:text-primary-600">
            {t("الرجوع لتسجيل الدخول")}
          </Link>
        </div>
        <DevSquadCard className="mt-5" />
      </motion.div>
    </main>
  );
}

function ErrorBox({ error }) {
  if (!error) return null;
  return (
    <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-red-100 bg-red-50 px-3 py-2.5 text-[11px] leading-5 text-red-600">
      <AlertCircle size={15} className="mt-0.5 shrink-0" />
      <span>{errText(error)}</span>
    </div>
  );
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [forgot, { isLoading, error }] = useForgotPasswordMutation();

  const submit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    const res = await forgot({ email: email.trim() });
    if (!res.error) setSent(true);
  };

  return (
    <Shell
      title={t("استعادة كلمة المرور")}
      subtitle={t("أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة التعيين")}
    >
      {sent ? (
        <div className="flex items-start gap-2.5 rounded-xl bg-primary-500/10 p-3 text-[12px] leading-5 text-ink-700">
          <MailCheck size={18} className="mt-0.5 shrink-0 text-primary-500" />
          <span>
            {t("لو البريد مسجل عندنا هتوصلك رسالة فيها رابط إعادة التعيين خلال دقائق. راجع الـ Spam كمان.")}
          </span>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-3.5">
          <div>
            <label htmlFor="fp-email" className="mb-1.5 block text-[11px] font-semibold text-ink-600">
              {t("البريد الإلكتروني")}
            </label>
            <input
              id="fp-email"
              type="email"
              dir="ltr"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              className={inputCls}
            />
          </div>
          <ErrorBox error={error} />
          <button type="submit" disabled={isLoading || !email.trim()} className={btnCls}>
            {isLoading ? (
              <>
                <Loader2 size={17} className="animate-spin" />
                {t("جاري الإرسال...")}
              </>
            ) : (
              t("إرسال الرابط")
            )}
          </button>
        </form>
      )}
    </Shell>
  );
}

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const email = params.get("email") || "";
  const token = params.get("token") || "";
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [reset, { isLoading, error }] = useResetPasswordMutation();
  const [local, setLocal] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setLocal("");
    if (pw.length < 8) return setLocal(t("كلمة المرور لازم تكون 8 أحرف على الأقل"));
    if (pw !== pw2) return setLocal(t("كلمتا المرور غير متطابقتين"));
    const res = await reset({ email, token, newPassword: pw });
    if (!res.error) {
      toast.success(t("تم تغيير كلمة المرور. سجّل الدخول بالجديدة."));
      navigate("/", { replace: true });
    }
  };

  if (!email || !token) {
    return (
      <Shell title={t("كلمة مرور جديدة")}>
        <p className="text-center text-[12px] text-red-600">
          {t("الرابط غير صالح أو منتهي. اطلب رابطاً جديداً.")}
        </p>
        <div className="mt-3 text-center">
          <Link to="/forgot-password" className="text-[11px] font-medium text-primary-500">
            {t("نسيت كلمة المرور؟")}
          </Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell title={t("كلمة مرور جديدة")} subtitle={t("اختر كلمة مرور جديدة لحسابك")}>
      <form onSubmit={submit} className="space-y-3.5">
        <input type="password" dir="ltr" autoComplete="new-password" value={pw}
          onChange={(e) => setPw(e.target.value)} placeholder={t("كلمة مرور جديدة")}
          aria-label={t("كلمة مرور جديدة")} disabled={isLoading} className={inputCls} />
        <input type="password" dir="ltr" autoComplete="new-password" value={pw2}
          onChange={(e) => setPw2(e.target.value)} placeholder={t("تأكيد كلمة المرور")}
          aria-label={t("تأكيد كلمة المرور")} disabled={isLoading} className={inputCls} />
        {local && <p role="alert" className="text-[11px] text-red-600">{local}</p>}
        <ErrorBox error={error} />
        <button type="submit" disabled={isLoading || !pw || !pw2} className={btnCls}>
          {isLoading ? <Loader2 size={17} className="animate-spin" /> : t("حفظ كلمة المرور")}
        </button>
      </form>
    </Shell>
  );
}

export function RegisterRequestPage() {
  const [f, setF] = useState({ firstName: "", lastName: "", userName: "", email: "", phoneNumber: "", password: "", note: "" });
  const [pw2, setPw2] = useState("");
  const [local, setLocal] = useState("");
  const [done, setDone] = useState(false);
  const [submit, { isLoading, error }] = useSubmitRegistrationMutation();
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setLocal("");
    if (f.password.length < 8) return setLocal(t("كلمة المرور لازم تكون 8 أحرف على الأقل"));
    if (f.password !== pw2) return setLocal(t("كلمتا المرور غير متطابقتين"));
    const res = await submit({ ...f, phoneNumber: f.phoneNumber || null, note: f.note || null });
    if (!res.error) setDone(true);
  };

  return (
    <Shell title={t("طلب حساب جديد")} subtitle={t("سيراجع المسؤول طلبك ويحدد الشركة والصلاحية قبل تفعيل الحساب")}>
      {done ? (
        <div className="flex items-start gap-2.5 rounded-xl bg-primary-500/10 p-3 text-[12px] leading-5 text-ink-700">
          <MailCheck size={18} className="mt-0.5 shrink-0 text-primary-500" />
          <span>{t("تم إرسال الطلب. هيتواصل معاك المسؤول بعد المراجعة.")}</span>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <input className={inputCls} placeholder={t("الاسم الأول")} aria-label={t("الاسم الأول")} value={f.firstName} onChange={set("firstName")} disabled={isLoading} />
            <input className={inputCls} placeholder={t("الاسم الأخير")} aria-label={t("الاسم الأخير")} value={f.lastName} onChange={set("lastName")} disabled={isLoading} />
          </div>
          <input className={inputCls} dir="ltr" autoComplete="username" placeholder={t("اسم المستخدم")} aria-label={t("اسم المستخدم")} value={f.userName} onChange={set("userName")} disabled={isLoading} />
          <input className={inputCls} dir="ltr" type="email" autoComplete="email" placeholder={t("البريد الإلكتروني")} aria-label={t("البريد الإلكتروني")} value={f.email} onChange={set("email")} disabled={isLoading} />
          <input className={inputCls} dir="ltr" type="tel" placeholder={t("رقم الهاتف (اختياري)")} aria-label={t("رقم الهاتف (اختياري)")} value={f.phoneNumber} onChange={set("phoneNumber")} disabled={isLoading} />
          <input className={inputCls} dir="ltr" type="password" autoComplete="new-password" placeholder={t("كلمة مرور جديدة")} aria-label={t("كلمة مرور جديدة")} value={f.password} onChange={set("password")} disabled={isLoading} />
          <input className={inputCls} dir="ltr" type="password" autoComplete="new-password" placeholder={t("تأكيد كلمة المرور")} aria-label={t("تأكيد كلمة المرور")} value={pw2} onChange={(e) => setPw2(e.target.value)} disabled={isLoading} />
          <input className={inputCls} placeholder={t("ملاحظة للمسؤول (اختياري)")} aria-label={t("ملاحظة للمسؤول (اختياري)")} value={f.note} onChange={set("note")} maxLength={500} disabled={isLoading} />
          {local && <p role="alert" className="text-[11px] text-red-600">{local}</p>}
          <ErrorBox error={error} />
          <button type="submit" disabled={isLoading || !f.firstName || !f.lastName || !f.userName || !f.email || !f.password} className={btnCls}>
            {isLoading ? <Loader2 size={17} className="animate-spin" /> : t("إرسال الطلب")}
          </button>
        </form>
      )}
    </Shell>
  );
}
