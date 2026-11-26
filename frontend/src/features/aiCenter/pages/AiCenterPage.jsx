import { useState } from "react";
import { toast } from "sonner";

import { t } from "../../../i18n";
import {
  useGetKpisQuery,
  useGetAnomaliesQuery,
  useGetSalesForecastQuery,
  useAskAiMutation,
} from "../aiCenterApi";

const card =
  "rounded-2xl border border-ink-400/15 bg-white p-4 dark:border-white/10 dark:bg-ink-900";
const num = (v) =>
  v == null ? "-" : Number(v).toLocaleString("en-GB", { maximumFractionDigits: 2 });
const MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
const KIND_AR = { Sales: "مبيعات", Purchase: "مشتريات" };

export default function AiCenterPage() {
  const { data: kpis, isError: kpiErr } = useGetKpisQuery();
  const { data: anomalies } = useGetAnomaliesQuery();
  const { data: forecast } = useGetSalesForecastQuery();
  const [ask, { isLoading: asking }] = useAskAiMutation();
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState(null);

  const onAsk = async (e) => {
    e.preventDefault();
    if (!question.trim()) return;
    try {
      setAnswer(await ask({ question }).unwrap());
    } catch {
      toast.error(t("تعذر تنفيذ السؤال الآن"));
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-ink-900 dark:text-white">{t("مركز الذكاء الاصطناعي")}</h1>
        <p className="text-[13px] text-ink-500 dark:text-white/60">
          {t("كل الأرقام محسوبة من النظام. الذكاء الاصطناعي يشرحها فقط ولا يحسبها.")}
        </p>
      </div>

      <section className={card}>
        <h2 className="mb-3 text-[15px] font-bold text-ink-900 dark:text-white">{t("المؤشرات الرئيسية")}</h2>
        {kpiErr && <p className="text-[13px] text-red-600">{t("تعذر تحميل المؤشرات")}</p>}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(kpis?.items ?? []).map((k) => (
            <div key={k.code} className="rounded-xl border border-ink-400/15 p-3">
              <div className="text-[12px] text-ink-500 dark:text-white/60">{k.name}</div>
              <div className="mt-1 text-lg font-bold text-ink-900 dark:text-white">
                {num(k.value)} <span className="text-[12px] font-normal">{k.value == null ? "" : k.unit}</span>
              </div>
              <div className="mt-1 text-[11px] text-ink-500 dark:text-white/50">{k.formula}</div>
              {k.note && <div className="mt-1 text-[11px] text-amber-700">{k.note}</div>}
            </div>
          ))}
        </div>
      </section>

      <section className={card}>
        <h2 className="mb-3 text-[15px] font-bold text-ink-900 dark:text-white">{t("توقع المبيعات")}</h2>
        {forecast && !forecast.produced && (
          <p className="text-[13px] text-ink-600 dark:text-white/70">
            {t("لا توجد بيانات كافية للتوقع. نحتاج 6 شهور كاملة على الأقل.")} ({forecast.monthsOfHistory} {t("شهر متاح")})
          </p>
        )}
        {forecast?.produced && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {forecast.months.map((m) => (
              <div key={`${m.year}-${m.month}`} className="rounded-xl border border-ink-400/15 p-3">
                <div className="text-[12px] text-ink-500">{`${t(MONTHS[m.month - 1])} ${m.year}`}</div>
                <div className="mt-1 text-lg font-bold">{num(m.expected)}</div>
                <div className="text-[11px] text-ink-500">{`${num(m.low)} - ${num(m.high)}`}</div>
              </div>
            ))}
          </div>
        )}
        {forecast?.produced && <p className="mt-2 text-[11px] text-ink-500">{t("تقدير فقط بناءً على الشهور السابقة.")}</p>}
      </section>

      <section className={card}>
        <h2 className="mb-3 text-[15px] font-bold text-ink-900 dark:text-white">{t("حالات تحتاج مراجعتك")}</h2>
        {anomalies?.note && <p className="mb-2 text-[12px] text-amber-700">{anomalies.note}</p>}
        {(anomalies?.items ?? []).length === 0 ? (
          <p className="text-[13px] text-ink-600 dark:text-white/70">{t("لا توجد حالات غير طبيعية.")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead className="text-ink-600 dark:text-white/70">
                <tr>
                  <th className="px-2 py-1 text-start">{t("الفاتورة")}</th>
                  <th className="px-2 py-1 text-start">{t("النوع")}</th>
                  <th className="px-2 py-1 text-start">{t("التاريخ")}</th>
                  <th className="px-2 py-1 text-start">{t("المبلغ")}</th>
                  <th className="px-2 py-1 text-start">{t("المعتاد")}</th>
                </tr>
              </thead>
              <tbody>
                {anomalies.items.map((a) => (
                  <tr key={a.reference} className="border-t border-ink-400/10">
                    <td className="px-2 py-1">{a.reference}</td>
                    <td className="px-2 py-1">{t(KIND_AR[a.kind] ?? a.kind)}</td>
                    <td className="px-2 py-1">{a.date}</td>
                    <td className="px-2 py-1">{num(a.amount)}</td>
                    <td className="px-2 py-1">{num(a.median)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-2 text-[11px] text-ink-500">{t("هذه مجرد تنبيهات. لا يتم تغيير أو منع أي شيء تلقائيا.")}</p>
      </section>

      <section className={card}>
        <h2 className="mb-3 text-[15px] font-bold text-ink-900 dark:text-white">{t("اسأل عن أرقامك")}</h2>
        <form onSubmit={onAsk} className="flex flex-col gap-2 sm:flex-row">
          <input
            className="h-[40px] flex-1 rounded-lg border border-ink-400/25 bg-white px-3 text-[13px] dark:bg-ink-900 dark:text-white"
            value={question}
            maxLength={500}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={t("مثال: كم صافي المبيعات هذه السنة؟")}
          />
          <button
            type="submit"
            disabled={asking || !question.trim()}
            className="h-[40px] rounded-lg bg-brand-600 px-5 text-[13px] font-semibold text-white disabled:opacity-50"
          >
            {asking ? t("جاري...") : t("اسأل")}
          </button>
        </form>
        {answer && (
          <div className="mt-3 space-y-2 text-[13px]">
            {answer.answer ? (
              <p className="whitespace-pre-wrap text-ink-900 dark:text-white">{answer.answer}</p>
            ) : (
              <p className="text-amber-700">{answer.note}</p>
            )}
            <p className="text-[11px] text-ink-500">{t("المصدر: أرقام النظام المحسوبة")}</p>
          </div>
        )}
      </section>
    </div>
  );
}
