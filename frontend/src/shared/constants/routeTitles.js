import { t } from "../../i18n";
export const routeTitles = {
  "/dashboard": t("الرئيسية"),

  "/dashboard/sales": t("المبيعات والمشتريات"),
  "/dashboard/sales/new": t("فاتورة بيع جديدة"),
  "/dashboard/sales/:id": t("تفاصيل الفاتورة"),
  "/dashboard/sales/:id/edit": t("تعديل الفاتورة"),

  "/dashboard/purchases/new": t("فاتورة شراء جديدة"),
  "/dashboard/purchases/:id": t("تفاصيل فاتورة الشراء"),
  "/dashboard/purchases/:id/edit": t("تعديل فاتورة الشراء"),

  "/dashboard/partners": t("قائمة العملاء والموردين"),
  "/dashboard/partners/opening-balances": t("أرصدة افتتاحية"),
  "/dashboard/partners/statement": t("كشف حساب عميل/مورد"),
  "/dashboard/partners/countries": t("الدول"),
  "/dashboard/partners/:partnerId": t("تفاصيل العميل/المورد"),
  "/dashboard/stores/containers/:partnerId": t("كشف حساب عبوات"),

  "/dashboard/drivers": t("قائمة السائقين"),
  "/dashboard/drivers/trip-costs": t("مصاريف الرحلات"),
  "/dashboard/drivers/statement": t("كشف حساب سائق"),
  "/dashboard/drivers/opening-balances": t("الأرصدة الافتتاحية للسائقين"),
  "/dashboard/drivers/:driverId": t("تفاصيل السائق"),

  "/dashboard/treasury": t("الخزائن والبنوك"),
  "/dashboard/treasury/cash-movement-types": t("أنواع حركات الخزنة"),
  "/dashboard/treasury/currencies": t("العملات وأسعار الصرف"),
  "/dashboard/treasury/transfers": t("التحويلات بين الخزائن"),
  "/dashboard/treasury/transfers/:id": t("تفاصيل التحويل"),
  "/dashboard/treasury/:cashboxId": t("تفاصيل الخزنة"),

  "/dashboard/expenses": t("المصاريف"),
  "/dashboard/bank": t("البنك"),

  "/dashboard/stores": t("قائمة المخازن"),
  "/dashboard/stores/:id": t("تفاصيل المخزن"),
  "/dashboard/inventory/containers": t("العبوات"),
  "/dashboard/inventory/units": t("وحدات القياس"),
  "/dashboard/inventory/opening-balances": t("أرصدة افتتاحية مخزنية"),
  "/dashboard/inventory/stock-transfers": t("التحويلات المخزنية"),
  "/dashboard/inventory/adjustments": t("تسويات المخزون"),
  "/dashboard/inventory/adjustments/new": t("تسوية مخزون جديدة"),
  "/dashboard/inventory/adjustments/:id": t("تفاصيل التسوية"),
  "/dashboard/inventory/adjustments/:id/edit": t("تعديل التسوية"),
  "/dashboard/items/:id": t("تفاصيل الصنف"),
  "/dashboard/invoice-item-pricing": t("تكلفة أصناف الفواتير"),

  "/dashboard/payroll": t("لوحة تحكم الأجور"),
  "/dashboard/payroll/employees": t("الموظفين"),
  "/dashboard/payroll/employees/statement": t("كشف حساب موظف"),
  "/dashboard/payroll/employees/:employeeId": t("تفاصيل الموظف"),
  "/dashboard/payroll/opening-balances": t("الأرصدة الافتتاحية"),
  "/dashboard/payroll/attendance": t("تسجيل الحضور والانصراف"),
  "/dashboard/payroll/attendance/records": t("الحضور والانصراف"),
  "/dashboard/payroll/movements": t("الحركات المالية للموظفين"),
  "/dashboard/payroll/salaries": t("المرتبات"),
  "/dashboard/payroll/salaries/create": t("إنشاء مرتبات"),
  "/dashboard/payroll/salaries/:salaryId": t("تفاصيل المرتب"),
  "/dashboard/payroll/reports": t("تقارير المرتبات"),

  "/dashboard/fiscal-years": t("السنوات المالية"),
  "/dashboard/accounting-readiness": t("مراقبة الجاهزية المحاسبية"),
  "/dashboard/accounts": t("دليل الحسابات"),
  "/dashboard/account-mappings": t("إعدادات الربط المحاسبي"),
  "/dashboard/journal-entries": t("قيود اليومية"),
  "/dashboard/journal-entries/new": t("قيد يومية جديد"),
  "/dashboard/journal-entries/:id": t("تفاصيل قيد اليومية"),
  "/dashboard/journal-entries/:id/edit": t("تعديل قيد اليومية"),

  "/dashboard/trial-balance/before-adjustments": t("ميزان المراجعة قبل التسوية"),

  "/dashboard/trial-balance/after-adjustments": t("ميزان المراجعة بعد التسوية"),

  "/dashboard/income": t("قائمة الدخل"),

  "/dashboard/financial-position": t("المركز المالي"),

  "/dashboard/cash-flow": t("قائمة التدفقات النقدية"),

  "/dashboard/reports": t("التقارير"),
  "/dashboard/reports/profitability/invoices": t("ربحية الفواتير"),
  "/dashboard/reports/profitability/invoices/:invoiceId":
    t("تفاصيل ربحية الفاتورة"),
  "/dashboard/reports/profitability/items": t("ربحية الأصناف"),
  "/dashboard/reports/inventory/stock": t("تقرير أرصدة المخزون"),
  "/dashboard/reports/inventory/cost": t("تقرير تكلفة المخزون"),

  "/dashboard/permissions": t("الشركات والمستخدمون"),
  "/dashboard/profile": t("الملف الشخصي"),
  "/dashboard/profile/edit": t("تعديل الملف الشخصي"),
};

export const matchRouteTitle = (pathname) => {
  if (routeTitles[pathname]) {
    return routeTitles[pathname];
  }

  for (const pattern of Object.keys(routeTitles)) {
    if (!pattern.includes(":")) {
      continue;
    }

    const regex = new RegExp(`^${pattern.replace(/:[^/]+/g, "[^/]+")}$`);

    if (regex.test(pathname)) {
      return routeTitles[pattern];
    }
  }

  return null;
};
