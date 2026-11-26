// features/payroll/components/EmployeeFormModal.jsx
//
// لو النوع "Daily": حقل أيام العمل المطلوبة بيتعطل بصريًا ومايتبعتش
// في الـpayload خالص عند الإرسال (مش بيتبعت 0 ولا undefined - بيتشال
// من الجسم تمامًا).

import { useEffect } from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import Modal from "../../../shared/components/ui/Modal";
import Input from "../../../shared/components/ui/Input";
import CompactSelect from "../../../shared/components/ui/CompactSelect";
import Button from "../../../shared/components/ui/Button";
import {
  useCreateEmployeeMutation,
  useUpdateEmployeeMutation,
} from "../payrollApi";
import {
  employeeTypeOptions,
  workPlaceStatusOptions,
} from "../payroll.constants";

import { t } from "../../../i18n";
const schema = z.object({
  name: z.string().min(1, t("اسم الموظف مطلوب")),
  jobTitle: z.string().min(1, t("الوظيفة مطلوبة")),
  phoneNumber: z.string().optional(),
  email: z
    .string()
    .email(t("بريد إلكتروني غير صحيح"))
    .optional()
    .or(z.literal("")),
  address: z.string().optional(),
  type: z.string().min(1, t("نوع الأجر مطلوب")),
  salary: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? 0 : v),
    z.coerce
      .number({ invalid_type_error: t("أدخل رقماً صحيحاً") })
      .gt(0, t("أدخل قيمة أكبر من صفر")),
  ),
  requiredWorkingDaysPerMonth: z.coerce.number().min(0).optional(),
  workPlaceStatus: z.string().min(1, t("مكان العمل مطلوب")),
  placeName: z.string().optional(),
  isActive: z.boolean().default(true),
});

const defaultValues = {
  name: "",
  jobTitle: "",
  phoneNumber: "",
  email: "",
  address: "",
  type: "Daily",
  salary: "",
  requiredWorkingDaysPerMonth: 0,
  workPlaceStatus: "InCompany",
  placeName: "",
  isActive: true,
};

export default function EmployeeFormModal({
  isOpen,
  onClose,
  employee,
  onSaved,
}) {
  const isEdit = Boolean(employee);
  const [createEmployee, { isLoading: isCreating }] =
    useCreateEmployeeMutation();
  const [updateEmployee, { isLoading: isUpdating }] =
    useUpdateEmployeeMutation();
  const isSubmitting = isCreating || isUpdating;

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const watchedType = useWatch({ control, name: "type" });
  const isDaily = watchedType === "Daily";

  // لما ينتقل لـ"يومي" امسح قيمة أيام العمل عشان ميتلخبطش لو رجع شهري
  useEffect(() => {
    if (isDaily) {
      setValue("requiredWorkingDaysPerMonth", 0);
    }
  }, [isDaily, setValue]);

  // reset فقط عند closed -> open (نفس pattern الحفاظ على تعديلات المستخدم أثناء SignalR refetch)
  const wasOpenRef = { current: false };
  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      reset(
        employee
          ? {
              name: employee.name,
              jobTitle: employee.jobTitle,
              phoneNumber: employee.phoneNumber || "",
              email: employee.email || "",
              address: employee.address || "",
              type: employee.employeeType, // mapping من اسم الحقل في الـresponse
              salary: employee.salary,
              requiredWorkingDaysPerMonth:
                employee.requiredWorkingDaysPerMonth || 0,
              workPlaceStatus: employee.workPlaceStatus || "InCompany",
              placeName: employee.placeName || "",
              isActive: employee.isActive,
            }
          : defaultValues,
      );
    }
    wasOpenRef.current = isOpen;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const onSubmit = async (data) => {
    const payload = { ...data };
    // لو يومي: منبعتش الحقل خالص
    if (payload.type === "Daily") {
      delete payload.requiredWorkingDaysPerMonth;
    }

    try {
      if (isEdit) {
        await updateEmployee({ id: employee.id, ...payload }).unwrap();
        toast.success(t("تم تحديث بيانات الموظف بنجاح"));
      } else {
        await createEmployee(payload).unwrap();
        toast.success(t("تم إضافة الموظف بنجاح"));
      }
      onSaved?.();
      onClose();
    } catch {}
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? t("تعديل بيانات الموظف") : t("إضافة موظف جديد")}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {isEdit && (
          <div className="text-xs text-ink-400">
            {t("رقم الموظف:")}{" "}
            <span className="font-mono text-ink-700">{employee.code}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label={t("اسم الموظف")}
            {...register("name")}
            error={errors.name?.message}
          />
          <Input
            label={t("الوظيفة")}
            {...register("jobTitle")}
            error={errors.jobTitle?.message}
          />
          <Input
            label={t("رقم الهاتف")}
            {...register("phoneNumber")}
            error={errors.phoneNumber?.message}
          />
          <Input
            label={t("البريد الإلكتروني")}
            {...register("email")}
            error={errors.email?.message}
          />
          <Input
            label={t("العنوان")}
            {...register("address")}
            error={errors.address?.message}
          />

          <div>
            <label className="block text-xs font-medium text-ink-400 mb-1">
              {t("نوع الأجر")}
            </label>
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <CompactSelect
                  options={employeeTypeOptions}
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
            {errors.type && (
              <p className="text-xs text-negative mt-1">
                {errors.type.message}
              </p>
            )}
          </div>

          <Input
            label={isDaily ? t("الأجر اليومي *") : t("الراتب الشهري *")}
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            {...register("salary")}
            error={errors.salary?.message}
          />

          <div>
            <Input
              label={t("أيام العمل المطلوبة بالشهر")}
              type="number"
              disabled={isDaily}
              {...register("requiredWorkingDaysPerMonth")}
              error={errors.requiredWorkingDaysPerMonth?.message}
              className={isDaily ? "opacity-50 cursor-not-allowed" : ""}
            />
            {isDaily && (
              <p className="text-[11px] text-ink-400 mt-1">
                {t("غير مطلوب للموظف اليومي")}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-400 mb-1">
              {t("مكان العمل")}
            </label>
            <Controller
              name="workPlaceStatus"
              control={control}
              render={({ field }) => (
                <CompactSelect
                  options={workPlaceStatusOptions}
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
            {errors.workPlaceStatus && (
              <p className="text-xs text-negative mt-1">
                {errors.workPlaceStatus.message}
              </p>
            )}
          </div>

          <Input
            label={t("اسم المكان")}
            {...register("placeName")}
            error={errors.placeName?.message}
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-ink-700 cursor-pointer select-none">
          <input
            type="checkbox"
            {...register("isActive")}
            className="rounded border-ink-400/30 accent-primary-500"
          />
          {t("موظف نشط")}
        </label>

        <div className="flex justify-end gap-2 pt-2 border-t border-ink-400/10">
          <Button type="button" variant="outline" onClick={onClose}>
            {t("إلغاء")}
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? t("جارِ الحفظ...") : t("حفظ")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
