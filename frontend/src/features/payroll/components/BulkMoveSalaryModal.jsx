import { useSelector } from "react-redux";
import { selectSelectedFiscalYear } from "../../fiscalYears/fiscalYearSlice";
import { getFiscalYearDateWarning } from "../../../lib/fiscalYearDateRange";
// features/payroll/components/BulkMoveSalaryModal.jsx

import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import Modal from "../../../shared/components/ui/Modal";
import Input from "../../../shared/components/ui/Input";
import Button from "../../../shared/components/ui/Button";

import { useBulkMoveSalaryMutation } from "../payrollApi";

import { t } from "../../../i18n";
const defaultValues = {
  defaultPostingDate: "",
  notes: "",
};

export default function BulkMoveSalaryModal({
  isOpen,
  payrollEntryIds = [],
  onClose,
  onSaved,
}) {
  const selectedFiscalYear = useSelector(selectSelectedFiscalYear);
  const [bulkMoveSalary, { isLoading }] = useBulkMoveSalaryMutation();

  const wasOpenRef = useRef(false);

  const { register, handleSubmit, reset } = useForm({
    defaultValues,
  });

  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      reset({
        ...defaultValues,
        defaultPostingDate: new Date().toISOString().slice(0, 10),
      });
    }

    wasOpenRef.current = isOpen;
  }, [isOpen, reset]);

  const onSubmit = async (data) => {
    const fiscalYearWarning = [data.defaultPostingDate]
      .map((value) => getFiscalYearDateWarning(value, selectedFiscalYear))
      .find(Boolean);

    if (fiscalYearWarning) {
      toast.error(fiscalYearWarning);
      return;
    }

    try {
      await bulkMoveSalary({
        payrollEntryIds: payrollEntryIds.map(Number),
        defaultPostingDate: data.defaultPostingDate,
        notes: data.notes,
      }).unwrap();

      toast.success(t("تم ترحيل {0} راتب بنجاح", { 0: payrollEntryIds.length }));

      onSaved?.();
    } catch (error) {
      // الباك هو المسؤول عن الخطأ
      toast.error(
        error?.data?.message || error?.data?.title || t("حدث خطأ أثناء الترحيل"),
      );
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t("ترحيل {0} راتب", { 0: payrollEntryIds.length })}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <p className="text-xs text-ink-400 -mt-1">
          {t("سيتم تطبيق تاريخ الترحيل والملاحظات على جميع القيود المحددة.")}
        </p>

        <Input
          label={t("تاريخ الترحيل")}
          type="date"
          min={selectedFiscalYear?.startDate}
          max={selectedFiscalYear?.endDate}
          {...register("defaultPostingDate")}
        />

        <Input
          label={t("ملاحظات عامة")}
          {...register("notes")}
          placeholder={t("أضف ملاحظات إن وجدت")}
        />

        <div className="flex justify-end gap-2 pt-2 border-t border-ink-400/10">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            {t("إلغاء")}
          </Button>

          <Button type="submit" disabled={isLoading}>
            {isLoading
              ? t("جارِ الترحيل...")
              : t("ترحيل ({0})", { 0: payrollEntryIds.length })}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
