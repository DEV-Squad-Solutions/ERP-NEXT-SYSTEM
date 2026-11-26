import { useEffect } from "react";
import { useRouteError } from "react-router-dom";
import { RefreshCw, AlertCircle } from "lucide-react";
import StatePanel from "./ui/StatePanel";
import { isChunkError, reloadOnceForNewVersion } from "../../lib/lazyRetry";
import { t } from "../../i18n";

export default function RouteError() {
  const error = useRouteError();
  const stale = isChunkError(error);

  useEffect(() => {
    if (stale) reloadOnceForNewVersion();
  }, [stale]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper p-6 dark:bg-ink-950">
      <StatePanel
        icon={stale ? RefreshCw : AlertCircle}
        tone={stale ? "info" : "error"}
        title={stale ? t("تم تحديث الموقع") : t("حدث خطأ غير متوقع")}
        description={
          stale
            ? t("يوجد إصدار أحدث من الموقع. جاري التحديث، وإن لم يحدث ذلك اضغط على الزر.")
            : t("تعذر عرض هذه الصفحة. حاول مرة أخرى، وإن استمرت المشكلة تواصل مع الدعم.")
        }
      >
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-xl bg-primary-500 px-5 py-2 text-sm font-semibold text-white hover:bg-primary-600"
        >
          {t("تحديث الصفحة")}
        </button>
      </StatePanel>
    </div>
  );
}
