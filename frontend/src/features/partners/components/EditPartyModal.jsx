import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import Modal from "../../../shared/components/ui/Modal";
import Input from "../../../shared/components/ui/Input";
import Button from "../../../shared/components/ui/Button";

import { useUpdatePartyMutation } from "../partiesApi";

import { t } from "../../../i18n";
const CURRENCIES = [
  { value: "EGP", label: t("جنيه مصري") },
  { value: "USD", label: t("دولار أمريكي") },
  { value: "EUR", label: t("يورو") },
  { value: "GBP", label: t("جنيه إسترليني") },
  { value: "SAR", label: t("ريال سعودي") },
  { value: "AED", label: t("درهم إماراتي") },
  { value: "KWD", label: t("دينار كويتي") },
];

const editPartySchema = z.object({
  name: z.string().trim().min(2, t("اسم الشريك مطلوب")),

  email: z
    .string()
    .trim()
    .email(t("البريد الإلكتروني غير صحيح"))
    .or(z.literal("")),

  currency: z.enum(["EGP", "USD", "EUR", "GBP", "SAR", "AED", "KWD"]),

  address: z.string().optional(),

  phoneNumber: z.string().optional(),

  taxNumber: z.string().optional(),

  creditLimit: z.union([z.coerce.number().min(0), z.literal("")]).optional(),

  isActive: z.boolean(),

  special: z.boolean(),
});

const DEFAULT_VALUES = {
  name: "",
  email: "",
  currency: "EGP",
  address: "",
  phoneNumber: "",
  taxNumber: "",
  creditLimit: "",
  isActive: true,
  special: false,
};

export default function EditPartyModal({ isOpen, onClose, party }) {
  const [updateParty, { isLoading }] = useUpdatePartyMutation();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(editPartySchema),
    defaultValues: DEFAULT_VALUES,
  });

  useEffect(() => {
    if (!party || !isOpen) return;

    reset({
      name: party.name ?? "",
      email: party.email ?? "",
      currency: party.currency ?? "EGP",
      address: party.address ?? "",
      phoneNumber: party.phoneNumber ?? "",
      taxNumber: party.taxNumber ?? "",
      creditLimit: party.creditLimit ?? "",
      isActive: party.isActive ?? true,
      special: party.special ?? false,
    });
  }, [party, isOpen, reset]);

  const handleClose = () => {
    reset(DEFAULT_VALUES);
    onClose?.();
  };

  const onSubmit = async (data) => {
    if (!party?.id) return;

    try {
      await updateParty({
        id: party.id,
        ...data,
        creditLimit: data.creditLimit === "" ? null : Number(data.creditLimit),
      }).unwrap();

      toast.success(t("تم تعديل الشريك بنجاح"));

      handleClose();
    } catch (error) {
      toast.error(
        error?.data?.message || error?.data?.title || t("تعذر تعديل الشريك"),
      );
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={t("تعديل الشريك")} size="md">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* اسم الشريك */}
        <Input
          label={t("اسم الشريك")}
          {...register("name")}
          error={errors.name?.message}
        />

        {/* البريد الإلكتروني */}
        <Input
          label={t("البريد الإلكتروني")}
          type="email"
          placeholder="example@email.com"
          {...register("email")}
          error={errors.email?.message}
        />

        {/* العملة */}
        <div>
          <label className="mb-1.5 block text-xs text-ink-500">{t("العملة")}</label>

          <select
            {...register("currency")}
            className="w-full rounded-xl border border-ink-400/15 bg-white px-3.5 py-2.5 text-sm focus:border-primary-500 focus:outline-none"
          >
            {CURRENCIES.map((currency) => (
              <option key={currency.value} value={currency.value}>
                {currency.label}
              </option>
            ))}
          </select>

          {errors.currency?.message && (
            <p className="mt-1 text-xs text-red-500">
              {errors.currency.message}
            </p>
          )}
        </div>

        {/* رقم الهاتف */}
        <Input
          label={t("رقم الهاتف")}
          {...register("phoneNumber")}
          error={errors.phoneNumber?.message}
        />

        {/* الرقم الضريبي */}
        <Input
          label={t("الرقم الضريبي")}
          {...register("taxNumber")}
          error={errors.taxNumber?.message}
        />

        {/* العنوان */}
        <Input
          label={t("العنوان")}
          {...register("address")}
          error={errors.address?.message}
        />

        {/* حد الائتمان */}
        <Input
          label={t("حد الائتمان")}
          type="number"
          min="0"
          {...register("creditLimit")}
          error={errors.creditLimit?.message}
        />

        {/* الحالة */}
        <label className="flex items-center gap-2 text-sm text-ink-700">
          <input type="checkbox" {...register("isActive")} />

          <span>{t("الشريك نشط")}</span>
        </label>

        {/* شريك خاص */}
        <label className="flex items-center gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/[0.04] px-3.5 py-3 text-sm text-ink-700 cursor-pointer select-none transition-colors hover:bg-amber-500/[0.07]">
          <input
            type="checkbox"
            {...register("special")}
            className="h-4 w-4 rounded border-ink-400/30 accent-amber-500"
          />
          <span>
            {t("شريك خاص")}
            <span className="block text-xs text-ink-400 mt-0.5">
              {t("يُستخدم لتمييز هذا الشريك كحساب خاص")}
            </span>
          </span>
        </label>

        {/* الأزرار */}
        <div className="flex gap-3 pt-3">
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            disabled={isLoading}
            className="flex-1"
          >
            {t("إلغاء")}
          </Button>

          <Button type="submit" disabled={isLoading} className="flex-1">
            {isLoading ? t("جاري الحفظ...") : t("حفظ التعديلات")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
