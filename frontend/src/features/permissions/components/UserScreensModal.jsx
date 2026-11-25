import { useEffect, useMemo, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import Modal from "../../../shared/components/ui/Modal";
import Button from "../../../shared/components/ui/Button";
import { getScreenOptions } from "../../screenAccess/screenList";
import {
  useGetUserScreenAccessQuery,
  useSetUserScreenAccessMutation,
} from "../../screenAccess/screenAccessApi";

import { t } from "../../../i18n";
/** الأدمن يحدد الشاشات اللي تظهر للمستخدم (المحدد = ظاهر). */
export default function UserScreensModal({ isOpen, onClose, user }) {
  const userId = user?.id;
  const options = useMemo(() => getScreenOptions(), []);
  const { data, isLoading } = useGetUserScreenAccessQuery(userId, {
    skip: !isOpen || !userId,
  });
  const [save, { isLoading: saving }] = useSetUserScreenAccessMutation();
  const [hidden, setHidden] = useState([]);

  useEffect(() => {
    setHidden(data?.hiddenScreens || []);
  }, [data, userId]);

  const toggle = (path) =>
    setHidden((prev) =>
      prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path],
    );

  const handleSave = async () => {
    try {
      await save({ userId, hiddenScreens: hidden }).unwrap();
      toast.success(t("تم حفظ الشاشات"));
      onClose();
    } catch {
      toast.error(t("تعذر حفظ الشاشات"));
    }
  };

  const isAdminUser = user?.roles?.some(
    (r) => String(r).toLowerCase() === "admin",
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t("الشاشات الظاهرة لـ {0}", { 0: user?.userName || "" })}
    >
      {isLoading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="animate-spin" size={18} />
        </div>
      ) : (
        <div className="space-y-3">
          {isAdminUser && (
            <p className="text-sm text-ink-500">
              {t("الأدمن بيشوف كل الشاشات دايمًا ومش بتتأثر بالاختيارات دي.")}
            </p>
          )}
          <div className="max-h-96 space-y-1 overflow-y-auto">
            {options.map((o) => (
              <label
                key={o.path}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-primary-50"
              >
                <input
                  type="checkbox"
                  checked={!hidden.includes(o.path)}
                  onChange={() => toggle(o.path)}
                />
                <span>{o.label}</span>
                {o.group && (
                  <span className="text-xs text-ink-400">({o.group})</span>
                )}
              </label>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <Button onClick={handleSave} disabled={saving}>
              <Save size={14} /> {t("حفظ")}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
