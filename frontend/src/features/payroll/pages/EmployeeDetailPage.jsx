// features/payroll/pages/EmployeeDetailPage.jsx
//
// TODO INTEGRATION: تبويبات الحضور والحركات (سلف/خصومات/مكافآت/سحوبات) بتحتاج
// endpoints بفلتر employeeId - مستخدمين هنا getEmployeeAttendances و
// getEmployeeMovements بفلتر EmployeeId، وسجل المرتبات من getPayrollEntries
// بفلتر EmployeeId. لو الباك إند مختلف، الجزء اللي محتاج تعديل هو الـparams بس.

import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowRight, Pencil, Trash2 } from "lucide-react";
import {
  useGetEmployeeByIdQuery,
  useDeleteEmployeeMutation,
  useGetEmployeeAttendancesQuery,
  useGetEmployeeMovementsQuery,
  useGetPayrollEntriesQuery,
} from "../payrollApi";
import {
  fmtMoney,
  MOVEMENT_TYPE_LABELS,
  movementTypeBadge,
} from "../payroll.constants";
import Button from "../../../shared/components/ui/Button";
import EmployeeFormModal from "../components/EmployeeFormModal";
import { formatDate } from "../../../lib/date.js";

import { t } from "../../../i18n";
const TABS = [
  { key: "basic", label: t("البيانات الأساسية") },
  { key: "attendance", label: t("الحضور") },
  { key: "movements", label: t("الحركات (سلف، خصومات، مكافآت، سحوبات)") },
  { key: "history", label: t("سجل المرتبات") },
];

export default function EmployeeDetailPage() {
  const { employeeId } = useParams();
  const navigate = useNavigate();
  const [showFormModal, setShowFormModal] = useState(false);
  const [activeTab, setActiveTab] = useState("basic");

  const {
    data: employee,
    isLoading,
    isError,
  } = useGetEmployeeByIdQuery(employeeId);
  const [deleteEmployee] = useDeleteEmployeeMutation();

  const handleDelete = () => {
    if (!employee) return;
    toast(t("حذف \"{0}\"؟", { 0: employee.name }), {
      description: t("الإجراء ده لا يمكن التراجع عنه"),
      action: {
        label: t("تأكيد الحذف"),
        onClick: async () => {
          try {
            await deleteEmployee(employee.id).unwrap();
            toast.success(t("تم الحذف بنجاح"));
            navigate("/dashboard/payroll/employees");
          } catch {
            toast.error(t("حصل خطأ أثناء الحذف، حاول تاني"));
          }
        },
      },
      cancel: { label: t("إلغاء") },
      duration: 6000,
    });
  };

  if (isLoading) return <div className="p-6 text-ink-400">{t("جاري التحميل...")}</div>;
  if (isError || !employee)
    return <div className="p-6 error-text">{t("تعذر تحميل بيانات الموظف")}</div>;

  return (
    <div className="animate-fadeUp space-y-6">
      <button
        onClick={() => navigate("/dashboard/payroll/employees")}
        className="flex items-center gap-1.5 text-sm text-emerald-700 hover:underline"
      >
        <ArrowRight size={14} />
        {t("رجوع لقائمة الموظفين")}
      </button>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between mb-6">
          <div>
            <span className="font-mono text-xs text-ink-400">
              {employee.code}
            </span>
            <h2 className="text-xl font-bold text-ink-900 mt-1">
              {employee.name}
            </h2>
            <span
              className={
                employee.isActive
                  ? "inline-block mt-2 text-emerald-700 text-xs font-semibold bg-emerald-700/10 px-2 py-0.5 rounded-full"
                  : "inline-block mt-2 text-red-500 text-xs font-semibold bg-red-500/10 px-2 py-0.5 rounded-full"
              }
            >
              {employee.isActive ? t("نشط") : t("غير نشط")}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setShowFormModal(true)}>
              <Pencil size={14} />
              {t("تعديل")}
            </Button>
            <Button variant="outline" onClick={handleDelete}>
              <Trash2 size={14} className="error-text" />
              {t("حذف")}
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-ink-400/10 mb-5 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                activeTab === tab.key
                  ? "border-primary-500 text-primary-600"
                  : "border-transparent text-ink-400 hover:text-ink-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "basic" && <BasicInfoTab employee={employee} />}
        {activeTab === "attendance" && (
          <AttendanceTab employeeId={employee.id} />
        )}
        {activeTab === "movements" && <MovementsTab employeeId={employee.id} />}
        {activeTab === "history" && (
          <PayrollHistoryTab employeeId={employee.id} />
        )}
      </div>

      <EmployeeFormModal
        isOpen={showFormModal}
        onClose={() => setShowFormModal(false)}
        employee={employee}
      />
    </div>
  );
}

