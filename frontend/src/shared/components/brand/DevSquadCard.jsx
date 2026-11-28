import { Link } from "react-router-dom";
import { ArrowUpRight, Users } from "lucide-react";
import { Facebook, Linkedin } from "./BrandIcons";

import { t } from "../../../i18n";
import { DEVSQUAD } from "./devSquad";

const linkCls =
  "inline-flex h-9 items-center gap-2 rounded-lg border border-white/15 bg-white/[0.06] px-3 text-[12px] font-semibold text-white/85 outline-none transition-colors hover:border-gold-400/60 hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-gold-400/60";

/**
 * Compact brand card for the login, register and home pages.
 * Always dark so the logo (dark background) blends in on every theme.
 */
export default function DevSquadCard({ className = "" }) {
  return (
    <aside
      aria-label="Dev Squad Solutions"
      className={`relative overflow-hidden rounded-2xl border border-white/10 bg-[#0b1220] p-4 text-white shadow-card print:hidden ${className}`}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -end-10 -top-10 h-32 w-32 rounded-full bg-primary-500/20 blur-2xl"
      />
      <div className="relative flex items-center gap-3">
        <img
          src="/logo.jpg"
          alt="Dev Squad Solutions"
          width="56"
          height="56"
          className="h-14 w-14 shrink-0 rounded-xl object-cover"
        />
        <div className="min-w-0">
          <p className="text-[13px] font-bold leading-5">{DEVSQUAD.name}</p>
          <p className="text-[11px] leading-5 text-white/60" dir="ltr">
            {DEVSQUAD.tagline}
          </p>
          <p className="mt-0.5 text-[11px] leading-5 text-white/60">
            {t("فريق البرمجة الذي طوّر هذا النظام")}
          </p>
        </div>
      </div>
      <div className="relative mt-3 flex flex-wrap gap-2">
        <a href={DEVSQUAD.facebook} target="_blank" rel="noopener noreferrer" className={linkCls}>
          <Facebook size={14} aria-hidden="true" />
          Facebook
        </a>
        <a href={DEVSQUAD.linkedin} target="_blank" rel="noopener noreferrer" className={linkCls}>
          <Linkedin size={14} aria-hidden="true" />
          LinkedIn
        </a>
        <Link to="/about" className={linkCls}>
          <Users size={14} aria-hidden="true" />
          {t("عن الفريق")}
          <ArrowUpRight size={12} aria-hidden="true" className="rtl:-scale-x-100" />
        </Link>
      </div>
    </aside>
  );
}
