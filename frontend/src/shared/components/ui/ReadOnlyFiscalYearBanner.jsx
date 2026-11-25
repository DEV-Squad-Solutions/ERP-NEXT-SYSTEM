import { Lock } from "lucide-react";

import { t } from "../../../i18n";
/**
 * تنبيه موحّد يُعرض أعلى شاشات الحركات لما السنة المالية المختارة
 * تكون مغلقة (status = "Closed") — الشاشة بتبقى للعرض فقط.
 */
export default function ReadOnlyFiscalYearBanner({ fiscalYear }) {
  return (
    <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">
      <Lock size={16} strokeWidth={2} className="shrink-0" />
      <span>
        {t("السنة المالية \"")}{fiscalYear?.name}"{" "}
        {fiscalYear?.status === "Closed" ? t("مغلقة") : t("ليست السنة الحالية")} {t("— هذه الشاشة للعرض فقط، ولا يمكن إضافة أو تعديل أو حذف أي حركة عليها.")}
      </span>
    </div>
  );
}
