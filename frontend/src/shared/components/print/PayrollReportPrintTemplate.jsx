import { fmtMoney } from "../../../features/payroll/payroll.constants";
import { formatDate as formatDateDisplay } from "../../../lib/date";

import { t } from "../../../i18n";
import { getDir } from "../../../i18n";
function formatDate(date) {
  if (!date) return "—";

  return formatDateDisplay(date) || date;
}

function StatBox({ title, value }) {
  return (
    <div style={styles.statBox}>
      <div style={styles.statTitle}>{title}</div>
      <div style={styles.statValue}>{value}</div>
    </div>
  );
}

export default function PayrollReportPrintTemplate({
  data,
  startDate,
  endDate,
}) {
  const summary = data?.summary ?? {};

  const employees = Array.isArray(data?.employees) ? data.employees : [];

  return (
    <div dir={getDir()} style={styles.page}>
      <style>
        {`
          @page {
            size: A4 landscape;
            margin: 10mm;
          }

          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            padding: 0;
            background: #fff;
            color: #0A2540;
            font-family: "Tajawal", "Cairo", Arial, sans-serif;
          }

          table {
            width: 100%;
            border-collapse: collapse;
          }

          tr {
            page-break-inside: avoid;
          }

          .print-section {
            page-break-inside: avoid;
          }
        `}
      </style>

      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>{t("تقرير الأجور والمرتبات")}</h1>

          <p style={styles.subtitle}>
            {t("تقرير تفصيلي للرواتب والحضور والاستحقاقات")}
          </p>
        </div>

        <div style={styles.dateBox}>
          <div>{t("فترة التقرير")}</div>

          <strong>
            {formatDate(startDate)} — {formatDate(endDate)}
          </strong>
        </div>
      </div>

      {/* Summary */}
      <div style={styles.statsGrid}>
        <StatBox title={t("إجمالي الكشوف")} value={summary.totalEntries ?? 0} />

        <StatBox title={t("عدد الموظفين")} value={summary.totalEmployees ?? 0} />

        <StatBox
          title={t("الإجمالي")}
          value={fmtMoney(summary.totalGrossSalary ?? 0)}
        />

        <StatBox
          title={t("الراتب المحسوب")}
          value={fmtMoney(summary.totalCalculatedSalary ?? 0)}
        />

        <StatBox title={t("المكافآت")} value={fmtMoney(summary.totalBonus ?? 0)} />

        <StatBox
          title={t("الخصومات")}
          value={fmtMoney(summary.totalDeduction ?? 0)}
        />

        <StatBox
          title={t("صافي الرواتب")}
          value={fmtMoney(summary.totalNetSalary ?? 0)}
        />

        <StatBox title={t("المدفوع")} value={fmtMoney(summary.paidAmount ?? 0)} />

        <StatBox title={t("المعلق")} value={fmtMoney(summary.pendingAmount ?? 0)} />

        <StatBox title={t("أيام الحضور")} value={summary.totalPresentDays ?? 0} />

        <StatBox title={t("أيام الغياب")} value={summary.totalAbsentDays ?? 0} />

        <StatBox title={t("وحدات العمل")} value={summary.totalWorkedUnits ?? 0} />
      </div>

      {/* Payment Summary */}
      <div style={styles.paymentSummary}>
        <div>
          <strong>{t("حالة السداد")}</strong>
        </div>

        <div>
          {t("المدفوع:")} <strong>{summary.paidCount ?? 0}</strong>
        </div>

        <div>
          {t("المعلق:")} <strong>{summary.pendingCount ?? 0}</strong>
        </div>

        <div>
          {t("المبلغ المدفوع:")} <strong>{fmtMoney(summary.paidAmount ?? 0)}</strong>
        </div>

        <div>
          {t("المبلغ المعلق:")} <strong>{fmtMoney(summary.pendingAmount ?? 0)}</strong>
        </div>
      </div>

      {/* Employees */}
      <section className="print-section" style={styles.section}>
        <h2 style={styles.sectionTitle}>{t("تفاصيل الموظفين")}</h2>

        {employees.length === 0 ? (
          <div style={styles.empty}>{t("لا توجد بيانات موظفين.")}</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th style={styles.th}>{t("الكود")}</th>
                <th style={styles.th}>{t("الموظف")}</th>
                <th style={styles.th}>{t("النوع")}</th>
                <th style={styles.th}>{t("من")}</th>
                <th style={styles.th}>{t("إلى")}</th>
                <th style={styles.th}>{t("حضور")}</th>
                <th style={styles.th}>{t("غياب")}</th>
                <th style={styles.th}>{t("وحدات")}</th>
                <th style={styles.th}>{t("إضافي")}</th>
                <th style={styles.th}>{t("خصم وحدات")}</th>
                <th style={styles.th}>{t("الإجمالي")}</th>
                <th style={styles.th}>{t("المكافأة")}</th>
                <th style={styles.th}>{t("الخصم")}</th>
                <th style={styles.th}>{t("الصافي")}</th>
                <th style={styles.th}>{t("الحالة")}</th>
              </tr>
            </thead>

            <tbody>
              {employees.map((employee) => (
                <tr key={`${employee.payrollEntryId}-${employee.employeeId}`}>
                  <td style={styles.td}>{employee.employeeCode || "—"}</td>

                  <td style={styles.tdStrong}>
                    {employee.employeeName || "—"}
                  </td>

                  <td style={styles.td}>
                    {employee.employeeType === "Daily" ? t("يومي") : t("شهري")}
                  </td>

                  <td style={styles.td}>{formatDate(employee.startDate)}</td>

                  <td style={styles.td}>{formatDate(employee.endDate)}</td>

                  <td style={styles.td}>{employee.presentDays ?? 0}</td>

                  <td style={styles.td}>{employee.absentDays ?? 0}</td>

                  <td style={styles.td}>{employee.workedUnits ?? 0}</td>

                  <td style={styles.td}>{employee.overtimeUnits ?? 0}</td>

                  <td style={styles.td}>{employee.deductionUnits ?? 0}</td>

                  <td style={styles.td}>
                    {fmtMoney(employee.grossSalary ?? 0)}
                  </td>

                  <td style={styles.td}>{fmtMoney(employee.bonus ?? 0)}</td>

                  <td style={styles.td}>{fmtMoney(employee.deduction ?? 0)}</td>

                  <td style={styles.tdStrong}>
                    {fmtMoney(employee.netSalary ?? 0)}
                  </td>

                  <td style={styles.td}>
                    {employee.isPaid ? t("مدفوع") : t("معلق")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Footer */}
      <div style={styles.footer}>
        <span>{t("تقرير الأجور والمرتبات")}</span>

        <span>
          {t("الفترة:")} {formatDate(startDate)} — {formatDate(endDate)}
        </span>

        <span>{t("عدد الموظفين:")} {employees.length}</span>
      </div>
    </div>
  );
}

const styles = {
  page: {
    width: "100%",
    minHeight: "100%",
    padding: "4px",
    background: "#fff",
    color: "#0A2540",
    fontFamily: '"Tajawal", "Cairo", Arial, sans-serif',
    fontSize: "10px",
  },

  header: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "20px",
    paddingBottom: "12px",
    borderBottom: "2px solid #0A2540",
  },

  title: {
    margin: 0,
    fontSize: "21px",
    fontWeight: 800,
  },

  subtitle: {
    margin: "4px 0 0",
    color: "#6F7C75",
    fontSize: "10px",
  },

  dateBox: {
    textAlign: "left",
    color: "#6F7C75",
    fontSize: "9px",
    lineHeight: 1.7,
  },

  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
    gap: "7px",
    marginTop: "12px",
  },

  statBox: {
    minHeight: "55px",
    padding: "7px",
    border: "1px solid #E2E7E4",
    borderRadius: "7px",
    background: "#fff",
  },

  statTitle: {
    color: "#6F7C75",
    fontSize: "8px",
  },

  statValue: {
    marginTop: "3px",
    fontSize: "12px",
    fontWeight: 800,
  },

  paymentSummary: {
    display: "flex",
    flexWrap: "wrap",
    gap: "20px",
    marginTop: "10px",
    padding: "8px 10px",
    border: "1px solid #E2E7E4",
    borderRadius: "7px",
    background: "#F7F9F8",
    fontSize: "9px",
  },

  section: {
    marginTop: "15px",
  },

  sectionTitle: {
    margin: "0 0 7px",
    fontSize: "13px",
    fontWeight: 800,
  },

  th: {
    padding: "6px 5px",
    border: "1px solid #C9D2CD",
    background: "#EFF2F0",
    fontSize: "8px",
    fontWeight: 800,
    textAlign: "right",
    whiteSpace: "nowrap",
  },

  td: {
    padding: "6px 5px",
    border: "1px solid #E2E7E4",
    fontSize: "8px",
    textAlign: "right",
    verticalAlign: "middle",
  },

  tdStrong: {
    padding: "6px 5px",
    border: "1px solid #E2E7E4",
    fontSize: "8px",
    fontWeight: 800,
    textAlign: "right",
    verticalAlign: "middle",
  },

  empty: {
    padding: "20px",
    border: "1px dashed #C9D2CD",
    borderRadius: "7px",
    color: "#6F7C75",
    textAlign: "center",
  },

  footer: {
    display: "flex",
    justifyContent: "space-between",
    gap: "15px",
    marginTop: "18px",
    paddingTop: "8px",
    borderTop: "1px solid #E2E7E4",
    color: "#6F7C75",
    fontSize: "8px",
  },
};
