import Modal from "../../../shared/components/ui/Modal";
import InvoiceNumberLink from "../../../shared/components/InvoiceNumberLink";
import { formatDate } from "../../../lib/date.js";

import { t } from "../../../i18n";
import { getDir, getLocale } from "../../../i18n";
function fmtAmount(n, currency) {
  if (n == null) return "—";
  return `${new Intl.NumberFormat(getLocale(), {
    maximumFractionDigits: 2,
  }).format(n)} ${currency ?? ""}`;
}

function fmtDate(d) {
  if (!d) return "—";
  return formatDate(new Date(d));
}

function partyLabel(v) {
  switch (v.partyType) {
    case "Partner":
      return v.businessPartnerName ?? "—";
    case "Driver":
      return v.driverTripInvoiceNumber
        ? t("{0} (رحلة {1})", { 0: v.driverName, 1: v.driverTripInvoiceNumber })
        : (v.driverName ?? "—");
    case "Employee":
      return v.employeeName ?? "—";
    case "Account":
      // حسابات المصاريف والإيرادات (accountId) - نفس الـ posting target
      // اللي بيتحدد من DescriptionCascadeSelect.
      return v.accountName
        ? `${v.accountCode ? `${v.accountCode} - ` : ""}${v.accountName}`
        : "—";
    case "Other":
      return v.externalPartyName ?? "—";
    default:
      return "—";
  }
}

function Row({ label, value }) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div className="flex items-start justify-between gap-4 border-b border-ink-400/10 py-2 text-sm last:border-0">
      <span className="text-ink-400">{label}</span>
      <span className="text-start font-medium text-ink-800">{value}</span>
    </div>
  );
}

export default function ExpenseDetailsModal({ voucher, onClose, onEdit }) {
  const v = voucher;

  return (
    <Modal
      isOpen={Boolean(v)}
      onClose={onClose}
      title={v ? t("تفاصيل سند {0}", { 0: v.voucherNumber || `#${v.id}` }) : ""}
    >
      {v && (
        <div dir={getDir()}>
          <div className="space-y-0.5">
            <Row label={t("التاريخ")} value={fmtDate(v.voucherDate)} />
            <Row label={t("الخزينة")} value={v.cashboxName} />
            <Row label={t("نوع الحركة")} value={v.cashMovementTypeName} />
            <Row label={t("التصنيف")} value={v.classification} />
            <Row label={t("الجهة")} value={partyLabel(v)} />
            <Row
              label={t("المبلغ")}
              value={
                <span className="font-bold text-rose-600">
                  {fmtAmount(v.amount, v.currency)}
                </span>
              }
            />
            {v.baseCurrency && v.baseCurrency !== v.currency && (
              <>
                <Row label={t("سعر الصرف")} value={v.exchangeRate} />
                <Row
                  label={t("المبلغ بالعملة الأساسية")}
                  value={fmtAmount(v.baseAmount, v.baseCurrency)}
                />
                <Row
                  label={t("فرق العملة المحقق")}
                  value={fmtAmount(
                    v.realizedExchangeDifference,
                    v.baseCurrency,
                  )}
                />
              </>
            )}
            <Row label={t("رقم المرجع")} value={v.referenceNumber} />
            <Row label={t("الوصف")} value={v.description} />
            <Row label={t("ملاحظات")} value={v.notes} />
            {v.invoiceNumber && (
              <>
                <Row
                  label={t("فاتورة مرتبطة")}
                  value={
                    <InvoiceNumberLink
                      invoiceId={v.invoiceId}
                      invoiceType={v.invoiceType}
                      invoiceNumber={v.invoiceNumber}
                      className="font-medium"
                    />
                  }
                />
                <Row
                  label={t("المبلغ المُطبّق على الفاتورة")}
                  value={fmtAmount(
                    v.appliedInvoiceAmount,
                    v.appliedInvoiceCurrency,
                  )}
                />
              </>
            )}
            <Row label={t("الحالة")} value={v.isDraft ? t("مسودة") : t("معتمد")} />
          </div>
        </div>
      )}
    </Modal>
  );
}
