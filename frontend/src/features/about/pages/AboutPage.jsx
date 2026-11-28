import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  Boxes,
  Brain,
  Code2,
  Globe,
  Landmark,
  Lightbulb,
  Monitor,
  ReceiptText,
  Smartphone,
  Users,
  Wrench,
} from "lucide-react";

import { Facebook, Linkedin } from "../../../shared/components/brand/BrandIcons";
import { t, getDir } from "../../../i18n";
import { DEVSQUAD } from "../../../shared/components/brand/devSquad";
import ContactNumbers from "../../../shared/components/brand/ContactNumbers";

// Only things that exist in this repository are listed here.
const PRODUCT_AREAS = [
  { icon: ReceiptText, title: "المبيعات والمشتريات", text: "فواتير المبيعات والمشتريات والمرتجعات وأسعار الأصناف." },
  { icon: Boxes, title: "المخزون", text: "المخازن وحركة الأصناف والجرد وتكلفة المخزون." },
  { icon: Landmark, title: "الخزينة والحسابات", text: "الخزائن والسندات والقيود والرواتب والتقارير المالية." },
  { icon: Brain, title: "مركز الذكاء الاصطناعي", text: "مؤشرات وتحليلات محسوبة من بيانات النظام نفسها." },
  { icon: Monitor, title: "نسخة سطح المكتب", text: "تطبيق Electron بجانب الموقع." },
  { icon: Smartphone, title: "تطبيق أندرويد", text: "نسخة للموبايل من نفس النظام." },
];

// The three words are the tagline printed in the company logo.
const PILLARS = [
  { icon: Code2, word: "Code", text: "نبني البرمجيات." },
  { icon: Wrench, word: "Solve", text: "نحل مشكلات العمل." },
  { icon: Lightbulb, word: "Innovate", text: "نطوّر ونبتكر." },
];

const CONTACTS = [
  { href: DEVSQUAD.facebook, icon: Facebook, label: "Facebook", hint: "صفحة الشركة" },
  { href: DEVSQUAD.linkedin, icon: Linkedin, label: "LinkedIn", hint: "صفحة الشركة" },
  { href: DEVSQUAD.website, icon: Globe, label: "Website", hint: "الموقع الرسمي" },
];

