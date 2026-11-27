import { useState } from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { t } from "../../../i18n";
import { useChangePasswordMutation } from "../authApi";
import { errText } from "./PasswordPages";

const inputCls =
  "h-11 w-full rounded-xl border border-ink-200 bg-white px-4 text-left text-sm text-ink-800 outline-none transition-[border-color,box-shadow] duration-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 disabled:bg-ink-50";

export default function ChangePasswordPage() {
  const [cur, setCur] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [local, setLocal] = useState("");
  const [change, { isLoading, error }] = useChangePasswordMutation();

  const submit = async (e) => {
    e.preventDefault();
    setLocal("");
    if (pw.length < 8) return setLocal(t("كلمة المرور لازم تكون 8 أحرف على الأقل"));
    if (pw !== pw2) return setLocal(t("كلمتا المرور غير متطابقتين"));
    const res = await change({ currentPassword: cur, newPassword: pw });
    if (!res.error) {
      toast.success(t("تم تغيير كلمة المرور"));
      setCur(""); setPw(""); setPw2("");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="mx-auto w-full max-w-md p-4"
    >
      <h1 className="mb-4 font-display text-lg font-bold text-ink-800">
        {t("تغيير كلمة المرور")}
      </h1>
      <form onSubmit={submit} className="space-y-3.5 rounded-2xl border border-ink-100 bg-white p-5">
        <input type="password" dir="ltr" autoComplete="current-password" value={cur}
          onChange={(e) => setCur(e.target.value)} placeholder={t("كلمة المرور الحالية")}
          aria-label={t("كلمة المرور الحالية")} disabled={isLoading} className={inputCls} />
        <input type="password" dir="ltr" autoComplete="new-password" value={pw}
          onChange={(e) => setPw(e.target.value)} placeholder={t("كلمة مرور جديدة")}
          aria-label={t("كلمة مرور جديدة")} disabled={isLoading} className={inputCls} />
        <input type="password" dir="ltr" autoComplete="new-password" value={pw2}
          onChange={(e) => setPw2(e.target.value)} placeholder={t("تأكيد كلمة المرور")}
          aria-label={t("تأكيد كلمة المرور")} disabled={isLoading} className={inputCls} />
        {(local || error) && (
          <p role="alert" className="text-[11px] text-red-600">{local || errText(error)}</p>
        )}
        <button type="submit" disabled={isLoading || !cur || !pw || !pw2}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary-500 text-sm font-semibold text-white transition-[background-color,transform] hover:bg-primary-600 active:scale-[0.985] disabled:opacity-50">
          {isLoading ? <Loader2 size={17} className="animate-spin" /> : t("حفظ كلمة المرور")}
        </button>
      </form>
    </motion.div>
  );
}
