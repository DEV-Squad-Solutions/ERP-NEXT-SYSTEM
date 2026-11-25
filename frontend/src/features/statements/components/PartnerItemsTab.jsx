import { useState } from "react";
import {
  Search,
  RotateCcw,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  Package,
  Printer,
} from "lucide-react";

import CompactSelect from "../../../shared/components/ui/CompactSelect";
import Button from "../../../shared/components/ui/Button";
import { useItemMovementsPrint } from "../../../shared/hooks/useItemMovementsPrint"; // ← بدل useInvoiceListPrint
import { useGetCountriesSelectQuery } from "../../countries/countriesApi";
import { useGetItemsSelectQuery } from "../../inventory/inventoryApi";
import { useGetPartnerItemMovementsQuery } from "../statementsApi";
import { useNavigate } from "react-router-dom";
import PartnerItemMovementsPrintTemplate from "../../../shared/components/print/PartnerItemMovementsPrintTemplate";
import InvoiceNumberLink from "../../../shared/components/InvoiceNumberLink";
import { formatDate as sharedFormatDate } from "../../../lib/date.js";
import DateInput from "../../../shared/components/ui/DateInput.jsx";
import { t } from "../../../i18n";
import { getLocale } from "../../../i18n";
const emptyItemFilters = {
  fromDate: "",
  toDate: "",
  countryId: "",
  itemId: "",
};

