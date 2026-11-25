import { t } from "../../../i18n";
import { getDir } from "../../../i18n";
function Field({ label, value }) {
  return (
    <div>
      <p className="mb-1 text-xs text-ink-500">{label}</p>
      <p className="text-sm font-medium text-ink-900">
        {(value ?? value === 0) ? value : "—"}
      </p>
    </div>
  );
}

export default function StoreOverviewTab({ store }) {
  if (!store) return null;

  return (
    <div dir={getDir()} className="rounded-2xl bg-white p-6 shadow-card">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Field label={t("اسم المخزن")} value={store.name} />

        <Field label={t("كود المخزن")} value={store.code} />

        <Field
          label={t("نوع المخزن")}
          value={store.isContainerStore ? t("مخزن عبوات") : t("مخزن اصناف")}
        />

        <Field label={t("العنوان")} value={store.address} />

        <Field label={t("الحالة")} value={store.isActive ? t("نشط") : t("غير نشط")} />

        {store.isContainerStore && (
          <Field label={t("العميل / المورد")} value={store.businessPartnerName} />
        )}
      </div>
    </div>
  );
}
