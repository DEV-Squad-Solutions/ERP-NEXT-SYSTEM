import StockAdjustmentForm from "../components/StockAdjustmentForm";

import { t } from "../../../i18n";
import { getDir } from "../../../i18n";
export default function StockAdjustmentCreatePage() {
  return (
    <div className="p-6 max-w-5xl mx-auto" dir={getDir()}>
      <h1 className="font-display text-xl font-bold text-ink-900 mb-6">
        {t("تسوية مخزون جديدة")}
      </h1>
      <StockAdjustmentForm isEditMode={false} />
    </div>
  );
}
