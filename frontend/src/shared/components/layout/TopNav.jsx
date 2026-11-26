import { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { ChevronDown, PanelLeft } from "lucide-react";

import { navigationItems } from "../../constants/navigation";
import useHiddenScreens from "../../../features/screenAccess/useHiddenScreens";
import { filterNavigationItems, removeEmptySections } from "./Sidebar";
import { t } from "../../../i18n";

function isActive(item, pathname) {
  if (item.path && (pathname === item.path || pathname.startsWith(item.path + "/")))
    return item.path !== "/dashboard" || pathname === "/dashboard";
  return (item.children || []).some((c) => isActive(c, pathname));
}

function Leaf({ item, onPick }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.path}
      end={item.end}
      onClick={onPick}
      className={({ isActive: a }) =>
        `flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] transition-colors ${
          a
            ? "bg-primary-500/10 font-semibold text-primary-600 dark:text-primary-300"
            : "text-ink-600 hover:bg-ink-400/10 hover:text-ink-900 dark:text-white/75 dark:hover:bg-white/[0.07] dark:hover:text-white"
        }`
      }
    >
      {Icon && <Icon size={15} strokeWidth={1.8} className="shrink-0 opacity-80" />}
      <span className="truncate">{item.label}</span>
    </NavLink>
  );
}

function Panel({ item, onPick }) {
  const groups = [];
  const loose = [];
  item.children.forEach((c) => {
    if (c.children?.length) groups.push({ title: c.label, leaves: c.children });
    else loose.push(c);
  });
  const colCount = Math.max(1, Math.min(groups.length || 1, 3));
  return (
    <div
      className="absolute top-full z-50 mt-1.5 start-0 max-h-[70vh] overflow-y-auto rounded-2xl border border-ink-400/15 bg-white p-2 shadow-xl ring-1 ring-black/[0.03] dark:border-white/10 dark:bg-ink-900 dark:ring-white/[0.04]"
      style={{ width: colCount * 232 + 16 }}
    >
      {loose.length > 0 && (
        <div className={`grid gap-x-2 p-1 ${groups.length ? "mb-1 border-b border-ink-400/10 pb-2 dark:border-white/[0.07]" : ""}`} style={{ gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))` }}>
          {loose.map((l) => (
            <Leaf key={l.path} item={l} onPick={onPick} />
          ))}
        </div>
      )}
      {groups.length > 0 && (
        <div className="grid items-start gap-x-2" style={{ gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))` }}>
          {groups.map((g) => (
            <div key={g.title} className="p-1">
              <p className="px-3 pb-1.5 pt-1 text-[11px] font-bold tracking-wide text-primary-500">{g.title}</p>
              {g.leaves.map((l) => (
                <Leaf key={l.path} item={l} onPick={onPick} />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function TopNav({ onSwitchLayout }) {
  const roles = useSelector((s) => s.auth.roles);
  const hidden = useHiddenScreens();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(null);
  const ref = useRef(null);
  const closeTimer = useRef(null);
  const cancelClose = () => closeTimer.current && clearTimeout(closeTimer.current);
  const scheduleClose = () => { cancelClose(); closeTimer.current = setTimeout(() => setOpen(null), 220); };

  const items = useMemo(() => {
    const flat = removeEmptySections(filterNavigationItems(navigationItems, roles, hidden));
    const out = [];
    let cur = null;
    flat.forEach((it) => {
      if (it.type === "section") {
        cur = { label: it.label, icon: null, children: [], isSection: true };
        out.push(cur);
      } else if (cur) {
        cur.children.push(it);
      } else {
        out.push(it);
      }
    });
    return out;
  }, [roles, hidden]);

  useEffect(() => setOpen(null), [pathname]);
  useEffect(() => {
    const down = (e) => ref.current && !ref.current.contains(e.target) && setOpen(null);
    const key = (e) => e.key === "Escape" && setOpen(null);
    document.addEventListener("mousedown", down);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("mousedown", down);
      document.removeEventListener("keydown", key);
    };
  }, []);

  return (
    <nav
      ref={ref}
      onMouseEnter={cancelClose}
      onMouseLeave={scheduleClose}
      aria-label={t("التنقل الرئيسي")}
      className="relative z-30 hidden items-center gap-1 border-b border-ink-400/10 bg-white px-4 py-1.5 dark:border-white/[0.07] dark:bg-ink-900 lg:flex"
    >
      <div className="flex min-w-0 flex-1 items-center gap-1">
        {items.map((item) => {
          const Icon = item.icon;
          const active = isActive(item, pathname);
          const cls = `flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors ${
            active
              ? "bg-primary-500/10 text-primary-600 dark:text-primary-300"
              : "text-ink-600 hover:bg-ink-400/10 hover:text-ink-900 dark:text-white/75 dark:hover:bg-white/[0.07] dark:hover:text-white"
          }`;
          if (!item.children?.length) {
            return (
              <NavLink key={item.path} to={item.path} end={item.end ?? item.path === "/dashboard"} className={cls}>
                {Icon && <Icon size={15} strokeWidth={1.8} />}
                {item.label}
              </NavLink>
            );
          }
          const isOpen = open === item.label;
          return (
            <div key={item.label} className="relative">
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setOpen(isOpen ? null : item.label)}
                onMouseEnter={() => open && setOpen(item.label)}
                className={cls}
              >
                {Icon && <Icon size={15} strokeWidth={1.8} />}
                {item.label}
                <ChevronDown size={13} className={`transition-transform ${isOpen ? "rotate-180" : ""}`} />
              </button>
              {isOpen && <Panel item={item} onPick={() => setOpen(null)} />}
            </div>
          );
        })}
      </div>
      {onSwitchLayout && (
        <button
          type="button"
          onClick={onSwitchLayout}
          title={t("نقل القائمة إلى الجانب")}
          aria-label={t("نقل القائمة إلى الجانب")}
          className="flex items-center gap-1.5 rounded-lg px-2 py-2 text-[12px] font-medium text-ink-500 hover:bg-ink-400/10 dark:text-white/70 dark:hover:bg-white/[0.07]"
        >
          <PanelLeft size={16} /><span className="hidden xl:inline">{t("جانبي")}</span>
        </button>
      )}
    </nav>
  );
}
