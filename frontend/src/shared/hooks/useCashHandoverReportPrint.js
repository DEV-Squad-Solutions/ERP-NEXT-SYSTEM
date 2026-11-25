import { useRef } from "react";
import { useReactToPrint } from "react-to-print";

import { t } from "../../i18n";
export function useCashHandoverReportPrint({
  title = t("تقرير تسليم العهدة"),
} = {}) {
  const printRef = useRef(null);

  const printList = useReactToPrint({
    contentRef: printRef,
    documentTitle: title,
  });

  return {
    printList,
    printRef,
  };
}

export default useCashHandoverReportPrint;
