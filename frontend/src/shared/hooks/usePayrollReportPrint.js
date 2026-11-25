import { useRef } from "react";
import { useReactToPrint } from "react-to-print";

import { t } from "../../i18n";
/**
 * Hook لطباعة تقرير الأجور والمرتبات
 */
export function usePayrollReportPrint({
  title = t("تقرير الأجور والمرتبات"),
} = {}) {
  const printRef = useRef(null);

  const printReport = useReactToPrint({
    contentRef: printRef,
    documentTitle: title,
  });

  return {
    printReport,
    printRef,
  };
}
