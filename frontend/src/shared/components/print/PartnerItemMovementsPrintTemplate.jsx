import { formatDate } from "../../../lib/date.js";
import { t } from "../../../i18n";
import { getLocale } from "../../../i18n";
export default function PartnerItemMovementsPrintTemplate({ data, filters }) {
  const rows = data?.movements ?? [];

  const summary = data?.summary ?? {
    totalSalesQuantity: 0,
    totalPurchaseQuantity: 0,
    totalSalesWeight: 0,
    totalPurchaseWeight: 0,
  };

  const fmt = (v) =>
    Number(v ?? 0).toLocaleString(getLocale(), { maximumFractionDigits: 2 });

  const movementLabel = (type) => {
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

  return (
    <div
      style={{ padding: 24, fontFamily: "Cairo, sans-serif", direction: "rtl" }}
    >
      <h2 style={{ textAlign: "center", marginBottom: 4 }}>
        {t("حركة صنف:")} {data?.itemName || "-"}
      </h2>

      <p style={{ textAlign: "center", marginBottom: 16, color: "#55635C" }}>
        {t("العميل / المورد:")} {data?.businessPartnerName || "-"}
      </p>

      {(filters?.fromDate || filters?.toDate) && (
        <p style={{ textAlign: "center", marginBottom: 16, fontSize: 12 }}>
          {t("الفترة من")} {filters?.fromDate ? formatDate(filters?.fromDate) : "—"} {t("إلى")} {filters?.toDate ? formatDate(filters?.toDate) : "—"}
        </p>
      )}

      {/* Summary */}
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          marginBottom: 20,
          fontSize: 13,
        }}
      >
        <tbody>
          <tr>
            <td style={cellStyle}>{t("إجمالي كمية المبيعات")}</td>
            <td style={cellStyle}>{fmt(summary.totalSalesQuantity)}</td>
            <td style={cellStyle}>{t("إجمالي كمية المشتريات")}</td>
            <td style={cellStyle}>{fmt(summary.totalPurchaseQuantity)}</td>
          </tr>
          <tr>
            <td style={cellStyle}>{t("إجمالي وزن المبيعات")}</td>
            <td style={cellStyle}>{fmt(summary.totalSalesWeight)}</td>
            <td style={cellStyle}>{t("إجمالي وزن المشتريات")}</td>
            <td style={cellStyle}>{fmt(summary.totalPurchaseWeight)}</td>
          </tr>
        </tbody>
      </table>

      {/* Movements table */}
      <table
        style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}
      >
        <thead>
          <tr>
            <th style={headStyle}>{t("رقم الفاتورة")}</th>
            <th style={headStyle}>{t("التاريخ")}</th>
            <th style={headStyle}>{t("الحركة")}</th>
            <th style={headStyle}>{t("العدد")}</th>
            <th style={headStyle}>{t("الوزن")}</th>
            <th style={headStyle}>{t("الكمية")}</th>
            <th style={headStyle}>{t("السعر")}</th>
            <th style={headStyle}>{t("الإجمالي")}</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((row, i) => (
            <tr key={`${row.invoiceId}-${i}`}>
              <td style={cellStyle}>{row.invoiceNumber || "-"}</td>
              <td style={cellStyle}>{row.invoiceDate ? formatDate(row.invoiceDate) : "-"}</td>
              <td style={cellStyle}>{movementLabel(row.movementType)}</td>
              <td style={cellStyle}>{fmt(row.count)}</td>
              <td style={cellStyle}>{fmt(row.weight)}</td>
              <td style={cellStyle}>{fmt(row.quantity)}</td>
              <td style={cellStyle}>{fmt(row.unitPrice)}</td>
              <td style={cellStyle}>{fmt(row.totalAmount)}</td>
            </tr>
          ))}
        </tbody>

        <tfoot>
          <tr style={{ fontWeight: "bold" }}>
            <td style={cellStyle} colSpan={3}>
              {t("إجمالي النتائج")}
            </td>
            <td style={cellStyle}>
              {fmt(rows.reduce((s, r) => s + (Number(r.count) || 0), 0))}
            </td>
            <td style={cellStyle}>
              {fmt(rows.reduce((s, r) => s + (Number(r.weight) || 0), 0))}
            </td>
            <td style={cellStyle}>
              {fmt(rows.reduce((s, r) => s + (Number(r.quantity) || 0), 0))}
            </td>
            <td style={cellStyle}></td>
            <td style={cellStyle}>
              {fmt(rows.reduce((s, r) => s + (Number(r.totalAmount) || 0), 0))}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

const cellStyle = {
  border: "1px solid #C9D2CD",
  padding: "6px 8px",
  textAlign: "center",
};

const headStyle = {
  ...cellStyle,
  background: "#EFF2F0",
  fontWeight: "bold",
};
