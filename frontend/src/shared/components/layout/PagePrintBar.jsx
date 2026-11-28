import { useEffect, useState } from "react";

import PrintButton from "../ui/PrintButton";

/**
 * Print button for the current screen, shown at the top of the page content (not in the top bar).
 * Screens that already ship their own print button/template (a printer icon inside the page) keep
 * it untouched: this bar hides itself there.
 */
export default function PagePrintBar({ mainRef, pathname }) {
  const [ownPrint, setOwnPrint] = useState(true);

  useEffect(() => {
    const root = mainRef?.current;
    if (!root) return undefined;
    const check = () =>
      setOwnPrint(!!root.querySelector("svg.lucide-printer:not([data-generic-print])"));
    setOwnPrint(true);
    const timer = setTimeout(check, 400);
    const observer = new MutationObserver(() => {
      clearTimeout(timer);
      check();
    });
    observer.observe(root, { childList: true, subtree: true });
    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [mainRef, pathname]);

  if (ownPrint) return null;
  return (
    <div className="mb-3 flex justify-end print:hidden" data-page-print-bar>
      <PrintButton />
    </div>
  );
}
