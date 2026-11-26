/**
 * Calm, theme-aware panel for empty, error, 404 and 403 states.
 * tone: "neutral" | "error" | "info"
 */
const tones = {
  neutral: "bg-ink-400/10 text-ink-500 dark:bg-white/[0.07] dark:text-white/70",
  error: "bg-negative/10 text-negative dark:bg-negative/20 dark:text-negative-300",
  info: "bg-primary-500/10 text-primary-600 dark:bg-primary-500/20 dark:text-primary-300",
};

export default function StatePanel({
  icon: Icon,
  code,
  title,
  description,
  tone = "neutral",
  children,
  className = "",
}) {
  return (
    <div
      className={`mx-auto w-full max-w-md animate-fadeUp rounded-3xl border border-ink-400/10 bg-white px-8 py-10 text-center shadow-sm dark:border-white/10 dark:bg-white/[0.04] ${className}`}
    >
      {Icon && (
        <div
          className={`mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl ${tones[tone] || tones.neutral}`}
        >
          <Icon size={30} strokeWidth={1.6} />
        </div>
      )}
      {code && (
        <div className="mb-1 text-5xl font-bold tracking-tight text-ink-900/80 dark:text-white/80">
          {code}
        </div>
      )}
      <h2 className="text-lg font-semibold text-ink-900 dark:text-white">{title}</h2>
      {description && (
        <p className="mx-auto mt-2 max-w-sm text-sm leading-7 text-ink-500 dark:text-white/60">
          {description}
        </p>
      )}
      {children && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">{children}</div>
      )}
    </div>
  );
}
