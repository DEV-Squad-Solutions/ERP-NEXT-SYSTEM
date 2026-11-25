import { useRef, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  SlidersHorizontal,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";

import {
  useGetCountriesQuery,
  useDeleteCountryMutation,
} from "../countriesApi";
import CountryFormModal from "../components/CountryFormModal";
import Modal from "../../../shared/components/ui/Modal";
import Button from "../../../shared/components/ui/Button";
import Pagination from "../../../shared/components/ui/Pagination";

import { t } from "../../../i18n";
export default function CountriesPage() {
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingCountry, setEditingCountry] = useState(null);
  const [deletingCountry, setDeletingCountry] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const filtersRef = useRef(null);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [filters, setFilters] = useState({
    search: "",
    code: "",
    isActive: "",
  });

  const { data, isLoading, isError, refetch, isFetching } =
    useGetCountriesQuery({
      pageNumber: page,
      pageSize,
      search: filters.search || undefined,
      code: filters.code || undefined,
      isActive:
        filters.isActive === "" ? undefined : filters.isActive === "true",
    });

  const countries = data?.items ?? [];
  const [deleteCountry, { isLoading: isDeleting }] = useDeleteCountryMutation();

  const handleChange = (key) => (e) => {
    setPage(1);
    setFilters((f) => ({ ...f, [key]: e.target.value }));
  };

  const resetFilters = () => {
    setPage(1);
    setFilters({ search: "", code: "", isActive: "" });
  };
  const hasActiveFilters = filters.search || filters.code || filters.isActive;

  const openCreate = () => {
    setEditingCountry(null);
    setShowFormModal(true);
  };

  const openEdit = (country) => {
    setEditingCountry(country);
    setShowFormModal(true);
  };

  const confirmDelete = async () => {
    if (!deletingCountry) return;
    try {
      await deleteCountry(deletingCountry.id).unwrap();
      toast.success(t("تم حذف الدولة بنجاح"));
      setDeletingCountry(null);
    } catch {
      toast.error(t("حصل خطأ أثناء الحذف، حاول تاني"));
    }
  };

  return (
    <div className="animate-fadeUp">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-display text-2xl font-bold text-ink-900">
            {t("الدول")}
          </h2>
          <p className="text-sm text-ink-400 mt-1">
            {t("إدارة الدول المستخدمة كبيانات مرجعية في النظام")}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative" ref={filtersRef}>
            <Button variant="outline" onClick={() => setShowFilters((s) => !s)}>
              <SlidersHorizontal size={16} />
              {t("فلاتر")}
              {hasActiveFilters && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-700 mr-1" />
              )}
            </Button>

            {showFilters && (
              <div className="absolute left-0 mt-2 w-80 bg-white border border-ink-400/10 rounded-2xl shadow-lg p-4 z-20 space-y-3">
                <div>
                  <label className="block text-xs text-ink-400 mb-1.5">
                    {t("بحث")}
                  </label>
                  <input
                    type="text"
                    value={filters.search}
                    onChange={handleChange("search")}
                    placeholder={t("ابحث بالاسم...")}
                    className="w-full border border-ink-400/15 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-emerald-700/50 focus:ring-2 focus:ring-emerald-700/10"
                  />
                </div>

                <div>
                  <label className="block text-xs text-ink-400 mb-1.5">
                    {t("الكود")}
                  </label>
                  <input
                    type="text"
                    value={filters.code}
                    onChange={handleChange("code")}
                    placeholder={t("مثال: EG")}
                    className="w-full border border-ink-400/15 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-emerald-700/50 focus:ring-2 focus:ring-emerald-700/10"
                  />
                </div>

                <div>
                  <label className="block text-xs text-ink-400 mb-1.5">
                    {t("الحالة")}
                  </label>
                  <select
                    value={filters.isActive}
                    onChange={handleChange("isActive")}
                    className="w-full border border-ink-400/15 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-emerald-700/50 focus:ring-2 focus:ring-emerald-700/10"
                  >
                    <option value="">{t("الكل")}</option>
                    <option value="true">{t("نشطة")}</option>
                    <option value="false">{t("غير نشطة")}</option>
                  </select>
                </div>

                {hasActiveFilters && (
                  <button
                    onClick={resetFilters}
                    className="flex items-center gap-1.5 text-xs text-ink-400 hover:text-emerald-700 pt-1"
                  >
                    <RotateCcw size={12} />
                    {t("إعادة تعيين الفلاتر")}
                  </button>
                )}
              </div>
            )}
          </div>

          <Button onClick={openCreate}>
            <Plus size={16} />
            {t("دولة جديدة")}
          </Button>
        </div>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-14 rounded-2xl bg-ink-400/5 animate-pulse"
            />
          ))}
        </div>
      )}

      {isError && (
        <div className="text-center py-20 border border-dashed border-red-200 rounded-2xl">
          <p className="text-red-500 mb-3">{t("حدث خطأ أثناء تحميل الدول")}</p>
          <Button variant="outline" onClick={refetch}>
            {t("إعادة المحاولة")}
          </Button>
        </div>
      )}

      {!isLoading && !isError && countries.length === 0 && (
        <div className="text-center py-20 border border-dashed border-ink-400/20 rounded-2xl">
          <p className="text-ink-400 mb-3">{t("لا توجد دول مطابقة")}</p>
          <Button onClick={openCreate}>
            <Plus size={16} />
            {t("إضافة أول دولة")}
          </Button>
        </div>
      )}

      {!isLoading && !isError && countries.length > 0 && (
        <div
          className={`bg-white border border-ink-400/10 rounded-2xl overflow-hidden transition-opacity duration-200 ${
            isFetching ? "opacity-60" : ""
          }`}
        >
          <table className="w-full text-right">
            <thead>
              <tr className="border-b border-ink-400/10 text-xs text-ink-400 bg-ink-400/5">
                <th className="py-3 px-4 font-medium">{t("الكود")}</th>
                <th className="py-3 px-4 font-medium">{t("الاسم (En)")}</th>
                <th className="py-3 px-4 font-medium">{t("الاسم (Ar)")}</th>
                <th className="py-3 px-4 font-medium">{t("الحالة")}</th>
                <th className="py-3 px-4"></th>
              </tr>
            </thead>
            <tbody>
              {countries.map((country) => (
                <tr
                  key={country.id}
                  className="border-b border-ink-400/5 last:border-0"
                >
                  <td className="py-3 px-4 text-sm text-ink-400">
                    {country.code}
                  </td>
                  <td className="py-3 px-4 text-sm text-ink-900">
                    {country.englishName}
                  </td>
                  <td className="py-3 px-4 text-sm text-ink-900">
                    {country.name}
                  </td>
                  <td className="py-3 px-4 text-sm">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs ${
                        country.isActive
                          ? "bg-emerald-700/10 text-emerald-700"
                          : "bg-ink-400/10 text-ink-400"
                      }`}
                    >
                      {country.isActive ? t("نشطة") : t("غير نشطة")}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(country)}
                        className="text-ink-400 hover:text-emerald-700 p-1.5 rounded-lg hover:bg-ink-400/5 transition-colors"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => setDeletingCountry(country)}
                        className="text-ink-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-ink-400/5 transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data?.totalCount > 0 && (
        <Pagination
          page={page}
          pageSize={pageSize}
          totalCount={data.totalCount}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          label={t("دولة")}
        />
      )}

      <CountryFormModal
        isOpen={showFormModal}
        onClose={() => setShowFormModal(false)}
        country={editingCountry}
      />

      <Modal
        isOpen={Boolean(deletingCountry)}
        onClose={() => setDeletingCountry(null)}
        title={t("تأكيد الحذف")}
      >
        <div className="space-y-4">
          <p className="text-sm text-ink-900">
            {t("هل أنت متأكد من حذف دولة")}{" "}
            <span className="font-bold">"{deletingCountry?.arabicName}"</span>{t("؟")}
          </p>
          <p className="text-xs text-ink-400">{t("الإجراء ده لا يمكن التراجع عنه")}</p>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeletingCountry(null)}
            >
              {t("إلغاء")}
            </Button>
            <button
              type="button"
              onClick={confirmDelete}
              disabled={isDeleting}
              className="rounded-xl bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-60 transition-colors"
            >
              {isDeleting ? t("جاري الحذف...") : t("تأكيد الحذف")}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
