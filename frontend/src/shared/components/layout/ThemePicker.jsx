import { useEffect, useRef, useState } from "react";
import { Moon, Palette, Sun } from "lucide-react";
import { useSelector } from "react-redux";
import { selectIsAdmin } from "../../../features/auth/authSlice";
import {
  useGetThemeQuery,
  useSetCompanyThemeMutation,
  useSetMyThemeMutation,
} from "../../../features/theme/themeApi";

import {
  COLOR_THEMES,
  applyColorTheme,
  applyMode,
  getColorTheme,
  getMode,
} from "../../theme/theme";

export default function ThemePicker() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState(getMode);
  const [color, setColor] = useState(getColorTheme);
  const ref = useRef(null);
  const isAdmin = useSelector(selectIsAdmin);
  const { data: server } = useGetThemeQuery();
  const [setMyTheme] = useSetMyThemeMutation();
  const [setCompanyTheme, { isLoading: savingCompany }] =
    useSetCompanyThemeMutation();

  // Server wins: user's own choice, else the company default.
  useEffect(() => {
    if (!server) return;
    const nextMode = server.effectiveMode === "dark" ? "dark" : "light";
    const nextColor = COLOR_THEMES.some((t) => t.id === server.effectiveColorTheme)
      ? server.effectiveColorTheme
      : "default";
    applyMode(nextMode);
    applyColorTheme(nextColor);
    setMode(nextMode);
    setColor(nextColor);
  }, [server]);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const chooseMode = (next) => {
    applyMode(next);
    setMode(next);
    setMyTheme({ colorTheme: color, mode: next });
  };

  const chooseColor = (id) => {
    applyColorTheme(id);
    setColor(id);
    setMyTheme({ colorTheme: id, mode });
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-ink-100 text-ink-400 transition hover:bg-primary-50 hover:text-primary-500 dark:border-white/10 dark:text-slate-300"
        aria-label="المظهر"
        aria-expanded={open}
      >
        <Palette size={18} />
      </button>

      {open && (
        <div className="absolute end-0 z-50 mt-2 w-56 rounded-xl border border-ink-100 bg-white p-3 shadow-xl dark:border-white/10 dark:bg-dark-800">
          <div className="mb-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => chooseMode("light")}
              className={`flex items-center justify-center gap-1.5 rounded-lg border px-2 py-1.5 text-sm ${
                mode === "light"
                  ? "border-primary-500 bg-primary-50 text-primary-500"
                  : "border-ink-100 text-ink-400 dark:border-white/10 dark:text-slate-300"
              }`}
            >
              <Sun size={14} /> فاتح
            </button>
            <button
              type="button"
              onClick={() => chooseMode("dark")}
              className={`flex items-center justify-center gap-1.5 rounded-lg border px-2 py-1.5 text-sm ${
                mode === "dark"
                  ? "border-primary-500 bg-primary-50 text-primary-500 dark:bg-white/10 dark:text-white"
                  : "border-ink-100 text-ink-400 dark:border-white/10 dark:text-slate-300"
              }`}
            >
              <Moon size={14} /> داكن
            </button>
          </div>

          <ul className="space-y-1">
            {COLOR_THEMES.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => chooseColor(t.id)}
                  className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition hover:bg-ink-50 dark:hover:bg-white/5 ${
                    color === t.id
                      ? "font-bold text-primary-500 dark:text-white"
                      : "text-ink-400 dark:text-slate-300"
                  }`}
                >
                  <span
                    className="h-4 w-4 rounded-full ring-2 ring-white dark:ring-dark-800"
                    style={{ backgroundColor: t.swatch }}
                  />
                  {t.label}
                  {color === t.id && <span className="ms-auto">✓</span>}
                </button>
              </li>
            ))}
          </ul>

          <div className="mt-3 space-y-1.5 border-t border-ink-100 pt-3 text-xs dark:border-white/10">
            {server?.userColorTheme || server?.userMode ? (
              <button
                type="button"
                onClick={() => setMyTheme({ colorTheme: null, mode: null })}
                className="w-full rounded-lg border border-ink-100 px-2 py-1.5 text-ink-500 hover:bg-ink-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
              >
                استخدام افتراضي الشركة
              </button>
            ) : (
              <p className="text-ink-400 dark:text-slate-400">
                بتستخدم الافتراضي اللي حدده الأدمن للشركة.
              </p>
            )}
            {isAdmin && (
              <button
                type="button"
                disabled={savingCompany}
                onClick={() => setCompanyTheme({ colorTheme: color, mode })}
                className="w-full rounded-lg bg-primary-500 px-2 py-1.5 font-semibold text-white disabled:opacity-60"
              >
                {savingCompany ? "جارٍ الحفظ..." : "تعيين كافتراضي للشركة"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
