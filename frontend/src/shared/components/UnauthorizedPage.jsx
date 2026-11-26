import { ShieldX, ArrowRight, Home } from "lucide-react";
import { useNavigate } from "react-router-dom";

import StatePanel from "./ui/StatePanel";
import { t } from "../../i18n";

export default function UnauthorizedPage() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <StatePanel
        icon={ShieldX}
        code="403"
        tone="error"
        title={t("غير مصرح لك بالوصول")}
        description={t("ليس لديك الدور المطلوب للوصول إلى هذه الصفحة. إذا كنت تعتقد أن هذا غير صحيح، تواصل مع مسؤول النظام.")}
      >
        <button
          type="button"
          onClick={() => navigate("/dashboard")}
          className="inline-flex items-center gap-2 rounded-xl bg-primary-500 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-600"
        >
          <Home size={16} />
          {t("الرئيسية")}
        </button>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 rounded-xl border border-ink-400/15 px-5 py-2.5 text-sm font-medium text-ink-700 transition-colors hover:bg-ink-400/10 dark:border-white/15 dark:text-white/80 dark:hover:bg-white/[0.07]"
        >
          <ArrowRight size={16} />
          {t("رجوع")}
        </button>
      </StatePanel>
    </div>
  );
}
