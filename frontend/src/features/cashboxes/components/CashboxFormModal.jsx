import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import Modal from "../../../shared/components/ui/Modal";
import Input from "../../../shared/components/ui/Input";
import Button from "../../../shared/components/ui/Button";

import {
  useCreateCashboxMutation,
  useUpdateCashboxMutation,
} from "../cashboxesApi";

import { t } from "../../../i18n";
import { getLocale } from "../../../i18n";
const schema = z.object({
  name: z.string().min(2, t("اسم الخزنة مطلوب")),

  currency: z.enum(["EGP", "USD", "EUR", "GBP", "SAR", "AED", "KWD"]),

  openingBalance: z
    .number({
      invalid_type_error: t("أدخل رقم صحيح"),
    })
    .min(0),

  openingBalanceDate: z.string().min(1, t("التاريخ مطلوب")),

  openingExchangeRate: z
    .number({
      invalid_type_error: t("أدخل رقم صحيح"),
    })
    .min(0)
    .optional(),

  isActive: z.boolean(),

  notes: z.string().optional(),
});

const emptyValues = {
  name: "",
  currency: "EGP",
  openingBalance: 0,
  openingBalanceDate: new Date().toISOString().slice(0, 10),
  openingExchangeRate: 1,
  isActive: true,
  notes: "",
};

/**
 * @param {{
 *   isOpen: boolean,
 *   onClose: () => void,
 *   onSaved?: (cashbox: Object) => void,
 *   cashbox?: Object | null
 * }} props
 */
