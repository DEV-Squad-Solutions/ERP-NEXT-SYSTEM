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
    // 297mm-wide template with its own 12mm padding: A4 landscape, no extra page margin
    pageStyle: `@page { size: A4 landscape; margin: 0; } @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }`,
  });

  return {
    printStatement,
    printRef,
  };
}
