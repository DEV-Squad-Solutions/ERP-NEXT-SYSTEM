import { useRef } from "react";
import { useReactToPrint } from "react-to-print";

import { t } from "../../i18n";
/**
 * Hook لطباعة تقرير لوحة الأجور والمرتبات
 */
export function usePayrollDashboardPrint({
  title = t("تقرير الأجور والمرتبات"),
} = {}) {
  const printRef = useRef(null);

  const printDashboard = useReactToPrint({
    contentRef: printRef,
    documentTitle: title,
  });

  return {
    printDashboard,
    printRef,
  };
}
