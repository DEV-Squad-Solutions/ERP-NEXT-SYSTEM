import { useRef } from "react";
import { useReactToPrint } from "react-to-print";

import { t } from "../../i18n";
/**
 * Hook لطباعة إيصال مرتب موظف واحد
 */
export function usePayrollDetailPrint({ title = t("إيصال-مرتب") } = {}) {
  const printRef = useRef(null);

  const print = useReactToPrint({
    contentRef: printRef,
    documentTitle: title,
  });

  return { print, printRef };
}
