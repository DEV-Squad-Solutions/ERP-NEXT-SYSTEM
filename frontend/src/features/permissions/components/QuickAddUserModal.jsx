// src/features/permissions/components/QuickAddUserModal.jsx
import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import Modal from "../../../shared/components/ui/Modal";
import Input from "../../../shared/components/ui/Input";
import Button from "../../../shared/components/ui/Button";
import {
  useCreateUserMutation,
  useUpdateUserMutation,
  useGetRolesQuery,
} from "../usersApi";
import { useGetCompaniesForSelectQuery } from "../companiesApi";

import { t } from "../../../i18n";
const baseShape = {
  userName: z.string().min(1, t("اسم المستخدم مطلوب")).max(256),
  email: z.string().min(1, t("الإيميل مطلوب")).email(t("إيميل غير صحيح")).max(256),
  firstName: z.string().min(1, t("الاسم الأول مطلوب")).max(100),
  lastName: z.string().min(1, t("اسم العائلة مطلوب")).max(100),
  phoneNumber: z.string().optional().or(z.literal("")),
  roles: z.array(z.string()).min(1, t("اختر دور واحد على الأقل")),
  companyIds: z.array(z.number()).min(1, t("اختر شركة واحدة على الأقل")),
};

const createSchema = z.object({
  ...baseShape,
  password: z.string().min(8, t("8 أحرف على الأقل")).max(128),
});
const editSchema = z.object(baseShape);

const emptyValues = {
  userName: "",
  email: "",
  firstName: "",
  lastName: "",
  phoneNumber: "",
  roles: [],
  companyIds: [],
  password: "",
};

/**
 * @param {{
 *   isOpen: boolean,
 *   onClose: () => void,
 *   onSaved?: (user: Object) => void,
 *   user?: Object | null
 * }} props
 */
export default function QuickAddUserModal({
  isOpen,
  onClose,
  onSaved,
  user = null,
}) {
  const isEdit = Boolean(user);
  const { data: roles } = useGetRolesQuery();
  const { data: companies } = useGetCompaniesForSelectQuery();
  const [createUser, { isLoading: isCreating }] = useCreateUserMutation();
  const [updateUser, { isLoading: isUpdating }] = useUpdateUserMutation();
  const isLoading = isCreating || isUpdating;

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(isEdit ? editSchema : createSchema),
    defaultValues: emptyValues,
  });

  useEffect(() => {
    if (!isOpen) return;
    reset(
      user
        ? {
            userName: user.userName ?? "",
            email: user.email ?? "",
            firstName: user.firstName ?? "",
            lastName: user.lastName ?? "",
            phoneNumber: user.phoneNumber ?? "",
            roles: user.roles ?? [],
            companyIds: user.companies?.map((c) => c.id) ?? [],
            password: "",
          }
        : emptyValues,
    );
  }, [user, isOpen, reset]);

  const onSubmit = async (data) => {
    try {
      const response = isEdit
        ? await updateUser({
            id: user.id,
            ...data,
            password: undefined,
          }).unwrap()
        : await createUser(data).unwrap();

      toast.success(
        isEdit ? t("تم تحديث بيانات المستخدم") : t("تم إضافة المستخدم بنجاح"),
      );

      const savedUser = response?.data ?? response;
      onSaved?.(savedUser);
      onClose();
    } catch (err) {
      const message =
        err?.status === 409
          ? t("اسم المستخدم أو الإيميل مستخدم بالفعل")
          : t("تعذر الحفظ، حاول مرة أخرى");
      toast.error(message);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? t("تعديل مستخدم") : t("إضافة مستخدم جديد")}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input
            label={t("الاسم الأول")}
            {...register("firstName")}
            error={errors.firstName?.message}
          />
          <Input
            label={t("اسم العائلة")}
            {...register("lastName")}
            error={errors.lastName?.message}
          />
        </div>

        <Input
          label={t("اسم المستخدم")}
          disabled={isEdit}
          {...register("userName")}
          error={errors.userName?.message}
        />

        <Input
          label={t("الإيميل")}
          {...register("email")}
          error={errors.email?.message}
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label={t("رقم الهاتف")}
            {...register("phoneNumber")}
            error={errors.phoneNumber?.message}
          />
          {!isEdit && (
            <Input
              label={t("كلمة المرور")}
              type="password"
              {...register("password")}
              error={errors.password?.message}
            />
          )}
        </div>

        <div>
          <label className="block mb-1.5 text-sm font-medium text-ink-900">
            {t("الأدوار (الصلاحيات)")}
          </label>
          <Controller
            name="roles"
            control={control}
            render={({ field }) => (
              <div className="flex flex-wrap gap-2">
                {(roles ?? []).map((role) => {
                  const checked = field.value?.includes(role);
                  return (
                    <button
                      type="button"
                      key={role}
                      onClick={() =>
                        field.onChange(
                          checked
                            ? field.value.filter((r) => r !== role)
                            : [...field.value, role],
                        )
                      }
                      className={`px-3 py-1.5 rounded-xl text-sm border transition-colors ${
                        checked
                          ? "bg-primary-500 text-white border-primary-500"
                          : "border-ink-400/15 text-ink-700 bg-white"
                      }`}
                    >
                      {role}
                    </button>
                  );
                })}
              </div>
            )}
          />
          {errors.roles?.message && (
            <p className="field-error">{errors.roles.message}</p>
          )}
        </div>

        <div>
          <label className="block mb-1.5 text-sm font-medium text-ink-900">
            {t("الشركات المتاحة له")}
          </label>
          <Controller
            name="companyIds"
            control={control}
            render={({ field }) => (
              <div className="flex flex-wrap gap-2">
                {(companies ?? []).map((c) => {
                  const checked = field.value?.includes(c.id);
                  return (
                    <button
                      type="button"
                      key={c.id}
                      onClick={() =>
                        field.onChange(
                          checked
                            ? field.value.filter((id) => id !== c.id)
                            : [...field.value, c.id],
                        )
                      }
                      className={`px-3 py-1.5 rounded-xl text-sm border transition-colors ${
                        checked
                          ? "bg-primary-500 text-white border-primary-500"
                          : "border-ink-400/15 text-ink-700 bg-white"
                      }`}
                    >
                      {c.name}
                    </button>
                  );
                })}
              </div>
            )}
          />
          {errors.companyIds?.message && (
            <p className="field-error">
              {errors.companyIds.message}
            </p>
          )}
        </div>

        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? t("جاري الحفظ...") : isEdit ? t("حفظ التعديلات") : t("إضافة")}
        </Button>
      </form>
    </Modal>
  );
}