export default function AboutPage() {
  const reduce = useReducedMotion();
  const rise = (i = 0) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 16 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.5, delay: 0.15 + i * 0.07, ease: "easeOut" },
        };

  return (
    <main dir={getDir()} className="min-h-[100dvh] w-full bg-paper text-ink-900">
      <header className="relative isolate overflow-hidden bg-[#070d1a] text-white">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary-700/40 via-transparent to-primary-500/25" />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)",
            backgroundSize: "44px 44px",
            maskImage: "radial-gradient(ellipse at 50% 30%, black 20%, transparent 70%)",
            WebkitMaskImage: "radial-gradient(ellipse at 50% 30%, black 20%, transparent 70%)",
          }}
        />
        <div aria-hidden="true" className="pointer-events-none absolute -top-32 start-1/2 h-72 w-[34rem] -translate-x-1/2 rounded-full bg-primary-500/30 blur-3xl rtl:translate-x-1/2" />

        <div className="relative mx-auto max-w-5xl px-4 pb-14 pt-6 sm:px-6 sm:pb-20">
          <Link to="/" className="inline-flex items-center gap-1.5 rounded-lg text-[12px] font-medium text-white/65 outline-none transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-gold-400/60">
            <ArrowRight size={14} aria-hidden="true" className="ltr:rotate-180" />
            {t("الرجوع لتسجيل الدخول")}
          </Link>

          <div className="mt-10 flex flex-col items-center text-center">
            <motion.div
              {...(reduce ? {} : { initial: { opacity: 0, scale: 0.92 }, animate: { opacity: 1, scale: 1 }, transition: { duration: 0.6, ease: "easeOut" } })}
              className="relative"
            >
              <span aria-hidden="true" className="absolute -inset-3 rounded-[2rem] bg-gradient-to-br from-primary-500/50 via-transparent to-gold-400/40 blur-xl" />
              <img
                src="/logo.jpg"
                alt="Dev Squad Solutions"
                width="144"
                height="144"
                className="relative h-28 w-28 rounded-3xl object-cover shadow-2xl ring-1 ring-white/15 sm:h-36 sm:w-36"
              />
            </motion.div>

            <p className="mt-7 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3.5 py-1.5 text-[11px] font-medium tracking-wide text-white/70 backdrop-blur">
              <Users size={12} className="text-gold-400" aria-hidden="true" />
              {t("فريق التطوير")}
            </p>
            <h1 className="mt-4 font-display text-4xl font-bold leading-tight tracking-tight sm:text-5xl" dir="ltr">
              {DEVSQUAD.name}
            </h1>
            <p className="mt-2 bg-gradient-to-r from-gold-400 to-amber-200 bg-clip-text text-base font-semibold tracking-[0.18em] text-transparent" dir="ltr">
              {DEVSQUAD.tagline.toUpperCase()}
            </p>
            <p className="mt-5 max-w-xl text-[15px] leading-8 text-white/70">
              {t("فريق برمجيات طوّر هذا النظام. تجد هنا روابط الفريق وما يشمله النظام.")}
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link to="/portfolio" className="inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-gold-400 to-amber-300 px-5 text-[13px] font-bold text-[#070d1a] outline-none transition-transform hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-white/60">
                {t("أعمال الشركة")}
                <ArrowUpRight size={14} aria-hidden="true" className="rtl:-scale-x-100" />
              </Link>
              {CONTACTS.map(({ href, icon: Icon, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/15 bg-white/[0.07] px-5 text-[13px] font-semibold text-white outline-none backdrop-blur transition-all hover:-translate-y-0.5 hover:border-gold-400/60 hover:bg-white/[0.12] focus-visible:ring-2 focus-visible:ring-gold-400/60"
                >
                  <Icon size={16} />
                  {label}
                </a>
              ))}
            </div>
          </div>
        </div>
        <div aria-hidden="true" className="h-px w-full bg-gradient-to-r from-transparent via-gold-400/50 to-transparent" />
      </header>

      <section className="mx-auto max-w-5xl px-4 pt-10 sm:px-6">
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {PILLARS.map(({ icon: Icon, word, text }, i) => (
            <motion.div key={word} {...rise(i)} className="relative overflow-hidden rounded-2xl border border-ink-200/70 bg-white p-3 text-center shadow-card sm:p-5">
              <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary-500 to-gold-400" />
              <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-primary-500/10 text-primary-500">
                <Icon size={20} aria-hidden="true" />
              </span>
              <p className="mt-3 font-display text-lg font-bold text-ink-900" dir="ltr">{word}</p>
              <p className="mt-1 text-[12px] leading-6 text-ink-500">{t(text)}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <motion.div {...rise()}>
          <h2 className="font-display text-2xl font-bold text-ink-900">{t("ماذا يشمل هذا النظام")}</h2>
          <p className="mt-1 text-[13px] text-ink-500">{t("أقسام النظام الموجودة فعليًا في هذا الإصدار.")}</p>
        </motion.div>
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PRODUCT_AREAS.map(({ icon: Icon, title, text }, i) => (
            <motion.div
              key={title}
              {...rise(i)}
              className="group flex gap-3 rounded-2xl border border-ink-200/70 bg-white p-4 shadow-card transition-[transform,border-color] duration-300 hover:-translate-y-0.5 hover:border-primary-500/40"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-500/10 text-primary-500 transition-colors group-hover:bg-primary-500 group-hover:text-white">
                <Icon size={19} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h3 className="text-[14px] font-bold text-ink-900">{t(title)}</h3>
                <p className="mt-1 text-[12px] leading-6 text-ink-500">{t(text)}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div {...rise()} className="mt-8 rounded-2xl border border-dashed border-ink-300 bg-white/60 p-4 text-[12px] leading-6 text-ink-500">
          {t("تفاصيل أعضاء الفريق وخبراته تُضاف هنا عند اعتمادها من الفريق.")}
        </motion.div>

        <motion.div {...rise()} className="relative mt-8 overflow-hidden rounded-3xl bg-[#070d1a] p-6 text-white sm:p-8">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary-700/40 to-transparent" />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-display text-xl font-bold">{t("تابع الفريق")}</h2>
              <p className="mt-1 text-[13px] text-white/65">{t("روابط الشركة الرسمية.")}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {CONTACTS.map(({ href, icon: Icon, label }) => (
                <a key={label} href={href} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/15 bg-white/[0.07] px-4 text-[12px] font-semibold outline-none transition-colors hover:border-gold-400/60 hover:bg-white/[0.12] focus-visible:ring-2 focus-visible:ring-gold-400/60">
                  <Icon size={14} />
                  {label}
                  <ArrowUpRight size={12} aria-hidden="true" className="rtl:-scale-x-100" />
                </a>
              ))}
            </div>
          </div>
        </motion.div>

        <div className="mt-6">
          <h2 className="font-display text-lg font-bold text-ink-900">{t("للتواصل")}</h2>
          <ContactNumbers tone="light" callLabel={t("اتصال")} className="mt-3" />
        </div>

        <p className="mt-8 text-center text-[11px] text-ink-400">
          © {new Date().getFullYear()} {DEVSQUAD.name}. {t("جميع الحقوق محفوظة")}
        </p>
      </section>
    </main>
  );
}
