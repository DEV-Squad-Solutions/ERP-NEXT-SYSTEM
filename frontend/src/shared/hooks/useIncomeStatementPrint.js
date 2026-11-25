import { useRef } from "react";
import { useReactToPrint } from "react-to-print";

import { t } from "../../i18n";
/**
 * Hook لطباعة قائمة الدخل
 */
export function useIncomeStatementPrint({ title = t("قائمة الدخل") } = {}) {
  const printRef = useRef(null);

  const printReport = useReactToPrint({
    contentRef: printRef,
    documentTitle: title,
  });

  return { printReport, printRef };
}
