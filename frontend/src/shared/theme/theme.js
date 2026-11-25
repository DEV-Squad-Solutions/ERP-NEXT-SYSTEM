import { t } from "../../i18n";
export const COLOR_THEMES = [
  { id: "default", label: t("الأزرق المؤسسي"), swatch: "#1E4E8C" },
  { id: "ocean", label: t("التركواز"), swatch: "#0F766E" },
  { id: "royal", label: t("النيلي"), swatch: "#4338CA" },
  { id: "sunset", label: t("الزمردي"), swatch: "#047857" },
  { id: "rose", label: t("العنابي"), swatch: "#9F1239" },
  { id: "graphite", label: t("الرمادي الفحمي"), swatch: "#334155" },
];

const MODE_KEY = "theme";
const COLOR_KEY = "colorTheme";

export function getMode() {
  return localStorage.getItem(MODE_KEY) === "dark" ? "dark" : "light";
}

export function getColorTheme() {
  const saved = localStorage.getItem(COLOR_KEY);
  return COLOR_THEMES.some((t) => t.id === saved) ? saved : "default";
}

export function applyMode(mode) {
  document.documentElement.classList.toggle("dark", mode === "dark");
  localStorage.setItem(MODE_KEY, mode);
}

export function applyColorTheme(id) {
  if (id === "default") document.documentElement.removeAttribute("data-theme");
  else document.documentElement.setAttribute("data-theme", id);
  localStorage.setItem(COLOR_KEY, id);
}

export function initTheme() {
  applyMode(getMode());
  applyColorTheme(getColorTheme());
}
