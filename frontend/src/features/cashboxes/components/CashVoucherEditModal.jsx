import { useSelector } from "react-redux";
import { selectSelectedFiscalYear } from "../../fiscalYears/fiscalYearSlice";
import { getFiscalYearDateWarning } from "../../../lib/fiscalYearDateRange";
import { todayInCairo } from "../../../lib/date";
import { round2 } from "../../../lib/number";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import Modal from "../../../shared/components/ui/Modal";
import Input from "../../../shared/components/ui/Input";
import Button from "../../../shared/components/ui/Button";
import InvoiceNumberLink from "../../../shared/components/InvoiceNumberLink";
import { formatDate } from "../../../lib/date.js";

import { useGetCashVoucherPartySelectQuery } from "../cashVouchersApi";
import { useGetPartyByIdQuery } from "../../partners/partiesApi";
import { useLazyResolveExchangeRateQuery } from "../../exchange-rates/exchangeRatesApi";

import {
  buildDescriptionGroups,
  getCurrentDescriptionValue,
  buildPostingTargetPayload,
} from "../utils/descriptionGroups";

import DescriptionCascadeSelect from "./DescriptionCascadeSelect";

import { t } from "../../../i18n";
import { getLocale } from "../../../i18n";
const schema = z.object({
  voucherDate: z.string().min(1, t("التاريخ مطلوب")),

  direction: z.enum(["Receipt", "Payment"]),

  // التوصيف اختياري في الفرونت — لو المستخدم مختارش بنستخدم التوصيف
  // المحفوظ على السند (لو موجود) أو نسيب الباك يقرر.
  descriptionValue: z.string().optional(),

  amount: z
    .string()
    .min(1, t("المبلغ مطلوب"))
    .refine((value) => Number(value) > 0, t("المبلغ يجب أن يكون أكبر من صفر")),

  exchangeRate: z.string().optional(),

  // سعر عملة الشريك مقابل العملة الأساسية — للسندات اللي الخزنة فيها
  // بعملة مختلفة عن عملة حساب الشريك. اختياري: لو اتساب فاضي
  // السيرفر بيحل سعر مناسب تلقائيًا.
  partnerExchangeRate: z.string().optional(),

  referenceNumber: z.string().optional(),

  description: z.string().optional(),

  notes: z.string().optional(),
});

/**
 * تعديل كامل لسند خزنة قائم.
 *
 * API:
 * PUT /CashVouchers/{id}
 *
 * التوصيف (هدف الترحيل) مش إلزامي في الفرونت:
 * - لو المستخدم اختار توصيف، بنبعت التوصيف المختار.
 * - لو مختارش، بنبعت التوصيف المحفوظ على السند (لو موجود).
 * - الـ API نفسه بيطلب توصيف واحد بالظبط على PUT، فلو مفيش
 *   توصيف خالص الباك هو اللي بيرفض.
 *
 * يتم استخدام نفس DescriptionCascadeSelect
 * ونفس buildPostingTargetPayload لضمان توحيد
 * منطق هدف الترحيل.
 *
 * سعر الصرف:
 * لو العملة أجنبية (isForeign)، بيتحمّل تلقائيًا من
 * GET /ExchangeRates/resolve?currency=&date= كل ما تاريخ
 * السند يتغير، ويتعرض في خانة قابلة للتعديل. لو المستخدم
 * غيّره يدويًا مش بيتلمس تاني لنفس التاريخ.
 */
