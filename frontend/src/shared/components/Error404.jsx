import { Home, ArrowLeft, SearchX } from "lucide-react";
import { Link } from "react-router-dom";

import StatePanel from "./ui/StatePanel";
import { t } from "../../i18n";

export default function Error404() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-6 font-body dark:bg-ink-950">
      <StatePanel
        icon={SearchX}
        code="404"
        tone="info"
        title={t("الصفحة غير موجودة")}
        description={t("يبدو أن الصفحة التي تبحث عنها قد تم نقلها أو حذفها أو أن الرابط غير صحيح.")}
      >
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-xl bg-primary-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-600"
        >
          <Home size={16} />
          {t("الصفحة الرئيسية")}
        </Link>
        <button
          type="button"
          onClick={() => window.history.back()}
          className="inline-flex items-center gap-2 rounded-xl border border-ink-400/15 px-5 py-2.5 text-sm font-medium text-ink-700 transition hover:bg-ink-400/10 dark:border-white/15 dark:text-white/80 dark:hover:bg-white/[0.07]"
        >
          <ArrowLeft size={16} />
          {t("رجوع")}
        </button>
      </StatePanel>
    </main>
  );
}
