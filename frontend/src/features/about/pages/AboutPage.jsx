import { Link } from "react-router-dom";
import {
  ArrowRight,
  Boxes,
  Brain,
  Globe,
  Landmark,
  Monitor,
  ReceiptText,
  Smartphone,
  Users,
} from "lucide-react";

import { Facebook, Linkedin } from "../../../shared/components/brand/BrandIcons";
import { t, getDir } from "../../../i18n";
import { DEVSQUAD } from "../../../shared/components/brand/devSquad";

// Only things that exist in this repository are listed here.
const PRODUCT_AREAS = [
  { icon: ReceiptText, title: "المبيعات والمشتريات", text: "فواتير المبيعات والمشتريات والمرتجعات وأسعار الأصناف." },
  { icon: Boxes, title: "المخزون", text: "المخازن وحركة الأصناف والجرد وتكلفة المخزون." },
  { icon: Landmark, title: "الخزينة والحسابات", text: "الخزائن والسندات والقيود والرواتب والتقارير المالية." },
  { icon: Brain, title: "مركز الذكاء الاصطناعي", text: "مؤشرات وتحليلات محسوبة من بيانات النظام نفسها." },
  { icon: Monitor, title: "نسخة سطح المكتب", text: "تطبيق Electron بجانب الموقع." },
  { icon: Smartphone, title: "تطبيق أندرويد", text: "نسخة للموبايل من نفس النظام." },
];

const linkCls =
  "inline-flex h-11 items-center gap-2 rounded-xl border border-white/15 bg-white/[0.07] px-4 text-[13px] font-semibold text-white outline-none transition-colors hover:border-gold-400/60 hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-gold-400/60";

export default function AboutPage() {
  return (
    <main dir={getDir()} className="min-h-[100dvh] w-full bg-paper text-ink-900">
      <header className="relative isolate overflow-hidden bg-[#0b1220] text-white">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 0)",
            backgroundSize: "28px 28px",
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -end-24 -top-24 h-72 w-72 rounded-full bg-primary-500/25 blur-3xl"
        />
        <div className="relative mx-auto max-w-4xl px-4 pb-12 pt-6 sm:px-6 sm:pb-16">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-[12px] font-medium text-white/70 hover:text-white"
          >
            <ArrowRight size={14} aria-hidden="true" className="ltr:rotate-180" />
            {t("الرجوع لتسجيل الدخول")}
          </Link>

          <div className="mt-8 flex flex-col items-center gap-5 text-center sm:flex-row sm:text-start">
            <img
              src="/logo.jpg"
              alt="Dev Squad Solutions"
              width="120"
              height="120"
              className="h-28 w-28 shrink-0 rounded-2xl object-cover shadow-lg ring-1 ring-white/10 sm:h-32 sm:w-32"
            />
            <div className="min-w-0">
              <p className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.07] px-3 py-1 text-[11px] font-medium text-white/70">
                <Users size={12} className="text-gold-400" aria-hidden="true" />
                {t("عن الفريق")}
              </p>
              <h1 className="font-display text-3xl font-bold leading-tight sm:text-4xl" dir="ltr">
                {DEVSQUAD.name}
              </h1>
              <p className="mt-1 text-sm text-gold-400" dir="ltr">
                {DEVSQUAD.tagline}
              </p>
              <p className="mt-3 max-w-xl text-sm leading-7 text-white/70">
                {t("فريق برمجيات طوّر هذا النظام. تجد هنا روابط الفريق وما يشمله النظام.")}
              </p>
            </div>
          </div>

          <div className="mt-7 flex flex-wrap justify-center gap-3 sm:justify-start">
            <a href={DEVSQUAD.facebook} target="_blank" rel="noopener noreferrer" className={linkCls}>
              <Facebook size={16} aria-hidden="true" /> Facebook
            </a>
            <a href={DEVSQUAD.linkedin} target="_blank" rel="noopener noreferrer" className={linkCls}>
              <Linkedin size={16} aria-hidden="true" /> LinkedIn
            </a>
            <a href={DEVSQUAD.website} target="_blank" rel="noopener noreferrer" className={linkCls}>
              <Globe size={16} aria-hidden="true" /> {t("الموقع")}
            </a>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <h2 className="font-display text-xl font-bold text-ink-900">{t("ماذا يشمل هذا النظام")}</h2>
        <p className="mt-1 text-[13px] text-ink-500">
          {t("أقسام النظام الموجودة فعليًا في هذا الإصدار.")}
        </p>
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {PRODUCT_AREAS.map(({ icon: Icon, title, text }) => (
            <div
              key={title}
              className="flex gap-3 rounded-2xl border border-ink-200/70 bg-white p-4 shadow-card"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-500/10 text-primary-500">
                <Icon size={18} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h3 className="text-[14px] font-bold text-ink-900">{t(title)}</h3>
                <p className="mt-1 text-[12px] leading-6 text-ink-500">{t(text)}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-2xl border border-dashed border-ink-300 bg-white/60 p-4 text-[12px] leading-6 text-ink-500">
          {t("تفاصيل أعضاء الفريق وخبراته تُضاف هنا عند اعتمادها من الفريق.")}
        </div>

        <p className="mt-8 text-center text-[11px] text-ink-400">
          © {new Date().getFullYear()} {DEVSQUAD.name}. {t("جميع الحقوق محفوظة")}
        </p>
      </section>
    </main>
  );
}
