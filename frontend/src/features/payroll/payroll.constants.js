import { t } from "../../i18n";
import { getLocale } from "../../i18n";
// features/payroll/payroll.constants.js

// ============================================================
// Employee Types
// ============================================================

export const workPlaceStatusOptions = [
  { value: "InCompany", label: t("داخل الشركة") },
  { value: "OutCompany", label: t("خارج الشركة") },
];

export const employeeStatusOptions = [
  { value: "", label: t("الكل") },
  { value: "true", label: t("نشط") },
  { value: "false", label: t("غير نشط") },
];

export const EMPLOYEE_TYPE = {
  Daily: t("يومي"),
  Monthly: t("شهري"),
};

export const employeeTypeOptions = Object.entries(EMPLOYEE_TYPE).map(
  ([value, label]) => ({
    value,
    label,
  }),
);

// ============================================================
// Attendance Status
// ============================================================

export const ATTENDANCE_STATUS = {
  Absent: t("غائب"),
  Present: t("حاضر"),
};

export const ATTENDANCE_STATUS_VALUE = {
  Absent: 0,
  Present: 1,
};

export const attendanceStatusOptions = Object.entries(ATTENDANCE_STATUS).map(
  ([value, label]) => ({
    value,
    label,
  }),
);

export const attendanceStatusBadge = {
  Present: "text-positive bg-positive/10",
  Absent: "text-negative bg-negative/10",
};

// ============================================================
// Day Ratios
// ============================================================

export const DAY_RATIO = {
  OneDay: 1,
  FullDay: 1,
  TwoDays: 2,
  ThreeDays: 3,
  FourDays: 4,
  FiveDays: 5,
  ThreeQuarterDay: 6,
  TwoThirdsDay: 7,
  HalfDay: 8,
  ThirdDay: 9,
  QuarterDay: 10,
};

export const DAY_RATIO_LABELS = {
  OneDay: t("يوم كامل"),
  FullDay: t("يوم كامل"),
  TwoDays: t("يومان"),
  ThreeDays: t("ثلاثة أيام"),
  FourDays: t("أربعة أيام"),
  FiveDays: t("خمسة أيام"),
  ThreeQuarterDay: t("ثلاثة أرباع يوم"),
  TwoThirdsDay: t("ثلثا يوم"),
  HalfDay: t("نصف يوم"),
  ThirdDay: t("ثلث يوم"),
  QuarterDay: t("ربع يوم"),
};

export const dayRatioOptions = [
  { value: 1, label: t("يوم كامل") },
  { value: 2, label: t("يومان") },
  { value: 3, label: t("ثلاثة أيام") },
  { value: 4, label: t("أربعة أيام") },
  { value: 5, label: t("خمسة أيام") },
  { value: 6, label: t("ثلاثة أرباع يوم") },
  { value: 7, label: t("ثلثا يوم") },
  { value: 8, label: t("نصف يوم") },
  { value: 9, label: t("ثلث يوم") },
  { value: 10, label: t("ربع يوم") },
];

export const DAY_RATIO_BY_VALUE = {
  1: t("يوم كامل"),
  2: t("يومان"),
  3: t("ثلاثة أيام"),
  4: t("أربعة أيام"),
  5: t("خمسة أيام"),
  6: t("ثلاثة أرباع يوم"),
  7: t("ثلثا يوم"),
  8: t("نصف يوم"),
  9: t("ثلث يوم"),
  10: t("ربع يوم"),
};

// ============================================================
// Employee Movement Type
// ============================================================
// ملاحظة: MOVEMENT_TYPE_LABELS / movementTypeOptions فيها كل القيم
// (بما فيها Advance و Withdrawal) وتُستخدم في العرض والفلترة فقط.
// الـ API (POST /EmployeeMovements) بيقبل 4 قيم بس، عشان كده فيه
// createMovementTypeOptions منفصلة تُستخدم في فورم الإنشاء.

export const MOVEMENT_TYPE_LABELS = {
  Debit: t("مدين"),
  Credit: t("دائن"),
  Advance: t("سلفة"),
  Deduction: t("خصم"),
  Bonus: t("مكافأة"),
  Withdrawal: t("سحب"),
};

export const movementTypeOptions = Object.entries(MOVEMENT_TYPE_LABELS).map(
  ([value, label]) => ({
    value,
    label,
  }),
);

export const movementTypeBadge = {
  Debit: "text-positive bg-positive/10",
  Credit: "text-negative bg-negative/10",
  Advance: "text-amber-600 bg-amber-50",
  Deduction: "text-negative bg-negative/10",
  Bonus: "text-positive bg-positive/10",
  Withdrawal: "text-negative bg-negative/10",
};

// القيم المسموح بيها فعليًا في POST /EmployeeMovements
export const CREATE_MOVEMENT_TYPE_LABELS = {
  Deduction: t("خصم"),
  Bonus: t("مكافأة"),
  Debit: t("مدين"),
  Credit: t("دائن"),
};

export const createMovementTypeOptions = Object.entries(
  CREATE_MOVEMENT_TYPE_LABELS,
).map(([value, label]) => ({
  value,
  label,
}));

// ============================================================
// Payroll Status
// ============================================================

export const PAYROLL_STATUS = {
  Draft: t("مسودة"),
  UnderReview: t("تحت المراجعة"),
  Approved: t("معتمد"),
  Disbursed: t("تم الصرف"),
};

export const payrollStatusBadge = {
  Draft: "text-ink-400 bg-ink-400/10",
  UnderReview: "text-amber-600 bg-amber-50",
  Approved: "text-primary-600 bg-primary-50",
  Disbursed: "text-positive bg-positive/10",
};

// ============================================================
// Currency
// ============================================================

export const currencyOptions = [
  { value: "EGP", label: t("جنيه مصري") },
  { value: "USD", label: t("دولار أمريكي") },
  { value: "EUR", label: t("يورو") },
  { value: "GBP", label: t("جنيه إسترليني") },
  { value: "SAR", label: t("ريال سعودي") },
  { value: "AED", label: t("درهم إماراتي") },
  { value: "KWD", label: t("دينار كويتي") },
];

// ============================================================
// Balance Type
// ============================================================

export const balanceTypeOptions = [
  { value: "Debit", label: t("مدين") },
  { value: "Credit", label: t("دائن") },
];

export const BALANCE_TYPE_LABELS = {
  Debit: t("مدين"),
  Credit: t("دائن"),
};

export const balanceTypeBadge = {
  Debit: "text-negative bg-negative/10",
  Credit: "text-positive bg-positive/10",
};

// ============================================================
// Money Formatter
// ============================================================

export const fmtMoney = (value) => Number(value || 0).toLocaleString(getLocale(), { maximumFractionDigits: 2 });
