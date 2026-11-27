import React, { useMemo } from "react";
import Select from "react-select";

import { t, getDir } from "../../../i18n";
import { usePhone } from "../../../utils/viewport";
/**
 * مكوّن اختيار عام (Searchable Select) مبني على react-select
 * يدعم شكلين من البيانات:
 *  1) مصفوفة كائنات بسيطة { value, label }
 *  2) مصفوفة كائنات مخصصة (مثل CUSTOMERS) مع تمرير getOptionLabel / getOptionValue
 *
 * Props:
 * - data: array            → قائمة العناصر (options)
 * - value: any              → القيمة الحالية (نفس نوع value في العنصر، مش الـ object الكامل)
 * - onChange(value|item)    → عند التغيير. لو تم تمرير getOptionValue بيرجع الـ item كامل، غير كده بيرجع value فقط
 * - placeholder: string
 * - getOptionLabel(item)    → دالة اختيارية لتحديد النص المعروض
 * - getOptionValue(item)    → دالة اختيارية لتحديد القيمة المميزة للعنصر
 * - isClearable: boolean
 * - isDisabled: boolean
 * - styles: object          → لتخصيص إضافي فوق التنسيق الافتراضي
 */
export default function SearchableSelect({
  data = [],
  value,
  onChange,
  placeholder = t("اختر..."),
  getOptionLabel,
  getOptionValue,
  isClearable = false,
  isDisabled = false,
  styles = {},
}) {
  // دوال افتراضية لو البيانات بسيطة { value, label }
  const resolveLabel = getOptionLabel || ((item) => item.label ?? item);
  const resolveValue = getOptionValue || ((item) => item.value ?? item);

  const options = useMemo(() => data, [data]);
  const phone = usePhone();

  const selectedOption = useMemo(() => {
    if (value === undefined || value === null || value === "") return null;
    return options.find((item) => resolveValue(item) === value) || null;
  }, [options, value]);

  const handleChange = (option) => {
    if (!option) {
      onChange(null);
      return;
    }
    // لو فيه getOptionValue مخصص، نرجّع القيمة (id) زي ما السلوك القديم كان
    onChange(resolveValue(option));
  };

  return (
    <Select
      options={options}
      value={selectedOption}
      onChange={handleChange}
      getOptionLabel={resolveLabel}
      getOptionValue={(item) => String(resolveValue(item))}
      placeholder={placeholder}
      isClearable={isClearable}
      isDisabled={isDisabled}
      isRtl={getDir() === "rtl"}
      isSearchable={!phone || options.length > 8}
      menuPlacement={phone ? "bottom" : "auto"}
      maxMenuHeight={phone ? 220 : 300}
      menuPortalTarget={typeof document !== "undefined" ? document.body : null}
      menuPosition="fixed"
      classNamePrefix="rs"
      noOptionsMessage={() => t("لا توجد نتائج")}
      styles={{ ...defaultStyles, ...styles }}
    />
  );
}

const defaultStyles = {
  control: (base, state) => ({
    ...base,
    minHeight: "38px",
    borderRadius: "0.5rem",
    borderColor: state.isFocused ? "rgb(var(--c-primary-500))" : "#E2E7E4",
    boxShadow: state.isFocused ? "0 0 0 1px rgb(var(--c-primary-500))" : "none",
    "&:hover": { borderColor: "rgb(var(--c-primary-500))" },
    fontFamily: "'Segoe UI', Tahoma, Arial, sans-serif",
    fontSize: "0.875rem",
  }),
  valueContainer: (base) => ({ ...base, padding: "2px 10px" }),
  option: (base, state) => ({
    ...base,
    fontSize: "0.875rem",
    backgroundColor: state.isSelected
      ? "rgb(var(--c-primary-500))"
      : state.isFocused
        ? "#EFF2F0"
        : "white",
    color: state.isSelected ? "white" : "#0E1827",
    cursor: "pointer",
  }),
  menu: (base) => ({ ...base, zIndex: 9999 }),
  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
  placeholder: (base) => ({ ...base, color: "#9AA6A0" }),
};
