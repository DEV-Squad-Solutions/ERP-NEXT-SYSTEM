import { useState } from "react";
import Select from "react-select";
import { useGetInventoryCostReportQuery } from "../storesApi";
import { useGetItemsSelectQuery } from "../../inventory/inventoryApi";
import Pagination from "../../../shared/components/ui/Pagination"; // عدّل المسار حسب مكانك // عدّل المسار حسب مكان inventoryApi عندك
import { formatDate } from "../../../lib/date";

import { t } from "../../../i18n";
import { getDir } from "../../../i18n";
const MOVEMENT_TYPE_LABELS = {
  Sales: t("فاتورة مبيعات"),
  SalesReturn: t("مرتجع مبيعات"),
  Purchase: t("فاتورة مشتريات"),
  PurchaseReturn: t("مرتجع مشتريات"),
  OpeningBalance: t("رصيد افتتاحي"),
  AdjustmentIncrease: t("تسوية زيادة"),
  AdjustmentDecrease: t("تسوية نقص"),
  TransferIn: t("تحويل وارد"),
  TransferOut: t("تحويل صادر"),
};

const COST_STATUS_LABELS = {
  Final: t("نهائية"),
  PartiallyCosted: t("مكلفة جزئيًا"),
  Pending: t("معلقة"),
  Revalued: t("معاد تقييمها"),
};

