import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  useGetStoreByIdQuery,
  useDeleteStoreMutation,
  useGetStoreStockReportQuery,
} from "../storesApi";
import { usePersistentTab } from "../../../shared/hooks/usePersistentTab";

import StoreHeader from "../components/StoreHeader";
import StoreStatsCards from "../components/StoreStatsCards";
import StoreOverviewTab from "../components/StoreOverviewTab";
import StoreInventoryTab from "../components/StoreInventoryTab";
import StoreMovementsTab from "../components/StoreMovementsTab";
import StoreTransfersTab from "../components/StoreTransfersTab";
import { useStorePrint } from "../../../shared/hooks/useStorePrint";
import StorePrintTemplate from "../../../shared/components/print/StorePrintTemplate";

import { t } from "../../../i18n";
import { getDir } from "../../../i18n";
const TABS = [
  { key: "overview", label: t("نظرة عامة") },
  { key: "inventory", label: t("الأصناف") },
  { key: "movements", label: t("الحركات") },
  { key: "transfers", label: t("التحويلات") },
];
const TAB_KEYS = TABS.map((t) => t.key);

export default function StoreDetailPage() {
  const { id } = useParams();
  const storeId = Number(id);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = usePersistentTab("overview", TAB_KEYS);

  const {
    data: store,
    isLoading,
    isError,
  } = useGetStoreByIdQuery(storeId, { skip: !storeId });

  const [deleteStore, { isLoading: isDeleting }] = useDeleteStoreMutation();
  const { printStore, printRef, storeToPrint } = useStorePrint();

  const { data: stockReport } = useGetStoreStockReportQuery(
    { storeId, pageNumber: 1, pageSize: 1 },
    { skip: !storeId },
  );

  const stats = {
    itemsCount: stockReport?.summary?.totalItemCount,
    itemsWithStockCount: stockReport?.summary?.itemsWithStockCount,
    totalValue: stockReport?.summary?.totalInventoryValue,
  };

  const handleEdit = () => {
    navigate(`/dashboard/stores/${storeId}/edit`);
  };

  const handleDelete = async () => {
    if (!window.confirm(t("هل أنت متأكد من حذف هذا المخزن؟"))) return;
    try {
      await deleteStore(storeId).unwrap();
      toast.success(t("تم حذف المخزن بنجاح"));
      navigate("/dashboard/stores");
    } catch (err) {
      toast.error(err?.data?.title || t("حدث خطأ أثناء حذف المخزن"));
    }
  };

  if (isLoading) {
    return (
      <div className="p-6" dir={getDir()}>
        <StoreDetailSkeleton />
      </div>
    );
  }

  if (isError || !store) {
    return (
      <div className="p-6 text-center" dir={getDir()}>
        <p className="text-ink-500">{t("تعذر تحميل بيانات المخزن.")}</p>
        <button
          onClick={() => navigate("/dashboard/stores")}
          className="mt-3 text-sm text-ink-600 underline"
        >
          {t("الرجوع لقائمة المخازن")}
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto" dir={getDir()}>
      <StoreHeader
        store={store}
        onPrint={() => printStore({ ...store, ...stats })}
      />

      <StoreStatsCards stats={stats} />

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-card p-1.5 flex items-center gap-1 mb-5 w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-ink-900 text-white"
                : "text-ink-600 hover:bg-ink-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && <StoreOverviewTab store={store} />}
      {activeTab === "inventory" && (
        <StoreInventoryTab storeId={storeId} activeTab={activeTab} />
      )}
      {activeTab === "movements" && <StoreMovementsTab storeId={storeId} />}
      {activeTab === "transfers" && <StoreTransfersTab storeId={storeId} />}

      <div style={{ display: "none" }}>
        <div ref={printRef}>
          <StorePrintTemplate store={storeToPrint} stats={stats} />
        </div>
      </div>
    </div>
  );
}

function StoreDetailSkeleton() {
  return (
    <div className="max-w-7xl mx-auto animate-pulse">
      <div className="bg-ink-100 rounded-2xl h-24 mb-6" />
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-ink-100 rounded-2xl h-20" />
        ))}
      </div>
      <div className="bg-ink-100 rounded-2xl h-10 w-64 mb-5" />
      <div className="bg-ink-100 rounded-2xl h-64" />
    </div>
  );
}
