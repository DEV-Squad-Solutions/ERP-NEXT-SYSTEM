import { t } from "../../../i18n";

/** Loading placeholder row for report tables: shown while fetching with no rows yet. */
export default function TableLoadingRow({ colSpan }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-3 py-8 text-center text-ink-500" role="status" aria-live="polite">
        <span className="inline-flex items-center gap-2">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-ink-400/30 border-t-primary-500" aria-hidden="true" />
          {t("جاري التحميل...")}
        </span>
      </td>
    </tr>
  );
}