function Field({ label, value, highlight = "" }) {
  return (
    <div>
      <p className="text-xs text-ink-400 mb-1">{label}</p>
      <p className={`text-sm text-ink-900 ${highlight}`}>{value || "—"}</p>
    </div>
  );
}

function BasicInfoTab({ employee }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-ink-900 mb-3">
          {t("البيانات الأساسية")}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          <Field label={t("الوظيفة")} value={employee.jobTitle} />
          <Field label={t("رقم الهاتف")} value={employee.phoneNumber} />
          <Field label={t("البريد الإلكتروني")} value={employee.email} />
          <Field label={t("العنوان")} value={employee.address} />
        </div>
      </div>
      <div className="pt-4 border-t border-ink-400/10">
        <h3 className="text-sm font-semibold text-ink-900 mb-3">
          {t("بيانات الراتب")}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          <Field
            label={t("نوع الأجر")}
            value={employee.employeeType === "Daily" ? t("يومي") : t("شهري")}
          />
          <Field label={t("الراتب الأساسي")} value={fmtMoney(employee.salary)} />
          <Field
            label={t("أيام العمل المطلوبة بالشهر")}
            value={employee.requiredWorkingDaysPerMonth}
          />
          <Field
            label={t("آخر يوم استحقاق مرتب")}
            value={employee.lastDayOfReceivingSalary}
          />
        </div>
      </div>
    </div>
  );
}

