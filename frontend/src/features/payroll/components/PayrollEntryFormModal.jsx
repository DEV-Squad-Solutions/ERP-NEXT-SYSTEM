import { useSelector } from "react-redux";
import { selectSelectedFiscalYear } from "../../fiscalYears/fiscalYearSlice";
import { getFiscalYearDateWarning } from "../../../lib/fiscalYearDateRange";
// features/payroll/components/PayrollEntryFormModal.jsx

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { toast } from "sonner";

import Modal from "../../../shared/components/ui/Modal";
import Input from "../../../shared/components/ui/Input";
import CompactSelect from "../../../shared/components/ui/CompactSelect";
import Button from "../../../shared/components/ui/Button";

import {
  useCreatePayrollEntryMutation,
  useGetEmployeesSelectQuery,
} from "../payrollApi";

import { t } from "../../../i18n";
import { getDir } from "../../../i18n";
const defaultValues = {
  startDate: "",
  endDate: "",
  employeeId: "",
  bonus: "0",
  deduction: "0",
  overtimebydayunit: "0",
  cashboxId: "",
  cashMovementTypeId: "",
};

export default function PayrollEntryFormModal({ isOpen, onClose }) {
  const selectedFiscalYear = useSelector(selectSelectedFiscalYear);
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues,
  });

  const { data: employees } = useGetEmployeesSelectQuery();

  const [createPayroll, { isLoading }] = useCreatePayrollEntryMutation();

  useEffect(() => {
    if (isOpen) {
      reset({
        ...defaultValues,
        startDate: new Date().toISOString().slice(0, 10),
        endDate: new Date().toISOString().slice(0, 10),
      });
    }
  }, [isOpen, reset]);

  const onSubmit = async (data) => {
    const fiscalYearWarning = [data.startDate, data.endDate]
      .map((value) => getFiscalYearDateWarning(value, selectedFiscalYear))
      .find(Boolean);

    if (fiscalYearWarning) {
      toast.error(fiscalYearWarning);
      return;
    }

    if (!data.employeeId) {
      toast.error(t("الموظف مطلوب"));
      return;
    }

    try {
      await createPayroll({
        startDate: data.startDate,
        endDate: data.endDate,

        employeeId: Number(data.employeeId),

        bonus: Number(data.bonus || 0),
        deduction: Number(data.deduction || 0),

        overtimebydayunit: Number(data.overtimebydayunit || 0),

        cashboxId: Number(data.cashboxId),
        cashMovementTypeId: Number(data.cashMovementTypeId),
      }).unwrap();

      toast.success(t("تم إنشاء قيد المرتب بنجاح"));

      onClose();
    } catch (error) {
      toast.error(error?.data?.message || t("حصل خطأ أثناء إنشاء المرتب"));
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t("إنشاء مرتب")}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" dir={getDir()}>
        <Controller
          name="employeeId"
          control={control}
          render={({ field }) => (
            <div>
              <label className="block text-xs font-medium text-ink-400 mb-1">
                {t("الموظف")}
              </label>

              <CompactSelect
                options={
                  employees?.map((employee) => ({
                    value: String(employee.id),
                    label: employee.name,
                  })) || []
                }
                value={field.value}
                onChange={field.onChange}
                placeholder={t("اختر الموظف")}
              />

              {errors.employeeId && (
                <p className="text-xs text-negative mt-1">{t("الموظف مطلوب")}</p>
              )}
            </div>
          )}
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label={t("من تاريخ")}
            type="date"
            min={selectedFiscalYear?.startDate}
            max={selectedFiscalYear?.endDate}
            {...register("startDate", {
              required: t("التاريخ مطلوب"),
            })}
            error={errors.startDate?.message}
          />

          <Input
            label={t("إلى تاريخ")}
            type="date"
            min={selectedFiscalYear?.startDate}
            max={selectedFiscalYear?.endDate}
            {...register("endDate", {
              required: t("التاريخ مطلوب"),
            })}
            error={errors.endDate?.message}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label={t("الإضافات")}
            type="number"
            min="0"
            step="0.01"
            {...register("bonus")}
          />

          <Input
            label={t("الخصومات")}
            type="number"
            min="0"
            step="0.01"
            {...register("deduction")}
          />
        </div>

        <Input
          label={t("وحدة الإضافي باليوم")}
          type="number"
          min="0"
          step="0.01"
          {...register("overtimebydayunit")}
        />

        <Input
          label={t("رقم الخزنة")}
          type="number"
          min="1"
          {...register("cashboxId", {
            required: t("الخزنة مطلوبة"),
          })}
        />

        <Input
          label={t("نوع حركة الخزنة")}
          type="number"
          min="1"
          {...register("cashMovementTypeId", {
            required: t("نوع حركة الخزنة مطلوب"),
          })}
        />

        <div className="flex justify-end gap-2 pt-3 border-t border-ink-400/10">
          <Button type="button" variant="outline" onClick={onClose}>
            {t("إلغاء")}
          </Button>

          <Button type="submit" disabled={isLoading}>
            {isLoading ? t("جارِ الإنشاء...") : t("إنشاء المرتب")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
