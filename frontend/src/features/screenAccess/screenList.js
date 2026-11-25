import { navigationItems } from "../../shared/constants/navigation";

const ADMIN_ONLY_PATHS = new Set(["/dashboard/permissions"]);

/** كل الشاشات اللي ليها path في القائمة الجانبية (بدون شاشات الأدمن فقط). */
export function getScreenOptions() {
  const out = [];
  const walk = (items, group) => {
    items.forEach((item) => {
      if (item.type === "section") return;
      if (item.children?.length) {
        walk(item.children, item.label);
        return;
      }
      if (item.path && !ADMIN_ONLY_PATHS.has(item.path)) {
        out.push({ path: item.path, label: item.label, group });
      }
    });
  };
  walk(navigationItems, "");
  return out;
}

const allPaths = () => {
  const paths = [];
  const walk = (items) =>
    items.forEach((item) => {
      if (item.children?.length) walk(item.children);
      if (item.path) paths.push(item.path);
    });
  walk(navigationItems);
  return paths;
};

/** هل المسار الحالي تابع لشاشة مخفية؟ (أطول مسار مطابق في القائمة). */
export function isPathHidden(pathname, hidden) {
  if (!hidden?.length) return false;
  const best = allPaths()
    .filter(
      (p) =>
        pathname === p || (p !== "/dashboard" && pathname.startsWith(`${p}/`)),
    )
    .sort((a, b) => b.length - a.length)[0];
  return Boolean(best) && hidden.includes(best);
}
