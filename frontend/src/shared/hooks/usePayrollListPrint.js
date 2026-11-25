import { useRef } from "react";
import { useReactToPrint } from "react-to-print";

import { t } from "../../i18n";
/**
 * Hook لطباعة قائمة قيود المرتبات (تقرير)
 */
export function usePayrollListPrint({ title = t("تقرير المرتبات") } = {}) {
  const printRef = useRef(null);

  const printList = useReactToPrint({
    contentRef: printRef,
    documentTitle: title,
  });

  return { printList, printRef };
}
