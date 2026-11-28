import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  Boxes,
  Brain,
  Building2,
  Globe,
  Languages,
  Layers,
  Mail,
  Smartphone,
  Workflow,
  Monitor,
} from "lucide-react";

import { Linkedin } from "../../../shared/components/brand/BrandIcons";
import ContactNumbers from "../../../shared/components/brand/ContactNumbers";
import { DEVSQUAD } from "../../../shared/components/brand/devSquad";
import { getDir, getLang, setLang } from "../../../i18n";

// Facts come from the company's public website and LinkedIn page (checked 2026-11-28).
// No client names, counts or testimonials are invented here.
const C = {
  ar: {
    back: "الرجوع",
    toggle: "English",
    eyebrow: "شركة برمجيات",
    title: "نبني الأنظمة التي ستكبر عليها شركتك",
    sub: "Dev Squad Solutions شركة تطوير برمجيات تبني وتطبّق حلولًا لإدارة الأعمال لأي شركة: من الفكرة إلى نظام يعمل، بتصميم عربي كامل وتسليم قابل للتوسع.",
    cta: "تواصل معنا",
    seeWork: "شاهد أعمالنا",
    facts: [
      { v: "6", l: "مجالات تقنية نغطيها" },
      { v: "4", l: "خطوات واضحة من الفكرة للتسليم" },
      { v: "51-200", l: "حجم الشركة على لينكدإن" },
    ],
    aboutT: "من نحن",
    about: [
      "Dev Squad Solutions فريق تطوير برمجيات يعمل مع عملاء حول العالم. نركّز على المنتجات التي تُستخدم فعلًا في العمل اليومي: أنظمة حسابات ومخازن ومبيعات، ومنصات حجز، وتطبيقات موبايل، وحلول ذكاء اصطناعي.",
      "نؤمن أن أي شركة، صغيرة كانت أو كبيرة، تستحق نظامًا يناسب طريقة عملها بدل أن تغيّر عملها ليناسب برنامجًا جاهزًا. لذلك نبدأ بالاستماع، ثم نصمم، ثم ننفذ على مراحل يمكنك متابعتها أولًا بأول.",
    ],
    servicesT: "ما الذي نقدمه",
    servicesS: "ستة مجالات تقنية تغطي احتياج أي شركة.",
    services: [
      { i: "mobile", n: "تطبيقات الموبايل", d: "تطبيقات iOS وAndroid بتجربة استخدام سلسة، من الفكرة حتى النشر على المتاجر." },
      { i: "ai", n: "حلول الذكاء الاصطناعي", d: "دمج نماذج الذكاء الاصطناعي في منتجك: أتمتة، ومحادثة آلية، وتحليل بيانات، وتوصيات ذكية." },
      { i: "erp", n: "أنظمة ERP", d: "أنظمة إدارة موارد المؤسسات: الحسابات والمخازن والمبيعات والموارد البشرية في مكان واحد." },
      { i: "saas", n: "منصات SaaS", d: "منتجات اشتراك جاهزة للسوق بنظام باقات وفوترة وتعدد مستخدمين من اليوم الأول." },
      { i: "web", n: "منصات الويب", d: "مواقع ولوحات تحكم سريعة ومتجاوبة مبنية على أساس تقني قابل للتوسع." },
      { i: "ent", n: "برمجيات المؤسسات", d: "أنظمة داخلية مخصصة للشركات الكبيرة بتكامل مع الأنظمة القائمة لديك." },
    ],
    processT: "طريقة العمل",
    processS: "من الفكرة إلى التسليم في أربع خطوات.",
    process: [
      { n: "الفهم", d: "نستمع إلى مشكلتك واحتياج عملك جيدًا قبل كتابة أي سطر برمجي." },
      { n: "التصميم", d: "نضع مخططًا للنظام والواجهات قبل التنفيذ حتى لا تكون هناك مفاجآت." },
      { n: "التنفيذ", d: "تطوير على مراحل، وتستطيع رؤية المنتج وتجربته أولًا بأول." },
      { n: "التسليم والدعم", d: "تسليم كامل للكود ودعم فني بعد الإطلاق لأي تعديل أو توسعة." },
    ],
    step: "خطوة",
    workT: "أعمال منشورة",
    workS: "نماذج من أعمال الشركة المعلنة على موقعها. معظم المشاريع مرتبطة باتفاقيات سرية مع العملاء، لذلك لا نعرض كل شيء.",
    works: [
      { m: "منصة استشارات قانونية، ويب وموبايل", n: "يمتاز (Ymtaz)", d: "منصة سعودية تقدّم الاستشارات والخدمات القانونية للأفراد والشركات، بتطبيق موبايل ونظام حجز مواعيد ودليل أنظمة متكامل.", l: "https://www.ymtaz.sa", b: "زيارة المنصة" },
      { m: "نظام ERP، لوحة تحكم محاسبية", n: "نظام ERP المحاسبي", d: "لوحة تحكم لإدارة الحسابات والعمليات المالية للشركات بتصميم عربي كامل وتقارير مباشرة. النظام الكامل خاص بالعميل.", l: "https://erp-sys-v1.vercel.app/dashboard", b: "زيارة اللوحة" },
      { m: "مركز حجامة واستشفاء، حجز إلكتروني", n: "CORE S+", d: "منصة حجز إلكتروني لمركز علاجي بنظام حجز خطوة بخطوة (الخدمة، الموعد، البيانات، التأكيد) وتصميم عربي كامل من اليمين لليسار.", l: "https://higamaplatform.com/", b: "زيارة الموقع" },
    ],
    thisT: "هذا النظام",
    this: "هذا النظام الذي تستخدمه الآن من تطوير الفريق نفسه: مبيعات ومشتريات ومخزون وخزينة وحسابات ورواتب وتقارير ومركز ذكاء اصطناعي، على الويب وسطح المكتب وأندرويد.",
    contactT: "عندك فكرة؟ لنبنيها معًا",
    contactS: "تواصل معنا وسنرد عليك بخطة واضحة لمشروعك. اضغط للاتصال أو للمراسلة على واتساب.",
    call: "اتصال",
    email: "البريد الإلكتروني",
    links: "روابط الشركة",
    site: "الموقع الرسمي",
    rights: "جميع الحقوق محفوظة",
  },
  en: {
    back: "Back",
    toggle: "العربية",
    eyebrow: "Software company",
    title: "We build the systems your company will grow on",
    sub: "Dev Squad Solutions is a software company that builds and applies business software for any company: from an idea to a working system, with full Arabic design and scalable hand-over.",
    cta: "Contact us",
    seeWork: "See our work",
    facts: [
      { v: "6", l: "technical areas we cover" },
      { v: "4", l: "clear steps from idea to delivery" },
      { v: "51-200", l: "company size on LinkedIn" },
    ],
    aboutT: "Who we are",
    about: [
      "Dev Squad Solutions is a software development team working with clients worldwide. We focus on products people use every day at work: accounting, inventory and sales systems, booking platforms, mobile apps and AI solutions.",
      "Any company, small or large, deserves a system that fits how it works instead of bending the business around an off-the-shelf program. So we listen first, then design, then build in stages you can follow as we go.",
    ],
    servicesT: "What we do",
    servicesS: "Six technical areas that cover what a company needs.",
    services: [
      { i: "mobile", n: "Mobile apps", d: "iOS and Android apps with smooth UX, from concept through store launch." },
      { i: "ai", n: "AI solutions", d: "Bringing AI into your product: automation, chatbots, data analysis and smart recommendations." },
      { i: "erp", n: "ERP systems", d: "Enterprise resource planning: accounting, inventory, sales and HR in one place." },
      { i: "saas", n: "SaaS platforms", d: "Market-ready subscription products with plans, billing and multi-tenancy from day one." },
      { i: "web", n: "Web platforms", d: "Fast, responsive sites and dashboards on a technical base that scales." },
      { i: "ent", n: "Enterprise software", d: "Custom internal systems for larger companies, integrated with the systems you already run." },
    ],
    processT: "How we work",
    processS: "From idea to delivery in four steps.",
    process: [
      { n: "Understand", d: "We listen closely to your problem and business need before writing a line of code." },
      { n: "Design", d: "We lay out the system and the screens before building, so there are no surprises." },
      { n: "Build", d: "Development in stages, and you can see and try the product as it grows." },
      { n: "Deliver and support", d: "Full code hand-over and technical support after launch for any change or extension." },
    ],
    step: "Step",
    workT: "Published work",
    workS: "Examples the company shows on its own website. Most projects are under client NDAs, so not everything is shown.",
    works: [
      { m: "Legal advisory platform, web and mobile", n: "Ymtaz", d: "A Saudi platform offering legal advisory and services for individuals and companies, with a mobile app, appointment booking and a legal-guide system.", l: "https://www.ymtaz.sa", b: "Visit platform" },
      { m: "ERP, accounting dashboard", n: "Accounting ERP", d: "A dashboard for managing company accounts and financial operations with full Arabic design and live reports. The full system belongs to the client.", l: "https://erp-sys-v1.vercel.app/dashboard", b: "Visit dashboard" },
      { m: "Hijama and wellness centre, online booking", n: "CORE S+", d: "An online booking platform for a specialised clinic, with a step-by-step flow (service, time slot, details, confirmation) and full Arabic RTL design.", l: "https://higamaplatform.com/", b: "Visit site" },
    ],
    thisT: "This system",
    this: "The system you are using now was built by the same team: sales, purchases, inventory, treasury, accounting, payroll, reports and an AI centre, on web, desktop and Android.",
    contactT: "Have an idea? Let us build it together",
    contactS: "Get in touch and we will come back with a clear plan for your project. Tap to call or message on WhatsApp.",
    call: "Call",
    email: "Email",
    links: "Company links",
    site: "Official website",
    rights: "All rights reserved",
  },
};

