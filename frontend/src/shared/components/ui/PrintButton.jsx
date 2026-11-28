import { Printer } from "lucide-react";

import Button from "./Button";
import { t } from "../../../i18n";

/**
 * Toolbar button that prints the current screen only (sidebar, top bar and other chrome are hidden by
 * the print stylesheet; the company / title / date / user header comes from PrintHeader).
 */
export default function PrintButton({ className = "" }) {
  return (
    <Button
      variant="outline"
      onClick={() => window.print()}
      title={t("طباعة الصفحة")}
      aria-label={t("طباعة الصفحة")}
      className={`print:hidden ${className}`}
    >
      <Printer size={16} aria-hidden="true" data-generic-print />
      {t("طباعة")}
    </Button>
  );
}