export default function CashboxFormModal({
  isOpen,
  onClose,
  onSaved,
  cashbox = null,
}) {
  const isEdit = Boolean(cashbox);

  const [createCashbox, { isLoading: isCreating }] = useCreateCashboxMutation();

  const [updateCashbox, { isLoading: isUpdating }] = useUpdateCashboxMutation();

  const isLoading = isCreating || isUpdating;

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: emptyValues,
  });

  useEffect(() => {
    if (!isOpen) return;

    reset(
      cashbox
        ? {
            name: cashbox.name ?? "",

            currency: cashbox.currency ?? "EGP",

            openingBalance: cashbox.openingBalance ?? 0,

            openingBalanceDate:
              cashbox.openingBalanceDate ?? emptyValues.openingBalanceDate,

            openingExchangeRate: cashbox.openingExchangeRate ?? 1,

            isActive: cashbox.isActive ?? true,

            notes: cashbox.notes ?? "",
          }
        : emptyValues,
    );
  }, [cashbox, isOpen, reset]);

  const onSubmit = async (values) => {
    try {
      const saved = isEdit
        ? await updateCashbox({
            id: cashbox.id,
            rowVersion: cashbox.rowVersion,
            ...values,
          }).unwrap()
        : await createCashbox(values).unwrap();

      toast.success(isEdit ? t("تم تحديث الخزنة بنجاح") : t("تم إنشاء الخزنة بنجاح"));

      onSaved?.(saved);
      onClose();
    } catch (err) {
      const code = err?.data?.code ?? err?.data?.errorCode;

      if (code === "Cashboxes.NonZeroBalance") {
        toast.error(
          err?.data?.detail ||
            t("لا يمكن تعطيل الخزنة لأن رصيدها الحالي غير صفري. سوّي الرصيد للصفر الأول."),
        );
        return;
      }

      if (code === "Cashboxes.Concurrency") {
        toast.error(t("تم تعديل الخزنة من مكان آخر، حدّث الصفحة وحاول تاني"));
        return;
      }

      if (err?.status === 400 && (err?.data?.message || err?.data?.detail)) {
        toast.error(err.data.message ?? err.data.detail);
        return;
      }

      toast.error(isEdit ? t("تعذر تحديث الخزنة") : t("تعذر إنشاء الخزنة"));
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? t("تعديل بيانات الخزنة") : t("إضافة خزنة جديدة")}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* اسم الخزنة */}
        <Input
          label={t("اسم الخزنة")}
          placeholder={t("مثال: خزنة الفرع الرئيسي")}
          error={errors.name?.message}
          {...register("name")}
        />

        {/* الرصيد الحالي */}
        {isEdit && (
          <div className="rounded-lg border bg-ink-400/5 p-3">
            <p className="text-xs text-ink-400 mb-1">
              {t("الرصيد الحالي (محسوب من الحركة)")}
            </p>

            <p className="text-sm font-semibold text-ink-900">
              {cashbox.currentBalance != null
                ? cashbox.currentBalance.toLocaleString(getLocale(), { maximumFractionDigits: 2 })
                : "—"}{" "}
              {cashbox.currency}
            </p>
          </div>
        )}

        {/* الرصيد الافتتاحي */}
        <Input
          label={t("الرصيد الافتتاحي")}
          type="number"
          step="0.01"
          error={errors.openingBalance?.message}
          {...register("openingBalance", {
            valueAsNumber: true,
          })}
        />

        {/* تاريخ الرصيد الافتتاحي */}
        <Input
          label={t("تاريخ الرصيد الافتتاحي")}
          type="date"
          error={errors.openingBalanceDate?.message}
          {...register("openingBalanceDate")}
        />

        {/* العملة */}
        <Controller
          control={control}
          name="currency"
          render={({ field }) => (
            <div>
              <label className="mb-1 block text-sm font-medium">{t("العملة")}</label>

              <select {...field} className="w-full rounded-lg border px-3 py-2">
                <option value="EGP">{t("الجنيه المصري")}</option>

                <option value="USD">{t("الدولار الأمريكي")}</option>

                <option value="EUR">{t("اليورو")}</option>

                <option value="GBP">{t("الجنيه الإسترليني")}</option>

                <option value="SAR">{t("الريال السعودي")}</option>

                <option value="AED">{t("الدرهم الإماراتي")}</option>

                <option value="KWD">{t("الدينار الكويتي")}</option>
              </select>

              {errors.currency && (
                <p className="field-error">
                  {errors.currency.message}
                </p>
              )}
            </div>
          )}
        />

        {/* سعر الصرف */}
        <Input
          label={t("سعر الصرف الافتتاحي")}
          type="number"
          step="0.01"
          error={errors.openingExchangeRate?.message}
          {...register("openingExchangeRate", {
            valueAsNumber: true,
          })}
        />

        {/* حالة الخزنة */}
        <Controller
          control={control}
          name="isActive"
          render={({ field }) => (
            <div>
              <label className="flex items-center justify-between rounded-lg border p-3">
                <span className="font-medium">{t("تفعيل الخزنة")}</span>

                <input
                  type="checkbox"
                  checked={field.value}
                  onChange={(e) => field.onChange(e.target.checked)}
                  className="h-5 w-5"
                />
              </label>

              {isEdit && (
                <p
                  className={`mt-1.5 text-xs leading-5 ${
                    cashbox?.currentBalance &&
                    Number(cashbox.currentBalance) !== 0
                      ? "text-negative"
                      : "text-ink-400"
                  }`}
                >
                  {cashbox?.currentBalance &&
                  Number(cashbox.currentBalance) !== 0
                    ? t("الخزنة عليها رصيد حالي غير صفري. السيرفر هيرفض تعطيلها — لازم الرصيد يوصل صفر الأول.")
                    : t("التعطيل متاح فقط لو الرصيد الحالي للخزنة صفر. إعادة التفعيل متاحة في أي وقت.")}
                </p>
              )}
            </div>
          )}
        />

        {/* الملاحظات */}
        <Input
          label={t("ملاحظات (اختياري)")}
          placeholder="..."
          {...register("notes")}
        />

        {/* تنبيه التعديل */}
        {isEdit && (
          <p className="text-xs text-ink-400">
            {t("تنبيه: الرصيد الافتتاحي والعملة مينفعش يتغيروا لو فيه سندات مسجلة على الخزنة دي — السيرفر هيرفض الحفظ ويوضح السبب.")}
          </p>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            {t("إلغاء")}
          </Button>

          <Button type="submit" disabled={isLoading}>
            {isLoading
              ? t("جاري الحفظ...")
              : isEdit
                ? t("حفظ التعديلات")
                : t("حفظ الخزنة")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
