import {
  LayoutDashboard,
  ShoppingCart,
  TrendingUp,
  Wallet,
  Boxes,
  Users,
  Truck,
  Receipt,
  Building,
  ClipboardList,
  BookOpen,
  Scale,
  FileBarChart,
  PieChart,
  ShieldCheck,
  WalletCards,
  DollarSign,
  Van,
  History,
  FileText,
  SlidersHorizontal,
  Ruler,
  PackageOpen,
  Globe,
  ArrowLeftRight,
  ChartNoAxesCombined,
  Coins,
  ArrowRightLeft,
  CalendarRange,
  ListTree,
  Link2,
  Waves,
} from "lucide-react";

import { t } from "../../i18n";
const FULL_ACCESS_ROLES = ["Admin", "Accountant"];

const LIMITED_ACCESS_ROLES = ["User", "Cashier"];

const INVOICE_ROLES = ["Admin", "Accountant", "User", "Cashier"];

const TREASURY_ROLES = ["Admin", "Accountant", "User", "Cashier"];

const EXPENSE_ROLES = ["Admin", "Accountant", "User", "Cashier"];

const PAYROLL_ROLES = ["Admin", "Accountant", "User", "Cashier"];

export const navigationItems = [
  {
    label: t("الرئيسية"),
    path: "/dashboard",
    icon: LayoutDashboard,
    end: true,
    roles: FULL_ACCESS_ROLES,
  },

  {
    type: "section",
    label: t("التشغيل"),
    roles: ["Admin", "Accountant", "User", "Cashier"],
  },

  {
    label: t("المبيعات والمشتريات"),
    path: "/dashboard/sales",
    icon: ShoppingCart,
    end: true,
    roles: INVOICE_ROLES,
  },

  {
    label: t("العملاء والموردين"),
    icon: Users,
    roles: FULL_ACCESS_ROLES,
    children: [
      {
        label: t("قائمة العملاء والموردين"),
        path: "/dashboard/partners",
        icon: Users,
        end: true,
        roles: FULL_ACCESS_ROLES,
      },
      {
        label: t("كشف حساب عميل/مورد"),
        path: "/dashboard/partners/statement",
        icon: FileText,
        end: true,
        roles: FULL_ACCESS_ROLES,
      },
      {
        label: t("أرصدة افتتاحية"),
        path: "/dashboard/partners/opening-balances",
        icon: History,
        end: true,
        roles: FULL_ACCESS_ROLES,
      },
      {
        label: t("الدول"),
        path: "/dashboard/partners/countries",
        icon: Globe,
        end: true,
        roles: FULL_ACCESS_ROLES,
      },
    ],
  },

  {
    label: t("المخازن"),
    icon: Boxes,
    roles: FULL_ACCESS_ROLES,
    children: [
      {
        label: t("قائمة المخازن"),
        path: "/dashboard/stores",
        icon: Building,
        end: true,
        roles: FULL_ACCESS_ROLES,
      },
      {
        label: t("التحويلات المخزنية"),
        path: "/dashboard/inventory/stock-transfers",
        icon: ArrowLeftRight,
        end: true,
        roles: FULL_ACCESS_ROLES,
      },
      {
        label: t("تسويات المخزون"),
        path: "/dashboard/inventory/adjustments",
        icon: SlidersHorizontal,
        end: true,
        roles: FULL_ACCESS_ROLES,
      },
      {
        label: t("أرصدة افتتاحية مخزنية"),
        path: "/dashboard/inventory/opening-balances",
        icon: History,
        end: true,
        roles: FULL_ACCESS_ROLES,
      },
      {
        label: t("العبوات"),
        path: "/dashboard/inventory/containers",
        icon: PackageOpen,
        end: true,
        roles: FULL_ACCESS_ROLES,
      },
      {
        label: t("وحدات القياس"),
        path: "/dashboard/inventory/units",
        icon: Ruler,
        end: true,
        roles: FULL_ACCESS_ROLES,
      },
    ],
  },

  {
    label: t("السائقين"),
    icon: Truck,
    roles: FULL_ACCESS_ROLES,
    children: [
      {
        label: t("قائمة السائقين"),
        path: "/dashboard/drivers",
        icon: Van,
        end: true,
        roles: FULL_ACCESS_ROLES,
      },
      {
        label: t("كشف حساب سائق"),
        path: "/dashboard/drivers/statement",
        icon: FileText,
        end: true,
        roles: FULL_ACCESS_ROLES,
      },
      {
        label: t("مصاريف الرحلات"),
        path: "/dashboard/drivers/trip-costs",
        icon: Receipt,
        end: true,
        roles: FULL_ACCESS_ROLES,
      },
      {
        label: t("الأرصدة الافتتاحية"),
        path: "/dashboard/drivers/opening-balances",
        icon: Coins,
        end: true,
        roles: FULL_ACCESS_ROLES,
      },
    ],
  },

  {
    type: "section",
    label: t("المالية"),
    roles: ["Admin", "Accountant", "User", "Cashier"],
  },

  {
    label: t("الخزائن والبنوك"),
    icon: Wallet,
    roles: TREASURY_ROLES,
    children: [
      {
        label: t("الخزائن والبنوك"),
        path: "/dashboard/treasury",
        icon: Wallet,
        end: true,
        roles: TREASURY_ROLES,
      },
      {
        label: t("التحويلات بين الخزائن"),
        path: "/dashboard/treasury/transfers",
        icon: ArrowLeftRight,
        end: true,
        roles: FULL_ACCESS_ROLES,
      },
      {
        label: t("أنواع حركات الخزنة"),
        path: "/dashboard/treasury/cash-movement-types",
        icon: SlidersHorizontal,
        end: true,
        roles: FULL_ACCESS_ROLES,
      },
      {
        label: t("العملات وأسعار الصرف"),
        path: "/dashboard/treasury/currencies",
        icon: Coins,
        end: true,
        roles: TREASURY_ROLES,
      },
    ],
  },

  {
    label: t("المصاريف"),
    path: "/dashboard/expenses",
    icon: Receipt,
    end: true,
    roles: EXPENSE_ROLES,
  },

  {
    type: "section",
    label: t("الموارد البشرية"),
    roles: PAYROLL_ROLES,
  },

  {
    label: t("الأجور والمرتبات"),
    icon: DollarSign,
    roles: PAYROLL_ROLES,
    children: [
      {
        label: t("لوحة التحكم"),
        path: "/dashboard/payroll",
        icon: LayoutDashboard,
        end: true,
        roles: PAYROLL_ROLES,
      },
      {
        label: t("الموظفين"),
        path: "/dashboard/payroll/employees",
        icon: Users,
        end: true,
        roles: PAYROLL_ROLES,
      },
      {
        label: t("كشف حساب موظف"),
        path: "/dashboard/payroll/employees/statement",
        icon: FileText,
        end: true,
        roles: PAYROLL_ROLES,
      },
      {
        label: t("الأرصدة الافتتاحية"),
        path: "/dashboard/payroll/opening-balances",
        icon: History,
        end: true,
        roles: PAYROLL_ROLES,
      },
      {
        label: t("الحضور والانصراف"),
        path: "/dashboard/payroll/attendance/records",
        icon: CalendarRange,
        end: true,
        roles: PAYROLL_ROLES,
      },
      {
        label: t("الحركات المالية للموظفين"),
        path: "/dashboard/payroll/movements",
        icon: ArrowRightLeft,
        end: true,
        roles: PAYROLL_ROLES,
      },
      {
        label: t("المرتبات"),
        path: "/dashboard/payroll/salaries",
        icon: WalletCards,
        end: true,
        roles: PAYROLL_ROLES,
      },
      {
        label: t("تقارير المرتبات"),
        path: "/dashboard/payroll/reports",
        icon: FileBarChart,
        end: true,
        roles: PAYROLL_ROLES,
      },
    ],
  },

  {
    type: "section",
    label: t("المحاسبة"),
    roles: FULL_ACCESS_ROLES,
  },
  {
    label: t("مراقبة الجاهزية المحاسبية"),
    path: "/dashboard/accounting-readiness",
    icon: ShieldCheck,
    end: true,
    roles: FULL_ACCESS_ROLES,
  },
  {
    label: t("السنوات المالية"),
    path: "/dashboard/fiscal-years",
    icon: CalendarRange,
    end: true,
    roles: FULL_ACCESS_ROLES,
  },

  {
    label: t("دليل الحسابات"),
    path: "/dashboard/accounts",
    icon: ListTree,
    end: true,
    roles: FULL_ACCESS_ROLES,
  },

  {
    label: t("إعدادات الربط المحاسبي"),
    path: "/dashboard/account-mappings",
    icon: Link2,
    end: true,
    roles: FULL_ACCESS_ROLES,
  },

  {
    label: t("قيود اليومية"),
    path: "/dashboard/journal-entries",
    icon: BookOpen,
    end: true,
    roles: FULL_ACCESS_ROLES,
  },

  {
    label: t("ميزان المراجعة قبل التسوية"),
    path: "/dashboard/trial-balance/before-adjustments",
    icon: ClipboardList,
    end: true,
    roles: FULL_ACCESS_ROLES,
  },

  {
    label: t("ميزان المراجعة بعد التسوية"),
    path: "/dashboard/trial-balance/after-adjustments",
    icon: Scale,
    end: true,
    roles: FULL_ACCESS_ROLES,
  },

  {
    label: t("تشكيل القوائم المالية"),
    path: "/dashboard/financial-statements",
    icon: ListTree,
    end: true,
    roles: FULL_ACCESS_ROLES,
  },

  {
    label: t("قائمة الدخل"),
    path: "/dashboard/income",
    icon: ChartNoAxesCombined,
    end: true,
    roles: FULL_ACCESS_ROLES,
  },

  {
    label: t("المركز المالي"),
    path: "/dashboard/financial-position",
    icon: PieChart,
    end: true,
    roles: FULL_ACCESS_ROLES,
  },

  {
    label: t("قائمة التدفقات النقدية"),
    path: "/dashboard/cash-flow",
    icon: Waves,
    end: true,
    roles: FULL_ACCESS_ROLES,
  },

  {
    type: "section",
    label: t("التقارير"),
    roles: FULL_ACCESS_ROLES,
  },

  {
    label: t("التقارير"),
    icon: FileBarChart,
    roles: FULL_ACCESS_ROLES,
    children: [
      {
        label: t("تقارير الربحية"),
        icon: TrendingUp,
        roles: FULL_ACCESS_ROLES,
        children: [
          {
            label: t("ربحية الفواتير"),
            path: "/dashboard/reports/profitability/invoices",
            icon: Receipt,
            end: true,
            roles: FULL_ACCESS_ROLES,
          },
          {
            label: t("ربحية الأصناف"),
            path: "/dashboard/reports/profitability/items",
            icon: Boxes,
            end: true,
            roles: FULL_ACCESS_ROLES,
          },
        ],
      },
    ],
  },

  {
    type: "section",
    label: t("الإدارة"),
    roles: ["Admin"],
  },

  {
    label: t("الشركات والمستخدمون"),
    path: "/dashboard/permissions",
    icon: ShieldCheck,
    end: true,
    roles: ["Admin"],
  },
];
