import { useRef } from "react";
import { useReactToPrint } from "react-to-print";

import { t } from "../../i18n";
/**
 * Hook لطباعة قائمة فواتير (تقرير) - مختلف عن طباعة فاتورة واحدة
 */
export function useInvoiceListPrint({ title = t("تقرير الفواتير") } = {}) {
  const printRef = useRef(null);

  const printList = useReactToPrint({
    contentRef: printRef,
    documentTitle: title,
    // the template is 297mm wide with its own padding: print it on A4 landscape, no extra page margin
    pageStyle: `@page { size: A4 landscape; margin: 0; } @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }`,
  });

  return { printList, printRef };
}
