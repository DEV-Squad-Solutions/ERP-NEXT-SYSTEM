import { useRef } from "react";
import { useReactToPrint } from "react-to-print";

import { t } from "../../i18n";
/**
 * Hook لطباعة كشف حساب سائق
 */
export function useDriverStatementPrint({ title = t("كشف حساب سائق") } = {}) {
  const printRef = useRef(null);

  const printStatement = useReactToPrint({
    contentRef: printRef,
    documentTitle: title,
  });

  return {
    printStatement,
    printRef,
  };
}
