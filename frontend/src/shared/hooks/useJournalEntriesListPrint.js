// src/features/journalEntries/hooks/useJournalEntriesListPrint.js

import { useRef } from "react";
import { useReactToPrint } from "react-to-print";

import { t } from "../../i18n";
/**
 * Hook لطباعة قائمة قيود اليومية كتقرير
 */
export function useJournalEntriesListPrint({
  title = t("تقرير قيود اليومية"),
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
