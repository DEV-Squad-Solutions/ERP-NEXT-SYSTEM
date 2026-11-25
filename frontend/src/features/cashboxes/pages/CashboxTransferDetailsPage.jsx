import { useParams, useNavigate } from "react-router-dom";
import { ArrowRight, ArrowLeftRight, Receipt } from "lucide-react";

import { useGetCashboxTransferByIdQuery } from "../cashboxTransfersApi";
import { formatDate } from "../../../lib/date.js";

import { t } from "../../../i18n";
import { getLocale } from "../../../i18n";
function fmtAmount(n, currency) {
  return `${new Intl.NumberFormat(getLocale(), { maximumFractionDigits: 2 }).format(n ?? 0)} ${currency ?? ""}`;
}

function fmtDate(d) {
  if (!d) return "—";
  return formatDate(new Date(d));
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between border-b py-2 text-sm last:border-b-0">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-900">{value ?? "—"}</span>
    </div>
  );
}

export default function CashboxTransferDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const {
    data: transfer,
    isLoading,
    isError,
    refetch,
  } = useGetCashboxTransferByIdQuery(id, {
    skip: !id,
  });

  return (
    <div className="animate-fadeUp">
      <div className="mb-6 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="flex h-9 w-9 items-center justify-center rounded-xl border text-gray-400 hover:text-gray-900"
          title={t("رجوع")}
        >
          <ArrowRight size={16} />
        </button>
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold">
            <ArrowLeftRight size={20} className="text-primary-500" />
            {t("تفاصيل التحويل")} {t?.transferNumber ?? ""}
          </h2>
        </div>
      </div>

      {isLoading && (
        <div className="rounded-2xl border border-dashed py-16 text-center text-gray-400">
          {t("جاري تحميل بيانات التحويل...")}
        </div>
      )}

      {isError && (
        <div className="flex items-center justify-between rounded-2xl border p-4 text-sm error-banner">
          <span>{t("لم يتم العثور على التحويل، أو حدث خطأ أثناء التحميل.")}</span>
          <button
            onClick={refetch}
            className="rounded-lg border border-red-200 bg-white px-3 py-1 text-xs font-medium hover:bg-red-100"
          >
            {t("إعادة المحاولة")}
          </button>
        </div>
      )}

      {transfer && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <h3 className="mb-2 text-sm font-bold text-gray-900">
              {t("بيانات التحويل")}
            </h3>
            <Row label={t("رقم التحويل")} value={transfer.transferNumber} />
            <Row label={t("التاريخ")} value={fmtDate(transfer.transferDate)} />
            <Row label={t("من خزينة")} value={transfer.sourceCashboxName} />
            <Row label={t("إلى خزينة")} value={transfer.destinationCashboxName} />
            <Row label={t("المبلغ")} value={fmtAmount(transfer.amount, transfer.currency)} />
            {transfer.baseCurrency && transfer.baseCurrency !== transfer.currency && (
              <>
                <Row label={t("سعر الصرف")} value={transfer.exchangeRate} />
                <Row
                  label={t("المبلغ بعملة الأساس")}
                  value={fmtAmount(transfer.baseAmount, transfer.baseCurrency)}
                />
              </>
            )}
            <Row label={t("الوصف")} value={transfer.description} />
            <Row label={t("ملاحظات")} value={transfer.notes} />
          </div>

          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <h3 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-gray-900">
              <Receipt size={14} className="text-primary-500" />
              {t("السندات المرتبطة")}
            </h3>
            <Row
              label={t("سند الصرف (من خزينة المصدر)")}
              value={transfer.paymentVoucherNumber}
            />
            <Row
              label={t("سند القبض (لخزينة الوجهة)")}
              value={transfer.receiptVoucherNumber}
            />
            <p className="mt-3 text-xs text-gray-400">
              {t("السندات دي بتتولد تلقائيًا مع التحويل ومش قابلة للتعديل بشكل مستقل.")}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