function AttendanceTab({ employeeId }) {
  const { data, isLoading } = useGetEmployeeAttendancesQuery({
    EmployeeId: employeeId,
    PageSize: 50,
  });
  const rows = data?.items || [];

  if (isLoading)
    return <div className="text-ink-400 text-sm py-6">{t("جارِ التحميل...")}</div>;
  if (rows.length === 0)
    return (
      <p className="text-sm text-ink-400 py-6 text-center">{t("لا يوجد سجل حضور")}</p>
    );

  return (
    <div className="overflow-x-auto custom-scroll rounded-xl border border-ink-400/10">
      <table className="w-full text-start border-collapse min-w-[600px]">
        <thead>
          <tr className="bg-ink-900/[0.03] text-ink-400 text-[11px]">
            <th className="p-2.5 font-medium border-e border-ink-400/5">
              {t("التاريخ")}
            </th>
            <th className="p-2.5 font-medium border-e border-ink-400/5">
              {t("الحضور")}
            </th>
            <th className="p-2.5 font-medium border-e border-ink-400/5">
              {t("الانصراف")}
            </th>
            <th className="p-2.5 font-medium">{t("الحالة")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-ink-400/5 last:border-0">
              <td className="p-2.5 num text-[13px] border-e border-ink-400/5">
                {formatDate(r.workDate)}
              </td>
              <td className="p-2.5 num text-[13px] border-e border-ink-400/5">
                {r.checkIn || "—"}
              </td>
              <td className="p-2.5 num text-[13px] border-e border-ink-400/5">
                {r.checkOut || "—"}
              </td>
              <td className="p-2.5 text-xs">{r.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MovementsTab({ employeeId }) {
  const { data, isLoading } = useGetEmployeeMovementsQuery({
    EmployeeId: employeeId,
    PageSize: 50,
  });
  const rows = data?.items || [];

  if (isLoading)
    return <div className="text-ink-400 text-sm py-6">{t("جارِ التحميل...")}</div>;
  if (rows.length === 0)
    return (
      <p className="text-sm text-ink-400 py-6 text-center">{t("لا توجد حركات")}</p>
    );

  return (
    <div className="overflow-x-auto custom-scroll rounded-xl border border-ink-400/10">
      <table className="w-full text-start border-collapse min-w-[720px]">
        <thead>
          <tr className="bg-ink-900/[0.03] text-ink-400 text-[11px]">
            <th className="p-2.5 font-medium border-e border-ink-400/5">
              {t("التاريخ")}
            </th>
            <th className="p-2.5 font-medium border-e border-ink-400/5">
              {t("النوع")}
            </th>
            <th className="p-2.5 font-medium border-e border-ink-400/5 text-positive">
              {t("مدين")}
            </th>
            <th className="p-2.5 font-medium border-e border-ink-400/5 text-negative">
              {t("دائن")}
            </th>
            <th className="p-2.5 font-medium border-e border-ink-400/5">
              {t("العملة")}
            </th>
            <th className="p-2.5 font-medium border-e border-ink-400/5">
              {t("رقم السند")}
            </th>
            <th className="p-2.5 font-medium">{t("ملاحظات")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-ink-400/5 last:border-0">
              <td className="p-2.5 num text-[13px] border-e border-ink-400/5">
                {formatDate(r.movementDate)}
              </td>
              <td className="p-2.5 border-e border-ink-400/5">
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    movementTypeBadge[r.type] || "bg-ink-400/10 text-ink-400"
                  }`}
                >
                  {MOVEMENT_TYPE_LABELS[r.type] || r.type}
                </span>
              </td>
              <td className="p-2.5 num text-positive text-[13px] border-e border-ink-400/5">
                {r.debit > 0 ? fmtMoney(r.debit) : "—"}
              </td>
              <td className="p-2.5 num text-negative text-[13px] border-e border-ink-400/5">
                {r.credit > 0 ? fmtMoney(r.credit) : "—"}
              </td>
              <td className="p-2.5 text-xs text-ink-600 border-e border-ink-400/5">
                {r.currency}
              </td>
              <td className="p-2.5 text-xs text-ink-600 border-e border-ink-400/5">
                {r.cashVoucherNumber || "—"}
              </td>
              <td className="p-2.5 text-xs text-ink-600">{r.notes || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PayrollHistoryTab({ employeeId }) {
  const { data, isLoading } = useGetPayrollEntriesQuery({
    EmployeeId: employeeId,
    PageSize: 50,
  });
  const rows = data?.items || [];

  if (isLoading)
    return <div className="text-ink-400 text-sm py-6">{t("جارِ التحميل...")}</div>;
  if (rows.length === 0)
    return (
      <p className="text-sm text-ink-400 py-6 text-center">
        {t("لا يوجد سجل مرتبات")}
      </p>
    );

  return (
    <div className="overflow-x-auto custom-scroll rounded-xl border border-ink-400/10">
      <table className="w-full text-start border-collapse min-w-[700px]">
        <thead>
          <tr className="bg-ink-900/[0.03] text-ink-400 text-[11px]">
            <th className="p-2.5 font-medium border-e border-ink-400/5">
              {t("الفترة")}
            </th>
            <th className="p-2.5 font-medium border-e border-ink-400/5">
              {t("المكافآت")}
            </th>
            <th className="p-2.5 font-medium border-e border-ink-400/5">
              {t("الخصومات")}
            </th>
            <th className="p-2.5 font-medium border-e border-ink-400/5">
              {t("إجمالي المرتب")}
            </th>
            <th className="p-2.5 font-medium">{t("صافي المرتب")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-ink-400/5 last:border-0">
              <td className="p-2.5 num text-[13px] border-e border-ink-400/5">
                {formatDate(r.startDate)} - {formatDate(r.endDate)}
              </td>
              <td className="p-2.5 num text-positive text-[13px] border-e border-ink-400/5">
                {fmtMoney(r.bonus)}
              </td>
              <td className="p-2.5 num text-negative text-[13px] border-e border-ink-400/5">
                {fmtMoney(r.deduction)}
              </td>
              <td className="p-2.5 num text-[13px] border-e border-ink-400/5">
                {fmtMoney(r.grossSalary)}
              </td>
              <td className="p-2.5 num font-semibold text-[13px]">
                {fmtMoney(r.netSalary)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
