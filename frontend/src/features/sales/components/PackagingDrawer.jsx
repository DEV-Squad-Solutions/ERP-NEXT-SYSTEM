import { useState, useEffect } from "react";
import { X, Save, Loader2, Package } from "lucide-react";
import { useGetPartyContainerStoreQuery } from "../../partners/partiesApi";
import Button from "../../../shared/components/ui/Button";
import Modal from "../../../shared/components/ui/Modal";

import { t } from "../../../i18n";
export default function PackagingDrawer({
  partyId,
  partyName,
  isOpen,
  onClose,
  initialItems = [], // [{ containerId, issuedQuantity, receivedQuantity }]
  onSave, // (payload) => void
}) {
  const { data, isLoading, isError } = useGetPartyContainerStoreQuery(partyId, {
    skip: !partyId || !isOpen,
  });

  const containerStore = data?.containerStore;
  const containers = data?.containers || [];

  const [rows, setRows] = useState({});

  useEffect(() => {
    if (containers.length > 0) {
      const initial = {};
      containers.forEach((c) => {
        const existing = initialItems.find((i) => i.containerId === c.id);
        initial[c.id] = {
          issued: existing?.issuedQuantity ?? 0,
          received: existing?.receivedQuantity ?? 0,
        };
      });
      setRows(initial);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, isOpen]);

  const setRowValue = (containerId, field, value) =>
    setRows((prev) => ({
      ...prev,
      [containerId]: { ...prev[containerId], [field]: Number(value) || 0 },
    }));

  const handleSave = () => {
    const items = Object.entries(rows)
      .filter(([, v]) => v.issued > 0 || v.received > 0)
      .map(([containerId, v]) => ({
        containerId: Number(containerId),
        issuedQuantity: v.issued,
        receivedQuantity: v.received,
      }));

    onSave?.({
      containerStoreId: containerStore?.id || null,
      items,
    });

    onClose?.();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t("عبوات {0}", { 0: partyName || "" })}
      size="lg"
    >
      {isLoading && (
        <div className="flex items-center justify-center py-10 text-ink-400">
          <Loader2 size={20} className="animate-spin ml-2" />
          {t("جاري تحميل بيانات العبوات...")}
        </div>
      )}

      {isError && !isLoading && (
        <div className="text-center py-6 text-sm text-negative border border-dashed border-negative/30 rounded-xl">
          {t("تعذر تحميل بيانات العبوات لهذا العميل")}
        </div>
      )}

      {!isLoading && !isError && data && (
        <div className="space-y-4">
          <div className="flex items-stretch rounded-xl overflow-hidden border border-ink-400/10">
            <div className="w-36 shrink-0 bg-ink-900/[0.03] px-3 py-2.5 text-sm font-medium text-ink-900 flex items-center border-l border-ink-400/10">
              {t("مخزن الحاويات")}
            </div>
            <div className="flex-1 px-3 py-2.5 text-sm flex items-center gap-2">
              <Package size={15} className="text-primary-500" />
              {containerStore?.name || t("لا يوجد مخزن عبوات مرتبط")}
            </div>
          </div>

          {containers.length === 0 ? (
            <div className="text-center py-6 text-sm text-ink-400 border border-dashed border-ink-400/20 rounded-xl">
              {t("لا توجد عبوات مرتبطة بهذا العميل")}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-ink-400/10">
              <table className="w-full text-right border-collapse min-w-[560px]">
                <thead>
                  <tr className="bg-ink-900/[0.03] text-ink-400 text-xs">
                    <th className="p-2.5 font-medium">{t("الكود")}</th>
                    <th className="p-2.5 font-medium">{t("اسم العبوة")}</th>
                    <th className="p-2.5 font-medium">{t("الحالة")}</th>
                    <th className="p-2.5 font-medium">{t("وارد")}</th>
                    <th className="p-2.5 font-medium">{t("صادر")}</th>
                  </tr>
                </thead>
                <tbody>
                  {containers.map((c) => (
                    <tr key={c.id} className="border-t border-ink-400/10">
                      <td className="p-2 text-xs num text-ink-400">{c.code}</td>
                      <td className="p-2 text-sm">{c.name}</td>
                      <td className="p-2">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            c.isAssigned
                              ? "bg-primary-50 text-primary-600"
                              : "bg-ink-400/10 text-ink-400"
                          }`}
                        >
                          {c.isAssigned ? t("مخصصة") : t("غير مخصصة")}
                        </span>
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          min="0"
                          value={rows[c.id]?.received ?? 0}
                          onChange={(e) =>
                            setRowValue(c.id, "received", e.target.value)
                          }
                          className="w-20 px-2 py-1 text-sm num border border-ink-400/15 rounded-lg outline-none focus:border-primary-400"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          min="0"
                          value={rows[c.id]?.issued ?? 0}
                          onChange={(e) =>
                            setRowValue(c.id, "issued", e.target.value)
                          }
                          className="w-20 px-2 py-1 text-sm num border border-ink-400/15 rounded-lg outline-none focus:border-primary-400"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button onClick={handleSave} className="flex-1">
              <Save size={16} />
              {t("تأكيد بيانات العبوات")}
            </Button>
            <Button variant="ghost" onClick={onClose} type="button">
              <X size={16} />
              {t("إغلاق")}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