export default function PartnerItemsTab({ partnerId }) {
  const [draft, setDraft] = useState(emptyItemFilters);
  const [applied, setApplied] = useState(emptyItemFilters);
  const navigate = useNavigate();
  const { data: countries } = useGetCountriesSelectQuery();
  const { data: items } = useGetItemsSelectQuery();

  const { data, isLoading, isFetching, isError, refetch } =
    useGetPartnerItemMovementsQuery(
      {
        businessPartnerId: partnerId,
        fromDate: applied.fromDate || undefined,
        toDate: applied.toDate || undefined,
        countryId: applied.countryId || undefined,
        itemId: applied.itemId || undefined,
      },
      {
        skip: !partnerId || !applied.itemId,
      },
    );

  // =========================
  // API Response
  // =========================

  const rows = data?.movements ?? [];

  const summary = data?.summary ?? {
    totalSalesQuantity: 0,
    totalPurchaseQuantity: 0,
    totalSalesWeight: 0,
    totalPurchaseWeight: 0,
  };

  // =========================
  // Helpers
  // =========================

  const setField = (key, value) => {
    setDraft((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSearch = () => {
    if (!draft.itemId) return;

    setApplied(draft);
  };

  const handleReset = () => {
    setDraft(emptyItemFilters);
    setApplied(emptyItemFilters);
  };

  const formatNumber = (value) => {
    if (value === null || value === undefined) {
      return "-";
    }

    return Number(value).toLocaleString(getLocale(), {
      maximumFractionDigits: 2,
    });
  };

  const formatDate = (value) => {
    if (!value) return "-";

    return sharedFormatDate(new Date(value));
  };

  const getMovementLabel = (type) => {
    switch (type?.toLowerCase()) {
      case "sale":
        return t("بيع");

      case "purchase":
        return t("شراء");

      case "sale_return":
        return t("مرتجع بيع");

      case "purchase_return":
        return t("مرتجع شراء");

      default:
        return type || "-";
    }
  };

  const getMovementStyle = (type) => {
    switch (type?.toLowerCase()) {
      case "sale":
        return "bg-blue-50 text-blue-600";

      case "purchase":
        return "bg-green-50 text-green-600";

      case "sale_return":
        return "bg-orange-50 text-orange-600";

      case "purchase_return":
        return "bg-red-50 text-red-600";

      default:
        return "bg-ink-900/5 text-ink-500";
    }
  };
  const { printList, printRef } = useItemMovementsPrint({
    title: t("حركة-صنف-{0}", { 0: data?.itemName || "" }),
  });

  const handlePrint = () => {
    if (!rows.length) return;
    printList();
  };
  return (
    <div className="space-y-4">
      {/* =========================
          Filters
      ========================= */}
      <div className="rounded-2xl border border-ink-400/10 bg-white p-3 shadow-card">
        <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {/* From Date */}
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-400">
              {t("من تاريخ")}
            </label>

            <DateInput
              type="date"
              value={draft.fromDate}
              onChange={(e) => setField("fromDate", e.target.value)}
              className="w-full rounded-lg border border-ink-400/15 px-2.5 py-2 text-sm outline-none focus:border-primary-500"
            />
          </div>

          {/* To Date */}
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-400">
              {t("إلى تاريخ")}
            </label>

            <DateInput
              type="date"
              value={draft.toDate}
              onChange={(e) => setField("toDate", e.target.value)}
              className="w-full rounded-lg border border-ink-400/15 px-2.5 py-2 text-sm outline-none focus:border-primary-500"
            />
          </div>

          {/* Country */}
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-400">
              {t("البلد")}
            </label>

            <CompactSelect
              options={
                countries?.map((country) => ({
                  value: country.id,
                  label: country.name,
                })) ?? []
              }
              value={draft.countryId}
              onChange={(value) => setField("countryId", value)}
              placeholder={t("اختر البلد")}
            />
          </div>

          {/* Item */}
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-400">
              {t("الصنف")} <span className="text-negative">*</span>
            </label>

            <CompactSelect
              options={
                items?.map((item) => ({
                  value: item.id,
                  label: item.name,
                })) ?? []
              }
              value={draft.itemId}
              onChange={(value) => setField("itemId", value)}
              placeholder={t("اختر الصنف")}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              onClick={handleSearch}
              disabled={!draft.itemId || isFetching}
              className="h-9 flex-1"
            >
              <Search size={14} />
              {t("بحث")}
            </Button>
            <Button
              variant="outline"
              onClick={handlePrint}
              disabled={!rows.length}
            >
              <Printer size={16} />
              {t("طباعة")}
            </Button>
            <Button variant="outline" onClick={handleReset} className="h-9">
              <RotateCcw size={14} />
            </Button>
          </div>
        </div>
      </div>
      {/* =========================
          Empty State
      ========================= */}
      {!applied.itemId ? (
        <div className="rounded-2xl border border-dashed border-ink-400/20 py-16 text-center">
          <Package size={32} className="mx-auto mb-3 text-ink-400" />

          <p className="text-sm text-ink-400">{t("اختر صنف وابحث لعرض حركته")}</p>
        </div>
      ) : isError ? (
        /* =========================
            Error
        ========================= */

        <div className="flex items-center justify-center gap-2 py-16 text-sm text-negative">
          <AlertCircle size={16} />

          <span>{t("حصل خطأ أثناء تحميل البيانات")}</span>

          <button onClick={refetch} className="underline">
            {t("إعادة المحاولة")}
          </button>
        </div>
      ) : (
        <>
          {/* =========================
              Item Info
          ========================= */}

          <div className="rounded-2xl border border-ink-400/10 bg-white p-4 shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs text-ink-400">{t("الصنف")}</p>

                <h3 className="mt-1 text-base font-semibold text-ink-900">
                  {data?.itemName || "-"}
                </h3>
              </div>

              <div className="text-end">
                <p className="text-xs text-ink-400">{t("العميل / المورد")}</p>

                <p className="mt-1 text-sm font-medium text-ink-700">
                  {data?.businessPartnerName || "-"}
                </p>
              </div>
            </div>
          </div>

          {/* =========================
              Summary
          ========================= */}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard
              title={t("إجمالي كمية المبيعات")}
              value={summary.totalSalesQuantity}
              icon={<ArrowUp size={16} />}
              iconClass="bg-blue-50 text-blue-600"
            />

            <SummaryCard
              title={t("إجمالي كمية المشتريات")}
              value={summary.totalPurchaseQuantity}
              icon={<ArrowDown size={16} />}
              iconClass="bg-green-50 text-green-600"
            />

            <SummaryCard
              title={t("إجمالي وزن المبيعات")}
              value={summary.totalSalesWeight}
              icon={<ArrowUp size={16} />}
              iconClass="bg-blue-50 text-blue-600"
            />

            <SummaryCard
              title={t("إجمالي وزن المشتريات")}
              value={summary.totalPurchaseWeight}
              icon={<ArrowDown size={16} />}
              iconClass="bg-green-50 text-green-600"
            />
          </div>

          {/* =========================
              Table
          ========================= */}

          <div className="overflow-x-auto rounded-2xl border border-ink-400/10 bg-white shadow-card">
            <table className="w-full min-w-[1100px] border-collapse text-start">
              <thead>
                <tr className="bg-ink-900/[0.03] text-xs text-ink-400">
                  <th className="p-2.5 font-medium">{t("رقم الفاتورة")}</th>

                  <th className="p-2.5 font-medium">{t("التاريخ")}</th>

                  <th className="p-2.5 font-medium">{t("الحركة")}</th>

                  <th className="p-2.5 font-medium">{t("الصنف")}</th>

                  <th className="p-2.5 font-medium">{t("العدد")}</th>

                  <th className="p-2.5 font-medium">{t("الوزن")}</th>

                  <th className="p-2.5 font-medium">{t("الكمية")}</th>

                  <th className="p-2.5 font-medium">{t("السعر")}</th>

                  <th className="p-2.5 font-medium">{t("الإجمالي")}</th>
                </tr>
              </thead>

              <tbody>
                {isLoading || isFetching ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="p-8 text-center text-sm text-ink-400"
                    >
                      {t("جارِ التحميل...")}
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="p-8 text-center text-sm text-ink-400"
                    >
                      {t("لا توجد حركة لهذا الصنف بالفلاتر المحددة")}
                    </td>
                  </tr>
                ) : (
                  rows.map((row, index) => (
                    <tr
                      key={`${row.invoiceId}-${index}`}
                      className="border-b border-ink-400/5 transition-colors last:border-0 hover:bg-ink-900/[0.012]"
                    >
                      <td className="p-2.5 text-sm font-medium num">
                        <InvoiceNumberLink
                          invoiceId={row.invoiceId}
                          invoiceType={row.invoiceType}
                          invoiceNumber={row.invoiceNumber}
                        />
                      </td>
                      {/* Date */}
                      <td className="p-2.5 text-sm num">
                        {formatDate(row.invoiceDate)}
                      </td>

                      {/* Movement */}
                      <td className="p-2.5 text-sm">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getMovementStyle(
                            row.movementType,
                          )}`}
                        >
                          {getMovementLabel(row.movementType)}
                        </span>
                      </td>

                      {/* Item */}
                      <td className="p-2.5 text-sm">{row.itemName || "-"}</td>

                      {/* Count */}
                      <td className="p-2.5 text-center text-sm num">
                        {formatNumber(row.count)}
                      </td>

                      {/* Weight */}
                      <td className="p-2.5 text-center text-sm num">
                        {formatNumber(row.weight)}
                      </td>

                      {/* Quantity */}
                      <td className="p-2.5 text-center text-sm num">
                        {formatNumber(row.quantity)}
                      </td>

                      {/* Unit Price */}
                      <td className="p-2.5 text-center text-sm num">
                        {formatNumber(row.unitPrice)}
                      </td>

                      {/* Total Amount */}
                      <td className="p-2.5 text-center text-sm font-semibold num">
                        {formatNumber(row.totalAmount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>

              {/* =========================
                  Footer
              ========================= */}

              {rows.length > 0 && (
                <tfoot>
                  <tr className="bg-ink-900/[0.03] font-semibold">
                    <td colSpan={4} className="p-2.5 text-sm">
                      {t("إجمالي النتائج")}
                    </td>

                    <td className="p-2.5 text-center text-sm num">
                      {formatNumber(
                        rows.reduce(
                          (sum, row) => sum + (Number(row.count) || 0),
                          0,
                        ),
                      )}
                    </td>

                    <td className="p-2.5 text-center text-sm num">
                      {formatNumber(
                        rows.reduce(
                          (sum, row) => sum + (Number(row.weight) || 0),
                          0,
                        ),
                      )}
                    </td>

                    <td className="p-2.5 text-center text-sm num">
                      {formatNumber(
                        rows.reduce(
                          (sum, row) => sum + (Number(row.quantity) || 0),
                          0,
                        ),
                      )}
                    </td>

                    <td className="p-2.5"></td>

                    <td className="p-2.5 text-center text-sm num">
                      {formatNumber(
                        rows.reduce(
                          (sum, row) => sum + (Number(row.totalAmount) || 0),
                          0,
                        ),
                      )}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </>
      )}{" "}
      <div style={{ display: "none" }}>
        <div ref={printRef}>
          <PartnerItemMovementsPrintTemplate data={data} filters={applied} />
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ title, value, icon, iconClass }) {
  return (
    <div className="rounded-2xl border border-ink-400/10 bg-white p-3 shadow-card">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-ink-400">{title}</p>

          <p className="mt-1 text-lg font-bold text-ink-900 num">
            {Number(value ?? 0).toLocaleString(getLocale(), {
              maximumFractionDigits: 2,
            })}
          </p>
        </div>

        <div className={`rounded-xl p-2 ${iconClass}`}>{icon}</div>
      </div>
    </div>
  );
}