// ملاحظة هامة:
// GET /api/v1/InventoryCostReports يتطلب StoreId + ItemId إجباريًا (وليس مخزن فقط).
// يعني مفيش endpoint حاليًا يرجع "كل حركات المخزن" لكل الأصناف دفعة واحدة.
// لحد ما يتوفر endpoint بديل، بنطلب من المستخدم يختار صنف الأول عشان يشوف الحركات
// (Cost Report) الخاصة بيه داخل المخزن ده.
export default function StoreMovementsTab({ storeId }) {
  const [selectedItem, setSelectedItem] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const { data: itemsOptions, isLoading: itemsLoading } =
    useGetItemsSelectQuery();

  const {
    data: report,
    isFetching,
    isError,
  } = useGetInventoryCostReportQuery(
    {
      storeId,
      itemId: selectedItem?.value,
      pageNumber,
      pageSize,
    },
    { skip: !selectedItem },
  );

  const itemSelectOptions =
    itemsOptions?.map((i) => ({
      value: i.id,
      label: ` ${i.name}`,
    })) ?? [];

  return (
    <div className="bg-white rounded-2xl shadow-card p-6" dir={getDir()}>
      {/* اختيار الصنف - إجباري حسب متطلبات الـ API الحالية */}
      <div className="mb-5 max-w-sm">
        <label className="text-xs text-ink-500 mb-1.5 block">
          {t("اختر الصنف لعرض حركاته داخل هذا المخزن")}
        </label>
        <Select
          isRtl={getDir() === "rtl"}
          isLoading={itemsLoading}
          options={itemSelectOptions}
          value={selectedItem}
          onChange={(opt) => {
            setSelectedItem(opt);
            setPageNumber(1);
          }}
          placeholder={t("ابحث عن صنف...")}
          classNamePrefix="rs"
        />
      </div>

      {!selectedItem && (
        <div className="py-14 text-center text-sm text-ink-400">
          {t("اختر صنفًا لعرض سجل الحركات الخاص به داخل هذا المخزن.")}
        </div>
      )}

      {selectedItem && isFetching && (
        <div className="py-14 text-center text-sm text-ink-400">
          {t("جاري تحميل الحركات...")}
        </div>
      )}

      {selectedItem && isError && (
        <div className="py-14 text-center text-sm error-text">
          {t("حدث خطأ أثناء تحميل الحركات.")}
        </div>
      )}

      {selectedItem && !isFetching && !isError && (
        <>
          {report && (
            <div className="flex items-center gap-2 text-xs text-ink-500 mb-4">
              <span>{report.itemName}</span>
              <span className="w-1 h-1 rounded-full bg-ink-300" />
              <span>{report.itemUnitName}</span>
              <span className="w-1 h-1 rounded-full bg-ink-300" />
              <span>{report.baseCurrency}</span>
            </div>
          )}

          {/* ملخص سريع من summary */}
          {report?.summary && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              <SummaryChip
                label={t("الرصيد الحالي")}
                value={report.summary.currentQuantity}
              />
              <SummaryChip
                label={t("متوسط التكلفة")}
                value={report.summary.currentAverageCost}
              />
              <SummaryChip
                label={t("قيمة المخزون الحالية")}
                value={report.summary.currentInventoryValue}
              />
              <SummaryChip
                label={t("حركات معلقة التكلفة")}
                value={report.summary.pendingMovementCount}
              />
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-ink-500 text-xs border-b border-ink-100">
                  <th className="py-2.5 px-3 text-start font-medium">
                    {t("التاريخ")}
                  </th>
                  <th className="py-2.5 px-3 text-start font-medium">
                    {t("نوع الحركة")}
                  </th>
                  <th className="py-2.5 px-3 text-start font-medium">
                    {t("رقم المستند")}
                  </th>
                  <th className="py-2.5 px-3 text-start font-medium">{t("وارد")}</th>
                  <th className="py-2.5 px-3 text-start font-medium">{t("صادر")}</th>
                  <th className="py-2.5 px-3 text-start font-medium">
                    {t("الرصيد بعد الحركة")}
                  </th>
                  <th className="py-2.5 px-3 text-start font-medium">
                    {t("حالة التكلفة")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {report?.items?.length ? (
                  report.items.map((row) => (
                    <tr
                      key={row.movementId}
                      className="border-b border-ink-50 hover:bg-ink-50/50 transition-colors"
                    >
                      <td className="py-2.5 px-3 text-ink-700">
                        {row.movementDate ? formatDate(row.movementDate) : "—"}
                      </td>
                      <td className="py-2.5 px-3 text-ink-700">
                        {MOVEMENT_TYPE_LABELS[row.movementType] ??
                          row.movementType}
                      </td>
                      <td className="py-2.5 px-3">
                        {row.referenceNumber ? (
                          <button className="text-ink-600 font-medium hover:underline">
                            {row.referenceNumber}
                          </button>
                        ) : (
                          <span className="text-ink-400">
                            {row.description || "—"}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-emerald-600 font-medium">
                        {row.quantityIn || "—"}
                      </td>
                      <td className="py-2.5 px-3 error-text font-medium">
                        {row.quantityOut || "—"}
                      </td>
                      <td className="py-2.5 px-3 text-ink-900 font-medium">
                        {row.quantityAfter}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="text-xs px-2 py-1 rounded-full bg-ink-50 text-ink-600">
                          {COST_STATUS_LABELS[row.costStatus] ?? row.costStatus}
                        </span>
                        {row.costStatus === "PartiallyCosted" &&
                          row.pendingCostQuantity > 0 && (
                            <span className="block text-[11px] text-amber-600 mt-0.5">
                              {t("معلق:")} {row.pendingCostQuantity}
                            </span>
                          )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-ink-400">
                      {t("لا توجد حركات لهذا الصنف داخل هذا المخزن.")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {report?.totalCount > 0 && (
            <Pagination
              page={pageNumber}
              pageSize={pageSize}
              totalCount={report.totalCount}
              onPageChange={setPageNumber}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPageNumber(1);
              }}
              label={t("حركة")}
            />
          )}
        </>
      )}
    </div>
  );
}

function SummaryChip({ label, value }) {
  return (
    <div className="bg-ink-50 rounded-xl px-3.5 py-2.5">
      <p className="text-[11px] text-ink-500 mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-ink-900">{value ?? "—"}</p>
    </div>
  );
}
