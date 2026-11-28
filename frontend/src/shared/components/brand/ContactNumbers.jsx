import { MessageCircle, Phone } from "lucide-react";
import { DEVSQUAD } from "./devSquad";

/** Tap-to-call and WhatsApp links for the company numbers. Numbers always render LTR. */
export default function ContactNumbers({ tone = "dark", callLabel = "اتصال", className = "" }) {
  const dark = tone === "dark";
  const box = dark
    ? "border-white/15 bg-white/[0.07] text-white"
    : "border-ink-200/70 bg-white text-ink-900";
  const btn = dark
    ? "border-white/15 hover:border-gold-400/60 hover:bg-white/10"
    : "border-ink-200 hover:border-primary-500/50 hover:bg-primary-500/5";
  return (
    <ul className={`grid gap-3 sm:grid-cols-2 ${className}`}>
      {DEVSQUAD.phones.map((p) => (
        <li key={p.digits} className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-3 ${box}`}>
          <span dir="ltr" className="font-display text-[15px] font-bold tracking-wide" style={{ unicodeBidi: "isolate" }}>
            {p.display}
          </span>
          <span className="flex gap-2">
            <a href={`tel:+${p.digits}`} aria-label={`${callLabel} ${p.display}`} className={`inline-flex h-10 items-center gap-1.5 rounded-lg border px-3 text-[12px] font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-gold-400/60 ${btn}`}>
              <Phone size={14} aria-hidden="true" />
              {callLabel}
            </a>
            <a href={`https://wa.me/${p.digits}`} target="_blank" rel="noopener noreferrer" aria-label={`WhatsApp ${p.display}`} className={`inline-flex h-10 items-center gap-1.5 rounded-lg border px-3 text-[12px] font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-gold-400/60 ${btn}`}>
              <MessageCircle size={14} aria-hidden="true" />
              WhatsApp
            </a>
          </span>
        </li>
      ))}
    </ul>
  );
}