const ICONS = { mobile: Smartphone, ai: Brain, erp: Boxes, saas: Layers, web: Globe, ent: Building2 };

export default function PortfolioPage() {
  const lang = getLang();
  const c = C[lang] || C.ar;
  const reduce = useReducedMotion();
  const rise = (i = 0) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 16 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.45, delay: Math.min(i, 5) * 0.06, ease: "easeOut" },
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
        <div className="relative mx-auto max-w-5xl px-4 pb-14 pt-6 sm:px-6 sm:pb-20">
          <div className="flex items-center justify-between">
            <Link to="/about" className="inline-flex items-center gap-1.5 text-[12px] font-medium text-white/65 outline-none transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-gold-400/60">
              <ArrowRight size={14} aria-hidden="true" className="ltr:rotate-180" />
              {c.back}
            </Link>
            <button
              type="button"
              onClick={() => setLang(lang === "ar" ? "en" : "ar")}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/15 bg-white/[0.07] px-3 text-[12px] font-semibold outline-none transition-colors hover:border-gold-400/60 focus-visible:ring-2 focus-visible:ring-gold-400/60"
            >
              <Languages size={14} aria-hidden="true" />
              {c.toggle}
            </button>
          </div>

          <div className="mt-10 flex flex-col items-center text-center">
            <img src="/logo.jpg" alt="Dev Squad Solutions" width="96" height="96" className="h-20 w-20 rounded-2xl object-cover shadow-2xl ring-1 ring-white/15 sm:h-24 sm:w-24" />
            <p className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3.5 py-1.5 text-[11px] font-medium tracking-wide text-white/70">
              <Workflow size={12} className="text-gold-400" aria-hidden="true" />
              {c.eyebrow}
            </p>
            <h1 className="mt-4 max-w-3xl text-3xl font-bold leading-snug tracking-tight sm:text-5xl sm:leading-tight">{c.title}</h1>
            <p className="mt-2 bg-gradient-to-r from-gold-400 to-amber-200 bg-clip-text text-sm font-semibold tracking-[0.18em] text-transparent" dir="ltr">
              DEV SQUAD SOLUTIONS
            </p>
            <p className="mt-5 max-w-2xl text-[15px] leading-8 text-white/70">{c.sub}</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <a href="#contact" className="inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-gold-400 to-amber-300 px-6 text-[13px] font-bold text-[#070d1a] outline-none transition-transform hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-white/60">
                {c.cta}
              </a>
              <a href="#work" className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/15 bg-white/[0.07] px-6 text-[13px] font-semibold outline-none transition-all hover:-translate-y-0.5 hover:border-gold-400/60 focus-visible:ring-2 focus-visible:ring-gold-400/60">
                {c.seeWork}
              </a>
            </div>
          </div>
        </div>
        <div aria-hidden="true" className="h-px w-full bg-gradient-to-r from-transparent via-gold-400/50 to-transparent" />
      </header>

      <section className="mx-auto max-w-5xl px-4 pt-10 sm:px-6">
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {c.facts.map((f, i) => (
            <motion.div key={f.l} {...rise(i)} className="relative overflow-hidden rounded-2xl border border-ink-200/70 bg-white p-3 text-center shadow-card sm:p-5">
              <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary-500 to-gold-400" />
              <p className="font-display text-xl font-bold text-primary-500 sm:text-3xl" dir="ltr">{f.v}</p>
              <p className="mt-1 text-[11px] leading-5 text-ink-500 sm:text-[12px]">{f.l}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 pt-12 sm:px-6">
        <motion.h2 {...rise()} className="text-2xl font-bold">{c.aboutT}</motion.h2>
        <div className="mt-4 space-y-4 text-[14px] leading-8 text-ink-600">
          {c.about.map((p) => (
            <motion.p key={p.slice(0, 20)} {...rise()}>{p}</motion.p>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 pt-12 sm:px-6">
        <motion.div {...rise()}>
          <h2 className="text-2xl font-bold">{c.servicesT}</h2>
          <p className="mt-1 text-[13px] text-ink-500">{c.servicesS}</p>
        </motion.div>
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {c.services.map((s, i) => {
            const Icon = ICONS[s.i] || Monitor;
            return (
              <motion.div key={s.i} {...rise(i)} className="group flex gap-3 rounded-2xl border border-ink-200/70 bg-white p-4 shadow-card transition-[transform,border-color] duration-300 hover:-translate-y-0.5 hover:border-primary-500/40">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-500/10 text-primary-500 transition-colors group-hover:bg-primary-500 group-hover:text-white">
                  <Icon size={19} aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <h3 className="text-[14px] font-bold text-ink-900">{s.n}</h3>
                  <p className="mt-1 text-[12px] leading-6 text-ink-500">{s.d}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 pt-12 sm:px-6">
        <motion.div {...rise()}>
          <h2 className="text-2xl font-bold">{c.processT}</h2>
          <p className="mt-1 text-[13px] text-ink-500">{c.processS}</p>
        </motion.div>
        <ol className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {c.process.map((p, i) => (
            <motion.li key={p.n} {...rise(i)} className="relative overflow-hidden rounded-2xl border border-ink-200/70 bg-white p-4 shadow-card">
              <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary-500 to-gold-400" />
              <p className="text-[11px] font-semibold tracking-widest text-gold-500">{c.step} {String(i + 1).padStart(2, "0")}</p>
              <h3 className="mt-1 text-[15px] font-bold">{p.n}</h3>
              <p className="mt-1 text-[12px] leading-6 text-ink-500">{p.d}</p>
            </motion.li>
          ))}
        </ol>
      </section>

      <section id="work" className="mx-auto max-w-5xl scroll-mt-4 px-4 pt-12 sm:px-6">
        <motion.div {...rise()}>
          <h2 className="text-2xl font-bold">{c.workT}</h2>
          <p className="mt-1 text-[13px] leading-6 text-ink-500">{c.workS}</p>
        </motion.div>
        <div className="mt-6 grid grid-cols-1 gap-3 lg:grid-cols-3">
          {c.works.map((w, i) => (
            <motion.article key={w.n} {...rise(i)} className="flex flex-col rounded-2xl border border-ink-200/70 bg-white p-5 shadow-card">
              <p className="text-[11px] font-semibold text-primary-500">{w.m}</p>
              <h3 className="mt-1 text-lg font-bold" dir="auto">{w.n}</h3>
              <p className="mt-2 flex-1 text-[12px] leading-6 text-ink-500">{w.d}</p>
              <a href={w.l} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-ink-200 text-[12px] font-semibold text-ink-800 outline-none transition-colors hover:border-primary-500/50 hover:text-primary-500 focus-visible:ring-2 focus-visible:ring-primary-500/40">
                {w.b}
                <ArrowUpRight size={13} aria-hidden="true" className="rtl:-scale-x-100" />
              </a>
            </motion.article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 pt-10 sm:px-6">
        <motion.div {...rise()} className="rounded-2xl border border-dashed border-ink-300 bg-white/60 p-4">
          <h3 className="text-[14px] font-bold">{c.thisT}</h3>
          <p className="mt-1 text-[12px] leading-6 text-ink-500">{c.this}</p>
        </motion.div>
      </section>

      <section id="contact" className="mx-auto max-w-5xl scroll-mt-4 px-4 py-12 sm:px-6">
        <motion.div {...rise()} className="relative overflow-hidden rounded-3xl bg-[#070d1a] p-6 text-white sm:p-8">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary-700/40 to-transparent" />
          <div className="relative">
            <h2 className="text-xl font-bold sm:text-2xl">{c.contactT}</h2>
            <p className="mt-2 max-w-xl text-[13px] leading-7 text-white/65">{c.contactS}</p>
            <ContactNumbers className="mt-5" callLabel={c.call} />
            <div className="mt-4 flex flex-wrap gap-2">
              <a href={`mailto:${DEVSQUAD.email}`} className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/15 bg-white/[0.07] px-4 text-[12px] font-semibold outline-none transition-colors hover:border-gold-400/60 focus-visible:ring-2 focus-visible:ring-gold-400/60">
                <Mail size={14} aria-hidden="true" />
                <span dir="ltr">{DEVSQUAD.email}</span>
              </a>
              <a href={DEVSQUAD.linkedin} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/15 bg-white/[0.07] px-4 text-[12px] font-semibold outline-none transition-colors hover:border-gold-400/60 focus-visible:ring-2 focus-visible:ring-gold-400/60">
                <Linkedin size={14} />
                LinkedIn
              </a>
              <a href={DEVSQUAD.website} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/15 bg-white/[0.07] px-4 text-[12px] font-semibold outline-none transition-colors hover:border-gold-400/60 focus-visible:ring-2 focus-visible:ring-gold-400/60">
                <Globe size={14} aria-hidden="true" />
                {c.site}
              </a>
            </div>
          </div>
        </motion.div>
        <p className="mt-8 text-center text-[11px] text-ink-400">
          © {new Date().getFullYear()} {DEVSQUAD.name}. {c.rights}
        </p>
      </section>
    </main>
  );
}
