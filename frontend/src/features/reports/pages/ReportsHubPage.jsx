import { Link } from "react-router-dom";
import { t } from "../../../i18n";

const GROUPS = [
  { title: "التقارير المالية", items: [
    ["قائمة الدخل", "/dashboard/income"], ["المركز المالي", "/dashboard/financial-position"],
    ["قائمة التدفقات النقدية", "/dashboard/cash-flow"], ["ميزان المراجعة قبل التسوية", "/dashboard/trial-balance/before-adjustments"],
    ["ميزان المراجعة بعد التسوية", "/dashboard/trial-balance/after-adjustments"], ["تقرير المصروفات", "/dashboard/reports/expenses"],
    ["تقرير تسليم الخزينة", "/dashboard/reports/cash-handover"],
  ]},
  { title: "المبيعات والربحية", items: [
    ["ربحية الفواتير", "/dashboard/reports/profitability/invoices"], ["ربحية الأصناف", "/dashboard/reports/profitability/items"],
    ["كشف حساب عميل/مورد", "/dashboard/partners/statement"], ["أصناف العملاء والموردين", "/dashboard/reports/partner-items"],
    ["كشف حساب سائق", "/dashboard/drivers/statement"],
  ]},
  { title: "المخزون", items: [
    ["أرصدة المخزون", "/dashboard/reports/inventory/stock"], ["تكلفة المخزون", "/dashboard/reports/inventory/cost"],
  ]},
  { title: "الموظفين والمرتبات", items: [
    ["تقارير المرتبات", "/dashboard/payroll/reports"], ["كشف حساب موظف", "/dashboard/payroll/employees/statement"],
    ["تقرير الحضور والانصراف", "/dashboard/reports/attendance"], ["تقرير حركات الموظفين", "/dashboard/reports/employee-movements"],
    ["سجل الحضور والانصراف", "/dashboard/payroll/attendance/records"],
  ]},
];

export default function ReportsHubPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-ink-900">{t("كل التقارير")}</h1>
        <p className="text-sm text-ink-500">{t("كل تقارير النظام في مكان واحد")}</p>
      </div>
      {GROUPS.map((g) => (
        <section key={g.title} className="space-y-2">
          <h2 className="text-sm font-bold text-ink-700">{t(g.title)}</h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {g.items.map(([label, to]) => (
              <Link key={to} to={to} className="rounded-2xl border border-ink-400/10 bg-white px-4 py-3 text-sm font-medium text-ink-900 hover:border-primary-500/40">
                {t(label)}
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
