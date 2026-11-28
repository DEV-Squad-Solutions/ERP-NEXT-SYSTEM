import test from "node:test";
import assert from "node:assert/strict";

globalThis.localStorage ??= { getItem: () => null, setItem() {}, removeItem() {} };
globalThis.document ??= { documentElement: { lang: "", dir: "" } };
globalThis.window ??= globalThis;
globalThis.navigator ??= { language: "ar" };

import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// The navigation modules import the i18n folder, which plain Node cannot resolve,
// so bundle them first with the project's own bundler.
const here = dirname(fileURLToPath(import.meta.url));
const out = join(mkdtempSync(join(tmpdir(), "nav-")), "nav.mjs");
execFileSync("npx", ["rolldown", join(here, "navigationEntry.js"), "-o", out, "-f", "esm", "--platform", "node"], {
  cwd: join(here, "../../.."),
  stdio: "pipe",
});
const { navigationItems, filterNavigationItems, removeEmptySections } = await import(pathToFileURL(out).href);

const paths = (roles) => {
  const out = [];
  const walk = (items) => items.forEach((i) => { if (i.path) out.push(i.path); if (i.children) walk(i.children); });
  walk(removeEmptySections(filterNavigationItems(navigationItems, roles, [])));
  return out;
};

test("Admin sees every screen the Accountant sees, and more or equal", () => {
  const a = paths(["Admin"]);
  for (const p of paths(["Accountant"])) assert.ok(a.includes(p), p);
});

test("Cashier and User get no finance, treasury or payroll screens", () => {
  for (const role of ["Cashier", "User"]) {
    const p = paths([role]);
    for (const banned of ["/dashboard/treasury", "/dashboard/payroll", "/dashboard/journal", "/dashboard/accounts"]) {
      assert.ok(!p.some((x) => x.startsWith(banned)), `${role} must not see ${banned}`);
    }
  }
});

test("Cashier keeps the sales screens", () => {
  const p = paths(["Cashier"]);
  assert.ok(p.some((x) => x.includes("sales") || x.includes("invoices")), p.join(","));
});

test("sanity: the banned prefixes exist for Accountant, so the checks above are not empty", () => {
  const p = paths(["Accountant"]);
  for (const prefix of ["/dashboard/treasury", "/dashboard/payroll"]) {
    assert.ok(p.some((x) => x.startsWith(prefix)), prefix);
  }
});

const ordered = (roles) => {
  const out = [];
  const walk = (items) => items.forEach((i) => { if (i.path) out.push(i.path); if (i.children) walk(i.children); });
  walk(removeEmptySections(filterNavigationItems(navigationItems, roles, [])));
  return out;
};
const REPORT_PATHS = [
  "/dashboard/trial-balance/before-adjustments",
  "/dashboard/trial-balance/after-adjustments",
  "/dashboard/income",
  "/dashboard/financial-position",
  "/dashboard/cash-flow",
  "/dashboard/payroll/reports",
  "/dashboard/reports",
  "/dashboard/reports/aging",
  "/dashboard/reports/profitability/items",
];

test("every report screen sits in the final Reports group, after all other screens", () => {
  const all = ordered(["Admin"]);
  const reportsStart = Math.min(...REPORT_PATHS.map((p) => all.indexOf(p)));
  for (const p of REPORT_PATHS) assert.ok(all.includes(p), p);
  const after = all.slice(reportsStart);
  const nonReport = after.filter((p) => !p.startsWith("/dashboard/reports") && !REPORT_PATHS.includes(p));
  // only the Admin-only management screens may come after the reports start... they must not
  assert.deepEqual(nonReport, [], nonReport.join(","));
});

test("the last section header is Reports and nothing but report groups follows it", () => {
  const items = removeEmptySections(filterNavigationItems(navigationItems, ["Admin"], []));
  const lastSection = items.map((i, k) => (i.type === "section" ? k : -1)).filter((k) => k >= 0).pop();
  assert.equal(items.length - lastSection, 2, "section + one Reports group");
});

test("role gating is unchanged for the moved reports", () => {
  const acc = ordered(["Accountant"]);
  for (const p of REPORT_PATHS) assert.ok(acc.includes(p), `Accountant ${p}`);
  for (const role of ["Cashier", "User"]) {
    const p = ordered([role]);
    for (const r of REPORT_PATHS) assert.ok(!p.includes(r), `${role} must not see ${r}`);
  }
});
