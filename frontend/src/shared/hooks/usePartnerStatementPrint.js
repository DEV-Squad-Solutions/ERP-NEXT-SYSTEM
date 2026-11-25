import { useRef } from "react";
import { useReactToPrint } from "react-to-print";

import { t } from "../../i18n";
/**
 * Hook لطباعة كشف حساب عميل / مورد
 */
export function usePartnerStatementPrint({ title = t("كشف حساب") } = {}) {
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

export default usePartnerStatementPrint;
