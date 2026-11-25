// src/features/permissions/components/QuickAddCompanyModal.jsx
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import Modal from "../../../shared/components/ui/Modal";
import Input from "../../../shared/components/ui/Input";
import Button from "../../../shared/components/ui/Button";
import {
  useCreateCompanyMutation,
  useUpdateCompanyMutation,
} from "../companiesApi";

import { t } from "../../../i18n";
const STOCK_MODES = [
  { value: "None", label: t("بدون فحص") },
  { value: "DateCheck", label: t("فحص بالتاريخ") },
  { value: "FinalCheck", label: t("فحص نهائي") },
  { value: "Both", label: t("الاثنين معًا") },
];

const CURRENCIES = [
  { value: "EGP", label: t("جنيه مصري") },
  { value: "USD", label: t("دولار أمريكي") },
  { value: "EUR", label: t("يورو") },
  { value: "GBP", label: t("جنيه إسترليني") },
  { value: "SAR", label: t("ريال سعودي") },
  { value: "AED", label: t("درهم إماراتي") },
  { value: "KWD", label: t("دينار كويتي") },
];

const schema = z.object({
  name: z.string().min(1, t("اسم الشركة مطلوب")).max(200),
  address: z.string().min(1, t("العنوان مطلوب")).max(500),
  commercialRegister: z.string().min(1, t("السجل التجاري مطلوب")).max(50),
  taxNumber: z.string().min(1, t("الرقم الضريبي مطلوب")).max(50),
  managerName: z.string().min(1, t("اسم المدير مطلوب")).max(200),
  stockBalanceCheckMode: z.enum(["None", "DateCheck", "FinalCheck", "Both"]),
  baseCurrency: z.enum(["EGP", "USD", "EUR", "GBP", "SAR", "AED", "KWD"]),
});

const emptyValues = {
  name: "",
  address: "",
  commercialRegister: "",
  taxNumber: "",
  managerName: "",
  stockBalanceCheckMode: "None",
  baseCurrency: "EGP",
};

/**
 * @param {{
 *   isOpen: boolean,
 *   onClose: () => void,
 *   onSaved?: (company: Object) => void,
 *   company?: Object | null
 * }} props
 */
export default function QuickAddCompanyModal({
  isOpen,
  onClose,
  onSaved,
  company = null,
}) {
  const isEdit = Boolean(company);
  const [createCompany, { isLoading: isCreating }] = useCreateCompanyMutation();
  const [updateCompany, { isLoading: isUpdating }] = useUpdateCompanyMutation();
  const isLoading = isCreating || isUpdating;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: emptyValues,
  });

  useEffect(() => {
    if (!isOpen) return;
    reset(
      company
        ? {
            name: company.name ?? "",
            address: company.address ?? "",
            commercialRegister: company.commercialRegister ?? "",
            taxNumber: company.taxNumber ?? "",
            managerName: company.managerName ?? "",
            stockBalanceCheckMode: company.stockBalanceCheckMode ?? "None",
            baseCurrency: company.baseCurrency ?? "EGP",
          }
        : emptyValues,
    );
  }, [company, isOpen, reset]);

  const onSubmit = async (data) => {
    try {
      const response = isEdit
        ? await updateCompany({
            id: company.id,
            rowVersion: company.rowVersion,
            ...data,
          }).unwrap()
        : await createCompany(data).unwrap();

      toast.success(
        isEdit ? t("تم تحديث بيانات الشركة") : t("تم إضافة الشركة بنجاح"),
      );

      const savedCompany = response?.data ?? response;
      onSaved?.(savedCompany);
      onClose();
    } catch (err) {
      const message =
        err?.status === 409
          ? t("السجل التجاري أو الرقم الضريبي مستخدم بالفعل")
          : t("تعذر الحفظ، حاول مرة أخرى");
      toast.error(message);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? t("تعديل بيانات الشركة") : t("إضافة شركة جديدة")}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label={t("اسم الشركة")}
          {...register("name")}
          error={errors.name?.message}
        />

        <Input
          label={t("العنوان")}
          {...register("address")}
          error={errors.address?.message}
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label={t("السجل التجاري")}
            {...register("commercialRegister")}
            error={errors.commercialRegister?.message}
          />
          <Input
            label={t("الرقم الضريبي")}
            {...register("taxNumber")}
            error={errors.taxNumber?.message}
          />
        </div>

        <Input
          label={t("اسم المدير المسؤول")}
          {...register("managerName")}
          error={errors.managerName?.message}
        />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block mb-1.5 text-sm font-medium text-ink-900">
              {t("نمط فحص رصيد المخزون")}
            </label>
            <select
              {...register("stockBalanceCheckMode")}
              className="w-full rounded-xl border border-ink-400/15 px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:border-primary-500"
            >
              {STOCK_MODES.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block mb-1.5 text-sm font-medium text-ink-900">
              {t("العملة الأساسية")}
            </label>
            <select
              {...register("baseCurrency")}
              className="w-full rounded-xl border border-ink-400/15 px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:border-primary-500"
            >
              {CURRENCIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? t("جاري الحفظ...") : isEdit ? t("حفظ التعديلات") : t("إضافة")}
        </Button>
      </form>
    </Modal>
  );
}
