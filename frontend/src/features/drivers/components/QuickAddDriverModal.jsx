import { useEffect, useState } from "react";
import { toast } from "sonner";
import Modal from "../../../shared/components/ui/Modal";
import Input from "../../../shared/components/ui/Input";
import Button from "../../../shared/components/ui/Button";
import {
  useCreateDriverMutation,
  useUpdateDriverMutation,
} from "../driversApi";

import { t } from "../../../i18n";
const emptyForm = {
  name: "",
  phoneNumber: "",
  nationalId: "",
  licenseNumber: "",
  licenseExpiryDate: "",
  isActive: true,
};

/**
 * @param {{
 *   isOpen: boolean,
 *   onClose: () => void,
 *   onSaved?: (driver: Object) => void,
 *   driver?: Object | null
 * }} props
 */
export default function QuickAddDriverModal({
  isOpen,
  onClose,
  onSaved,
  driver = null,
}) {
  const isEdit = Boolean(driver);

  const [form, setForm] = useState(emptyForm);

  const [createDriver, { isLoading: isCreating }] = useCreateDriverMutation();

  const [updateDriver, { isLoading: isUpdating }] = useUpdateDriverMutation();

  const isLoading = isCreating || isUpdating;

  useEffect(() => {
    if (!isOpen) return;

    setForm(
      driver
        ? {
            name: driver.name ?? "",
            phoneNumber: driver.phoneNumber ?? "",
            nationalId: driver.nationalId ?? "",
            licenseNumber: driver.licenseNumber ?? "",
            licenseExpiryDate: driver.licenseExpiryDate ?? "",
            isActive: driver.isActive ?? true,
          }
        : { ...emptyForm },
    );
  }, [driver, isOpen]);

  const handleChange = (key) => (e) => {
    const value =
      e.target.type === "checkbox" ? e.target.checked : e.target.value;

    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isLoading) return;

    try {
      const saved = isEdit
        ? await updateDriver({
            id: driver.id,
            ...form,
          }).unwrap()
        : await createDriver(form).unwrap();

      toast.success(
        isEdit ? t("تم تحديث بيانات السائق") : t("تم إضافة السائق بنجاح"),
      );

      // مهم:
      // الأب يستخدم onSaved وليس onCreated
      onSaved?.(saved);

      onClose();
    } catch {}
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? t("تعديل بيانات السائق") : t("إضافة سائق جديد")}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label={t("اسم السائق")}
          value={form.name}
          onChange={handleChange("name")}
          disabled={isLoading}
        />

        <Input
          label={t("رقم الهاتف")}
          value={form.phoneNumber}
          onChange={handleChange("phoneNumber")}
          disabled={isLoading}
        />

        <Input
          label={t("الرقم القومي")}
          value={form.nationalId}
          onChange={handleChange("nationalId")}
          disabled={isLoading}
        />

        <Input
          label={t("رقم الرخصة")}
          value={form.licenseNumber}
          onChange={handleChange("licenseNumber")}
          disabled={isLoading}
        />

        <Input
          label={t("تاريخ انتهاء الرخصة")}
          type="date"
          value={form.licenseExpiryDate}
          onChange={handleChange("licenseExpiryDate")}
          disabled={isLoading}
        />

        {isEdit && (
          <label className="flex items-center gap-2 text-sm text-ink-700">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={handleChange("isActive")}
              disabled={isLoading}
              className="rounded border-ink-400/30"
            />
            {t("نشط")}
          </label>
        )}

        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? t("جاري الحفظ...") : isEdit ? t("حفظ التعديلات") : t("إضافة")}
        </Button>
      </form>
    </Modal>
  );
}
