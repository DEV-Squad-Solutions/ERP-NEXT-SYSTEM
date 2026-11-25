import { Languages } from "lucide-react";
import { getLang, setLang } from "../../../i18n";

export default function LanguageSwitcher() {
  const lang = getLang();
  const next = lang === "ar" ? "en" : "ar";

  return (
    <button
      type="button"
      onClick={() => setLang(next)}
      aria-label={lang === "ar" ? "Switch to English" : "التحويل إلى العربية"}
      title={lang === "ar" ? "English" : "العربية"}
      className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-bold text-ink-600 transition hover:bg-ink-100"
    >
      <Languages size={16} />
      <span>{lang === "ar" ? "EN" : "عربي"}</span>
    </button>
  );
}
