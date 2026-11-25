import { useRef } from "react";
import { useReactToPrint } from "react-to-print";

import { t } from "../../i18n";
/**
 * Hook لطباعة قائمة التدفقات النقدية
 */
export function useCashFlowPrint({ title = t("قائمة التدفقات النقدية") } = {}) {
  const printRef = useRef(null);

  const printReport = useReactToPrint({
    contentRef: printRef,
    documentTitle: title,
  });

  return { printReport, printRef };
}