export default function CashVoucherEditModal({
  isOpen,
  onClose,
  onSave,
  voucher,
  isForeign,
  currency,
  baseCurrency,
  // المستخدم العادي يوصّف الحركة مرة واحدة بس. لما canDescribe=false
  // (السند موصّف بالفعل ومش أدمن/محاسب) بنقفل خانة التوصيف وبنسمح
  // بتعديل بيانات الحركة فقط.
  canDescribe = true,
  // الأدمن/المحاسب يقدر يعدّل سندًا مرحّلًا (بعد التوصيف) عادي،
  // والتعديل بيعيد مزامنة القيد المحاسبي المرتبط.
  canEditPosted = false,
}) {
  const selectedFiscalYear = useSelector(selectSelectedFiscalYear);
  const [saving, setSaving] = useState(false);
  // جسم الترحيل الجاهز (بيتحدد بعد ما الفورم يتحقق) قبل تأكيد المستخدم.
  const [pendingPost, setPendingPost] = useState(null);

  const { data: partySelect, isFetching: isLoadingPartySelect } =
    useGetCashVoucherPartySelectQuery(undefined, {
      skip: !isOpen,
    });

  const [resolveExchangeRate, { isFetching: isResolvingRate }] =
    useLazyResolveExchangeRateQuery();

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),

    defaultValues: {
      voucherDate: todayInCairo(),
      direction: "Payment",
      descriptionValue: "",
      amount: "",
      exchangeRate: "",
      partnerExchangeRate: "",
      referenceNumber: "",
      description: "",
      notes: "",
    },
  });

  const direction = watch("direction");
  const voucherDate = watch("voucherDate");
  const descriptionValue = watch("descriptionValue");

  const groups = useMemo(
    () =>
      buildDescriptionGroups(partySelect, {
        direction,
      }),
    [partySelect, direction],
  );

  // الشريك المختار في التوصيف (لو التوصيف شريك). بنحتاج نعرف عملة
  // حسابه عشان نعرض حقل سعر تسوية الشريك لو مختلفة عن عملة الخزنة.
  const selectedPartnerId = useMemo(() => {
    const option = groups
      .flatMap((group) => group.options)
      .find((item) => item.value === descriptionValue);

    return option?.meta?.businessPartnerId ?? null;
  }, [groups, descriptionValue]);

  const { data: selectedPartner } = useGetPartyByIdQuery(selectedPartnerId, {
    skip: !isOpen || !selectedPartnerId,
  });

  const partnerCurrency = selectedPartner?.currency;

  // تسوية بعملة مختلفة: الخزنة بعملة، وحساب الشريك بعملة تانية.
  const isCrossCurrencyPartner =
    Boolean(selectedPartnerId) &&
    Boolean(partnerCurrency) &&
    Boolean(currency) &&
    partnerCurrency !== currency;

  /**
   * تعبئة البيانات عند فتح المودال
   * أو تغيير السند المحدد.
   */
  useEffect(() => {
    if (!isOpen || !voucher) return;

    setPendingPost(null);

    reset({
      voucherDate: voucher.voucherDate?.slice(0, 10) || "",

      direction: voucher.direction || "Payment",

      descriptionValue: getCurrentDescriptionValue(voucher),

      amount: String(voucher.amount ?? ""),

      exchangeRate:
        voucher.exchangeRate != null ? String(voucher.exchangeRate) : "",

      partnerExchangeRate:
        voucher.partnerExchangeRate != null
          ? String(voucher.partnerExchangeRate)
          : "",

      referenceNumber: voucher.referenceNumber || "",

      description: voucher.description || "",

      notes: voucher.notes || "",
    });
  }, [isOpen, voucher, reset]);

  /**
   * جلب سعر الصرف تلقائيًا كل ما تاريخ السند يتغير —
   * بس لو عملة أجنبية. القيمة الأصلية المحفوظة على السند (لو
   * موجودة ولسه على نفس التاريخ) بتتفضل زي ما هي، ومتتلمسش لو
   * المستخدم عدّل الخانة يدويًا لنفس التاريخ.
   */
  const lastResolvedKeyRef = useRef(null);

  useEffect(() => {
    if (!isOpen || !isForeign || !currency || !voucherDate) return;

    const key = `${currency}|${voucherDate}`;

    // نفس المفتاح اللي اتحمّل بيه آخر مرة — متعملش نداء تاني
    if (lastResolvedKeyRef.current === key) return;

    resolveExchangeRate({ currency, date: voucherDate })
      .unwrap()
      .then((res) => {
        lastResolvedKeyRef.current = key;

        if (res?.rate != null) {
          setValue("exchangeRate", String(round2(res.rate)), {
            shouldValidate: false,
          });
        }
      })
      .catch(() => {
        // مفيش سعر متاح لنفس العملة والتاريخ ده — سيب الخانة
        // زي ما هي عشان المستخدم يدخلها يدويًا
        lastResolvedKeyRef.current = key;
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isForeign, currency, voucherDate]);

  if (!isOpen || !voucher) {
    return null;
  }

  const isInvoiceGenerated = Boolean(voucher.invoiceId);
  const isDraft = Boolean(voucher.isDraft);
  const isPostedEditable = !isDraft && canEditPosted;

  function validateDate(values) {
    const fiscalYearWarning = [values.voucherDate]
      .map((value) => getFiscalYearDateWarning(value, selectedFiscalYear))
      .find(Boolean);

    if (fiscalYearWarning) {
      toast.error(fiscalYearWarning);
      return false;
    }

    return true;
  }

  // حفظ المسودة: بيانات تشغيلية فقط بدون أي هدف ترحيل أو أثر محاسبي.
  async function submitDraft(values) {
    if (!validateDate(values)) {
      return;
    }

    const payload = {
      voucherDate: values.voucherDate,
      direction: values.direction,
      amount: Number(values.amount),
      referenceNumber: values.referenceNumber || undefined,
      description: values.description || undefined,
      notes: values.notes || undefined,
    };

    if (isForeign) {
      payload.exchangeRate = values.exchangeRate
        ? Number(values.exchangeRate)
        : undefined;
    }

    setSaving(true);

    try {
      await onSave(payload, "draft");
    } finally {
      setSaving(false);
    }
  }

  // تجهيز جسم التوصيف والترحيل، ثم عرض تأكيد صريح قبل التنفيذ.
  function submitPost(values) {
    if (!validateDate(values)) {
      return;
    }

    // التوصيف مقفول على المستخدم (سند موصّف ومش أدمن/محاسب): بنتجاهل
    // أي توصيف مختار وبنستخدم التوصيف المحفوظ على السند (لو موجود).
    const selectedOption = canDescribe
      ? groups
          .flatMap((group) => group.options)
          .find((option) => option.value === values.descriptionValue)
      : null;

    // لو المستخدم مختارش توصيف، بنستخدم التوصيف المحفوظ على السند (لو
    // موجود) عشان تعديل المبلغ/سعر الصرف ميفرضش إعادة اختيار التوصيف.
    const target = selectedOption
      ? buildPostingTargetPayload(selectedOption.meta, {
          driverTripId: voucher.driverTripId,
        })
      : {
          businessPartnerId: voucher.businessPartnerId ?? null,
          driverId: voucher.driverId ?? null,
          driverTripId: voucher.driverTripId ?? null,
          employeeId: voucher.employeeId ?? null,
          accountId: voucher.accountId ?? null,
          externalPartyName: voucher.externalPartyName ?? undefined,
        };

    const payload = {
      voucherDate: values.voucherDate,

      direction: values.direction,

      amount: Number(values.amount),

      ...target,

      referenceNumber: values.referenceNumber || undefined,

      description: values.description || undefined,

      notes: values.notes || undefined,
    };

    if (isForeign) {
      payload.exchangeRate = values.exchangeRate
        ? Number(values.exchangeRate)
        : undefined;
    }

    // تسوية الشركاء بعملة مختلفة: بنرسل سعر الشريك فقط لو العملتين
    // مختلفتين. لو اتساب فاضي السيرفر بيحل السعر بنفسه.
    if (isCrossCurrencyPartner) {
      payload.partnerExchangeRate = values.partnerExchangeRate
        ? Number(values.partnerExchangeRate)
        : undefined;
    }

    setPendingPost(payload);
  }

  async function confirmPost() {
    if (!pendingPost) {
      return;
    }

    setSaving(true);

    try {
      await onSave(pendingPost, "post");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        isDraft
          ? t("تعديل المسودة {0}", { 0: voucher.voucherNumber || "" })
          : isPostedEditable
            ? t("تعديل السند {0}", { 0: voucher.voucherNumber || "" })
            : t("السند {0}", { 0: voucher.voucherNumber || "" })
      }
    >
      {isInvoiceGenerated ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-700">
            {t("هذا السند مولد من فاتورة رقم")}{" "}
            <InvoiceNumberLink
              invoiceId={voucher.invoiceId}
              invoiceType={voucher.invoiceType}
              invoiceNumber={voucher.invoiceNumber}
              number={voucher.invoiceNumber || voucher.invoiceId}
              className="font-semibold"
            />
            {t("، ولا يمكن تعديله من هنا.")}
            <br />
            {t("يمكن تعديله من خلال الفاتورة نفسها.")}
          </div>

          <div className="flex justify-end">
            <Button type="button" variant="outline" onClick={onClose}>
              {t("إغلاق")}
            </Button>
          </div>
        </div>
      ) : !isDraft && !canEditPosted ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-positive/20 bg-positive/5 px-4 py-3 text-sm leading-6 text-ink-700">
            {t("هذا السند مرحّل بالفعل. بياناته وقيده المحاسبي للقراءة فقط، ولا يمكن تعديله أو حذفه.")}
          </div>

          <div className="rounded-xl border border-ink-400/15 bg-ink-400/5 p-3 text-sm leading-6 text-ink-700">
            <div className="flex flex-wrap gap-x-6 gap-y-1">
              <span>
                {t("التاريخ:")}{" "}
                <strong className="num">
                  {formatDate(voucher.voucherDate)}
                </strong>
              </span>
              <span>
                {t("الاتجاه:")}{" "}
                <strong>
                  {voucher.direction === "Receipt" ? t("وارد") : t("صادر")}
                </strong>
              </span>
              <span>
                {t("المبلغ:")}{" "}
                <strong className="num">
                  {Number(voucher.amount ?? 0).toLocaleString(getLocale(), {
                    maximumFractionDigits: 2,
                  })}{" "}
                  {currency}
                </strong>
              </span>
            </div>

            {voucher.description && (
              <div className="mt-2">
                {t("البيان:")} <strong>{voucher.description}</strong>
              </div>
            )}

            {voucher.notes && (
              <div className="mt-1 text-ink-500">{t("ملاحظات:")} {voucher.notes}</div>
            )}
          </div>

          <div className="flex justify-end">
            <Button type="button" variant="outline" onClick={onClose}>
              {t("إغلاق")}
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit(submitPost)} className="space-y-4">
          {isPostedEditable && (
            <div className="rounded-xl border border-gold-200 bg-gold-50 px-4 py-3 text-sm leading-6 text-ink-700">
              {t("هذا السند مرحّل بالفعل. التعديل متاح للأدمن أو المحاسب، وأي حفظ هيتم مزامنته مع القيد المحاسبي ورصيد الخزنة والحركات المرتبطة.")}
            </div>
          )}

          {/* التاريخ + الاتجاه */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              type="date"
              label={t("تاريخ السند")}
                            min={selectedFiscalYear?.startDate}
              max={selectedFiscalYear?.endDate}
              {...register("voucherDate")}
              error={errors.voucherDate?.message}
            />

            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-900">
                {t("الاتجاه")}
              </label>

              <Controller
                control={control}
                name="direction"
                render={({ field }) => (
                  <div className="flex overflow-hidden rounded-lg border border-ink-400/15">
                    <button
                      type="button"
                      onClick={() => field.onChange("Receipt")}
                      className={`flex-1 py-2 text-xs font-medium transition ${
                        field.value === "Receipt"
                          ? "bg-positive/15 text-positive"
                          : "text-ink-400 hover:bg-ink-900/5"
                      }`}
                    >
                      {t("وارد")}
                    </button>

                    <button
                      type="button"
                      onClick={() => field.onChange("Payment")}
                      className={`flex-1 border-r border-ink-400/15 py-2 text-xs font-medium transition ${
                        field.value === "Payment"
                          ? "bg-negative/15 text-negative"
                          : "text-ink-400 hover:bg-ink-900/5"
                      }`}
                    >
                      {t("صادر")}
                    </button>
                  </div>
                )}
              />
            </div>
          </div>

          {/* التوصيف */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-900">
              {t("التوصيف")}
            </label>

            <Controller
              control={control}
              name="descriptionValue"
              render={({ field }) => (
                <DescriptionCascadeSelect
                  groups={groups}
                  value={field.value}
                  onChange={field.onChange}
                  isLoading={isLoadingPartySelect}
                  isDisabled={!canDescribe}
                  placeholder={t("اختر الحساب أو التوصيف")}
                />
              )}
            />

            {errors.descriptionValue && (
              <p className="mt-1 text-xs text-negative">
                {errors.descriptionValue.message}
              </p>
            )}

            <p className="mt-1 text-[11px] leading-5 text-ink-400">
              {!canDescribe
                ? t("السند موصّف بالفعل — التوصيف والتعديل للأدمن أو المحاسب فقط. يمكنك تعديل بيانات الحركة.")
                : voucher?.isDraft
                  ? t("اختر التوصيف ثم استخدم «توصيف وترحيل» لاعتماده، أو «حفظ كمسودة» لتعديل البيانات بدون ترحيل.")
                  : t("السند مرحّل — أي تعديل هيتم مزامنته مع القيد المحاسبي ورصيد الخزنة.")}
            </p>
          </div>

          {/* المبلغ + سعر الصرف */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              type="number"
              step="0.01"
              label={t("المبلغ ({0})", { 0: currency || "EGP" })}
              {...register("amount")}
              error={errors.amount?.message}
            />

            {isForeign && (
              <div>
                <Input
                  type="number"
                  step="0.01"
                  label={t("سعر الصرف ({0})", { 0: baseCurrency || "EGP" })}
                  placeholder={
                    isResolvingRate
                      ? t("جاري تحميل السعر...")
                      : t("سعر يوم السند تلقائيًا إن ترك فارغًا")
                  }
                  {...register("exchangeRate")}
                  error={errors.exchangeRate?.message}
                />

                {isResolvingRate && (
                  <p className="mt-1 flex items-center gap-1 text-[11px] text-ink-400">
                    <Loader2 size={11} className="animate-spin" />
                    {t("جاري جلب سعر")} {currency} {t("بتاريخ السند...")}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* تسوية بعملة مختلفة عن عملة الشريك */}
          {isCrossCurrencyPartner && (
            <div className="rounded-xl border border-primary-400/20 bg-primary-400/5 p-3">
              <Input
                type="number"
                step="0.01"
                label={t("سعر تسوية الشريك ({0} لكل {1})", { 0: baseCurrency || "EGP", 1: partnerCurrency })}
                placeholder={t("اتركه فارغًا ليُحل تلقائيًا")}
                {...register("partnerExchangeRate")}
                error={errors.partnerExchangeRate?.message}
              />

              <p className="mt-1 text-[11px] leading-5 text-ink-400">
                {t("الخزنة بعملة")} {currency} {t("وحساب الشريك بعملة")} {partnerCurrency}{t(". السعر بوحدات العملة الأساسية لكل وحدة من عملة الشريك. لو اترك فارغًا، النظام بيدوّر سعر مناسب يغطي تاريخ السند.")}
              </p>
            </div>
          )}

          {/* قيم تسوية الشريك المحفوظة (من الاستجابة) */}
          {voucher.partnerCurrency && (
            <div className="rounded-xl border border-ink-400/15 bg-ink-400/5 p-3 text-xs leading-6 text-ink-600">
              <div className="mb-1 font-medium text-ink-900">
                {t("تسوية الشريك المحفوظة")}
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-1">
                <span>
                  {t("العملة:")} <strong>{voucher.partnerCurrency}</strong>
                </span>
                {voucher.partnerAmount != null && (
                  <span>
                    {t("مبلغ الشريك:")}{" "}
                    <strong>
                      {voucher.partnerAmount} {voucher.partnerCurrency}
                    </strong>
                  </span>
                )}
                {voucher.partnerBaseAmount != null && (
                  <span>
                    {t("مقابل الأساس:")}{" "}
                    <strong>
                      {voucher.partnerBaseAmount} {baseCurrency || "EGP"}
                    </strong>
                  </span>
                )}
              </div>
            </div>
          )}

          {/* الرقم المرجعي */}
          <Input
            label={t("الرقم المرجعي")}
            {...register("referenceNumber")}
            error={errors.referenceNumber?.message}
          />

          {/* البيان */}
          <Input
            label={t("البيان")}
            {...register("description")}
            error={errors.description?.message}
          />

          {/* الملاحظات */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-900">
              {t("ملاحظات")}
            </label>

            <textarea
              {...register("notes")}
              rows={3}
              className="w-full resize-none rounded-lg border border-ink-400/15 px-3 py-2 text-sm outline-none transition placeholder:text-ink-400 focus:border-primary-400 focus:ring-2 focus:ring-primary-400/10"
              placeholder={t("أضف ملاحظات إن وجدت...")}
            />

            {errors.notes && (
              <p className="mt-1 text-xs text-negative">
                {errors.notes.message}
              </p>
            )}
          </div>

          {/* Actions */}
          {pendingPost ? (
            <div className="space-y-3 border-t border-ink-400/10 pt-4">
              <div className="rounded-xl border border-gold-200 bg-gold-50 px-4 py-3 text-sm leading-6 text-ink-700">
                <p className="mb-1 font-semibold text-ink-900">
                  {t("تأكيد التوصيف والترحيل")}
                </p>
                <p>
                  {isDraft
                    ? t("الترحيل هيأثر على رصيد الخزنة والقيود المحاسبية. بعد الترحيل السند يبقى قابلًا للتعديل أو الحذف من الأدمن والمحاسب.")
                    : t("هيتم تحديث القيد المحاسبي ورصيد الخزنة والحركات المرتبطة بالسند فورًا.")}
                </p>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPendingPost(null)}
                  disabled={saving}
                >
                  {t("رجوع")}
                </Button>

                <Button type="button" onClick={confirmPost} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      {t("جاري الترحيل...")}
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      {t("تأكيد الترحيل")}
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap justify-end gap-2 border-t border-ink-400/10 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={saving}
              >
                {t("إلغاء")}
              </Button>

              {isDraft && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSubmit(submitDraft)}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      {t("جاري الحفظ...")}
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      {t("حفظ كمسودة")}
                    </>
                  )}
                </Button>
              )}

              <Button type="submit" disabled={saving}>
                <Save size={16} />
                {isDraft ? t("توصيف وترحيل") : t("حفظ التعديلات")}
              </Button>
            </div>
          )}
        </form>
      )}
    </Modal>
  );
}
