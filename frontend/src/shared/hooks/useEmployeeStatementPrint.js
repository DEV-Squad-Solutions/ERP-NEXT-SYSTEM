import { useRef } from "react";
import { useReactToPrint } from "react-to-print";

import { t } from "../../i18n";
/**
 * Hook لطباعة كشف حساب موظف
 */
export default function useEmployeeStatementPrint({
  title = t("كشف حساب موظف"),
} = {}) {
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
