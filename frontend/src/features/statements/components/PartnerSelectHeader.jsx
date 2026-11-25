import { memo, useCallback, useMemo, useState } from "react";
import { Boxes, RefreshCw, UserPlus } from "lucide-react";
import { Link } from "react-router-dom";
import CompactSelect from "../../../shared/components/ui/CompactSelect";
import { useGetPartiesSelectQuery } from "../../../features/partners/partiesApi";
import PartnerSetupWizard from "../../../features/partners/components/PartnerSetupWizard";
import { Printer } from "lucide-react";
import Button from "../../../shared/components/ui/Button";
import { t } from "../../../i18n";
import { getDir } from "../../../i18n";
const CURRENCY_LABELS = {
  EGP: t("جنيه مصري"),
  USD: t("دولار أمريكي"),
  EUR: t("يورو"),
  GBP: t("جنيه إسترليني"),
  SAR: t("ريال سعودي"),
  AED: t("درهم إماراتي"),
  KWD: t("دينار كويتي"),
};

function PartnerSelectHeader({
  partnerId,
  onChange,
  onPrint,
  printDisabled = false,
}) {
  const [showAdd, setShowAdd] = useState(false);

  const {
    data: parties = [],
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useGetPartiesSelectQuery();

  const normalizedId = useMemo(
    () => (partnerId ? String(partnerId) : ""),
    [partnerId],
  );

  const options = useMemo(() => {
    return parties
      .filter(
        (party) =>
          party?.id !== undefined &&
          party?.id !== null &&
          String(party?.name || "").trim(),
      )
      .map((party) => {
        const name = String(party.name).trim();
        const currency = String(party?.currency || "EGP").toUpperCase();
        const currencyLabel = CURRENCY_LABELS[currency] || currency;
        const typeLabel = party?.special ? t("خاص") : t("عام");

        return {
          value: String(party.id),
          label: `${name}  •  ${currencyLabel}  •  ${typeLabel}`,
        };
      });
  }, [parties]);

  const handleChange = useCallback(
    (value) => {
      const nextId = value === undefined || value === null ? "" : String(value);

      onChange(nextId);
    },
    [onChange],
  );

  const handleCreated = useCallback(
    (newParty) => {
      if (!newParty?.id) {
        return;
      }

      onChange(String(newParty.id));
      setShowAdd(false);
    },
    [onChange],
  );

  const isBusy = isLoading || isFetching;

  return (
    <>
      <div
        dir={getDir()}
        className="overflow-hidden rounded-2xl border border-ink-400/10 bg-white shadow-card"
      >
        <div className="flex items-center justify-between border-b border-ink-400/[0.07] px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-500/5">
              <UserPlus
                size={17}
                className="text-primary-500"
                strokeWidth={1.8}
              />
            </div>

            <div>
              <p className="text-sm font-semibold text-ink-900">
                {t("العميل / المورد")}
              </p>

              <p className="mt-0.5 text-[11px] text-ink-400">
                {t("اختر الطرف لعرض حسابه")}
              </p>
            </div>
          </div>

          {isError && (
            <button
              type="button"
              onClick={refetch}
              disabled={isFetching}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-500 transition-all hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
            >
              <RefreshCw
                size={13}
                className={isFetching ? "animate-spin" : ""}
              />
              {t("إعادة المحاولة")}
            </button>
          )}
        </div>

        <div className="p-4">
          {isError ? (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-red-100 bg-red-50/70 px-3.5 py-3">
              <div>
                <p className="text-sm font-medium error-text">
                  {t("تعذر تحميل العملاء والموردين")}
                </p>

                <p className="mt-0.5 text-xs error-text/80">
                  {t("تحقق من الاتصال وحاول مرة أخرى")}
                </p>
              </div>

              <button
                type="button"
                onClick={refetch}
                disabled={isFetching}
                className="shrink-0 rounded-lg bg-white px-3 py-2 text-xs font-medium text-red-600 shadow-sm transition hover:bg-red-100 disabled:opacity-50"
              >
                {isFetching ? t("جاري المحاولة...") : t("إعادة المحاولة")}
              </button>
            </div>
          ) : (
            <div className="flex items-end gap-2">
              <div className="min-w-0 flex-1">
                <CompactSelect
                  options={options}
                  value={normalizedId}
                  onChange={handleChange}
                  isLoading={isBusy}
                  isSearchable
                  placeholder={
                    isLoading
                      ? t("جاري تحميل العملاء والموردين...")
                      : options.length > 0
                        ? t("ابحث باسم العميل أو المورد")
                        : t("لا توجد أطراف متاحة")
                  }
                  searchPlaceholder={t("ابحث باسم العميل أو المورد...")}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={onPrint}
                disabled={printDisabled}
                className="h-10 shrink-0"
                title={t("طباعة كشف الحساب")}
              >
                <Printer size={16} />
                <span className="hidden sm:inline">{t("طباعة")}</span>
              </Button>
              <button
                type="button"
                onClick={() => setShowAdd(true)}
                disabled={isBusy}
                className="flex h-[38px] w-[40px] shrink-0 items-center justify-center rounded-lg border border-ink-400/15 text-primary-500 transition-all duration-200 hover:border-primary-500/30 hover:bg-primary-500/5 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                title={t("إضافة عميل أو مورد")}
                aria-label={t("إضافة عميل أو مورد")}
              >
                <UserPlus size={18} strokeWidth={1.8} />
              </button>

              <Link
                to={
                  normalizedId
                    ? `/dashboard/stores/containers/${normalizedId}`
                    : "#"
                }
                onClick={(event) => {
                  if (!normalizedId) {
                    event.preventDefault();
                  }
                }}
                className={[
                  "flex h-[38px] w-[40px] shrink-0",
                  "items-center justify-center",
                  "rounded-lg border",
                  "transition-all duration-200",
                  normalizedId
                    ? "border-gold-500/20 text-gold-600 hover:bg-gold-500/5 active:scale-95"
                    : "pointer-events-none border-ink-400/10 text-ink-300 opacity-50",
                ].join(" ")}
                title={
                  normalizedId ? t("فتح مخزن العبوات") : t("اختر عميل أو مورد أولاً")
                }
                aria-label={t("مخزن العبوات")}
              >
                <Boxes size={18} strokeWidth={1.8} />
              </Link>
            </div>
          )}
        </div>

        {!isError && options.length > 0 && (
          <div className="flex items-center justify-between border-t border-ink-400/[0.07] bg-ink-400/[0.015] px-4 py-2">
            <span className="text-[11px] text-ink-400">
              {options.length} {t("طرف متاح")}
            </span>

            <span className="text-[11px] text-ink-400">{t("اكتب للبحث السريع")}</span>
          </div>
        )}
      </div>

      <PartnerSetupWizard
        isOpen={showAdd}
        onClose={() => setShowAdd(false)}
        onCreated={handleCreated}
      />
    </>
  );
}

export default memo(PartnerSelectHeader);
