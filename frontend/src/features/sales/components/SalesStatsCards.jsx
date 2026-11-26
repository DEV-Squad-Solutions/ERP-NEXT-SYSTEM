import {
  FileText,
  TrendingUp,
  Wallet,
  AlertCircle,
  BadgePercent,
  Boxes,
} from "lucide-react";

import { t } from "../../../i18n";
import { getLocale } from "../../../i18n";
/**
 * @param {{
 *   summary: {
 *     subtotal: number,
 *     discountAmount: number,
 *     total: number,
 *     paidAmount: number,
 *     remainingAmount: number,
 *   },
 *   isLoading?: boolean
 * }} props
 */
export default function SalesStatsCards({ summary, isLoading }) {
  const cards = [
    {
      label: t("إجمالي قبل الخصم"),
      value: summary?.subtotal,
      icon: TrendingUp,
      tone: "text-ink-900 bg-ink-400/10",
    },
    {
      label: t("الخصم"),
      value: summary?.discountAmount,
      icon: BadgePercent,
      tone: "text-warning bg-warning/10",
    },
    {
      label: t("الإجمالي"),
      value: summary?.total,
      icon: FileText,
      tone: "text-primary-500 bg-primary-50",
    },
    {
      label: t("المدفوع"),
      value: summary?.paidAmount,
      icon: Wallet,
      tone: "text-positive bg-positive/10",
    },
    {
      label: t("المتبقي"),
      value: summary?.remainingAmount,
      icon: AlertCircle,
      tone: "text-negative bg-negative/10",
    },
    {
      label: t("إجمالي الكمية"),
      value: summary?.totalQuantity,
      icon: Boxes,
      tone: "text-blue-500 bg-blue-50",
      isQuantity: true,
    },
  ];

  return (
    <div className="grid grid-cols-1 min-[420px]:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-white rounded-2xl border border-ink-400/10 shadow-card p-4 flex items-center gap-3"
        >
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${card.tone}`}
          >
            <card.icon size={18} />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-xs text-ink-400">{card.label}</p>

            {isLoading ? (
              <div className="h-5 w-16 rounded bg-ink-400/10 animate-pulse mt-1" />
            ) : (
              <p className="num font-bold text-ink-900 text-sm break-words sm:truncate">
                {(Number(card.value) || 0).toLocaleString(getLocale(), {
                  minimumFractionDigits: card.isQuantity ? 0 : 2,
                  maximumFractionDigits: card.isQuantity ? 0 : 2,
                })}
                {card.isQuantity ? "" : t(" ج.م")}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
