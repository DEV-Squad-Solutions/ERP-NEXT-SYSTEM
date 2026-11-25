import { useRef } from "react";
import { useReactToPrint } from "react-to-print";

import { t } from "../../i18n";
/**
 * Hook لطباعة قائمة المركز المالي
 */
export function useFinancialPositionPrint({
  title = t("قائمة المركز المالي"),
} = {}) {
  const printRef = useRef(null);

  const printReport = useReactToPrint({
    contentRef: printRef,
    documentTitle: title,
  });

  return { printReport, printRef };
}
