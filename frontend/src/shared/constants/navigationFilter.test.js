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
