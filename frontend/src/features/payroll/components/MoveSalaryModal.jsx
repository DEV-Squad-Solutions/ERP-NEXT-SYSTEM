import { useSelector } from "react-redux";
import { selectSelectedFiscalYear } from "../../fiscalYears/fiscalYearSlice";
import { getFiscalYearDateWarning } from "../../../lib/fiscalYearDateRange";
// features/payroll/components/MoveSalaryModal.jsx

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import Modal from "../../../shared/components/ui/Modal";
import Input from "../../../shared/components/ui/Input";
import Button from "../../../shared/components/ui/Button";

import { useMoveSalaryMutation } from "../payrollApi";

import { t } from "../../../i18n";
const schema = z.object({
  postingDate: z.string().min(1, t("التاريخ مطلوب")),
  notes: z.string().optional(),
});

const defaultValues = {
  postingDate: "",
  notes: "",
};

export default function MoveSalaryModal({
  row,
  cashboxes,
  cashMovementTypes,
  onClose,
  onSaved,
}) {
  const selectedFiscalYear = useSelector(selectSelectedFiscalYear);
  const isOpen = Boolean(row);

  const [moveSalary, { isLoading }] = useMoveSalaryMutation();

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema), defaultValues });

  const wasOpenRef = { current: false };
  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      reset({
        ...defaultValues,
        postingDate: new Date().toISOString().slice(0, 10),
      });
    }
    wasOpenRef.current = isOpen;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!row) return null;

  const onSubmit = async (data) => {
    const fiscalYearWarning = [data.postingDate]
      .map((value) => getFiscalYearDateWarning(value, selectedFiscalYear))
      .find(Boolean);

    if (fiscalYearWarning) {
      toast.error(fiscalYearWarning);
      return;
    }

    try {
      await moveSalary({ id: row.id, ...data }).unwrap();
      toast.success(t("تم ترحيل الراتب بنجاح"));
      onSaved();
    } catch {
      toast.error(t("حصل خطأ أثناء الترحيل، حاول تاني"));
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t("ترحيل راتب {0}", { 0: row.employeeName })}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label={t("تاريخ الترحيل")}
          type="date"
          min={selectedFiscalYear?.startDate}
          max={selectedFiscalYear?.endDate}
          {...register("postingDate")}
          error={errors.postingDate?.message}
        />

        <Input
          label={t("ملاحظات")}
          {...register("notes")}
          error={errors.notes?.message}
        />

        <div className="flex justify-end gap-2 pt-2 border-t border-ink-400/10">
          <Button type="button" variant="outline" onClick={onClose}>
            {t("إلغاء")}
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? t("جارِ الترحيل...") : t("ترحيل")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
