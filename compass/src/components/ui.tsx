// UI primitives: quiet, compact, consistent. Text labels on every control.
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { IconAlert, IconCheck, IconInfo } from "./icons";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "accent";
type Size = "sm" | "md";

const base =
  "btn inline-flex items-center justify-center gap-2 rounded-full font-semibold leading-none text-center whitespace-nowrap select-none disabled:opacity-50 disabled:cursor-not-allowed no-underline";
const sizes: Record<Size, string> = { sm: "h-8 px-3.5 text-[13px]", md: "h-10 px-5 text-[14px]" };
const variants: Record<Variant, string> = {
  primary: "btn-primary bg-primary text-on-primary shadow-[0_1px_2px_rgb(15_40_80/0.14)] hover:bg-primary-hover",
  accent: "btn-accent bg-accent text-surface shadow-[0_1px_2px_rgb(15_40_80/0.14)] hover:opacity-90",
  secondary: "btn-secondary bg-fill text-ink hover:bg-fill-hover",
  ghost: "btn-ghost bg-transparent text-accent hover:bg-fill",
  danger: "btn-danger bg-fill text-bad hover:bg-bad-soft",
};
export const buttonClass = (variant: Variant = "primary", size: Size = "md", wide = false, extra = "") => `${base} ${sizes[size]} ${variants[variant]} ${wide ? "w-full" : ""} ${extra}`;

export function Button({ variant = "primary", size = "md", wide, className = "", ...rest }: ComponentProps<"button"> & { variant?: Variant; size?: Size; wide?: boolean }) {
  return <button className={buttonClass(variant, size, wide, className)} {...rest} />;
}

export function LinkButton({ variant = "primary", size = "md", wide, className = "", ...rest }: ComponentProps<typeof Link> & { variant?: Variant; size?: Size; wide?: boolean }) {
  return <Link className={buttonClass(variant, size, wide, className)} {...rest} />;
}

export function ExternalButton({ variant = "secondary", size = "md", wide, className = "", ...rest }: ComponentProps<"a"> & { variant?: Variant; size?: Size; wide?: boolean }) {
  return <a target="_blank" rel="noopener noreferrer" className={buttonClass(variant, size, wide, className)} {...rest} />;
}

export function Card({ className = "", children, ...rest }: ComponentProps<"div">) {
  return (
    <div className={`rounded-[var(--radius-card)] border border-line/70 bg-surface p-5 shadow-[var(--shadow-card)] ${className}`} {...rest}>
      {children}
    </div>
  );
}

/** Page title, one line of description, optional actions: on the blue gradient band. */
export function PageHeader({ title, description, actions, eyebrow }: { title: string; description?: ReactNode; actions?: ReactNode; eyebrow?: string }) {
  return (
    <header className="hero rise relative mb-7 overflow-hidden rounded-[24px] px-6 py-7 sm:px-8 sm:py-9">
      <span aria-hidden="true" className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
      <span aria-hidden="true" className="pointer-events-none absolute -bottom-28 right-24 h-48 w-48 rounded-full bg-accent-glow/20 blur-3xl" />
      <div className="relative flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          {eyebrow && <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-white/80">{eyebrow}</p>}
          <h1 className="text-[28px] font-bold leading-[1.08] tracking-[-0.028em] sm:text-[38px]">{title}</h1>
          {description && <p className="mt-2.5 max-w-2xl text-[15px] leading-relaxed text-white/90">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </header>
  );
}

export function Notice({ tone = "info", title, children }: { tone?: "info" | "success" | "warn" | "danger"; title?: string; children?: ReactNode }) {
  const styles = {
    info: "bg-accent-soft text-ink border-accent/20",
    success: "bg-good-soft text-ink border-good/20",
    warn: "bg-warn-soft text-ink border-warn/25",
    danger: "bg-bad-soft text-ink border-bad/25",
  }[tone];
  const iconColor = { info: "text-accent", success: "text-good", warn: "text-warn", danger: "text-bad" }[tone];
  const Icon = tone === "success" ? IconCheck : tone === "info" ? IconInfo : IconAlert;
  return (
    <div role={tone === "danger" || tone === "warn" ? "alert" : "status"} className={`flex gap-3 rounded-xl border px-4 py-3.5 text-[14px] ${styles}`}>
      <Icon className={`mt-px shrink-0 ${iconColor}`} size={18} />
      <div className="min-w-0">
        {title && <p className="font-medium">{title}</p>}
        {children && <div className={title ? "mt-0.5 text-muted" : ""}>{children}</div>}
      </div>
    </div>
  );
}

const LEVEL_STYLE = {
  molto: "text-good bg-good-soft",
  adatta: "text-warn bg-warn-soft",
  poco: "text-muted bg-subtle",
} as const;
export const LEVEL_TEXT = { molto: "Molto adatta", adatta: "Adatta", poco: "Poco adatta" } as const;

export function LevelBadge({ level }: { level: "molto" | "adatta" | "poco" }) {
  return (
    <span className={`inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-[12px] font-medium ${LEVEL_STYLE[level]}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {LEVEL_TEXT[level]}
    </span>
  );
}

export function Chip({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "accent" | "good" | "warn" | "bad" }) {
  const t = { neutral: "bg-subtle text-muted", accent: "bg-accent-soft text-accent", good: "bg-good-soft text-good", warn: "bg-warn-soft text-warn", bad: "bg-bad-soft text-bad" }[tone];
  return <span className={`inline-flex h-6 items-center rounded-full px-2.5 text-[12px] font-medium ${t}`}>{children}</span>;
}

export function Field({ label, hint, children, htmlFor }: { label: string; hint?: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-[13px] font-medium text-ink">
        {label}
      </label>
      {children}
      {hint && <p className="text-[12.5px] text-faint">{hint}</p>}
    </div>
  );
}

/** A selectable row with a checkbox or radio inside a label. */
export function ChoiceRow({ type = "checkbox", name, value, defaultChecked, children, hint }: { type?: "checkbox" | "radio"; name: string; value: string; defaultChecked?: boolean; children: ReactNode; hint?: ReactNode }) {
  return (
    <label className="flex min-h-[44px] cursor-pointer items-start gap-3 rounded-xl border border-line bg-surface px-3.5 py-2.5 shadow-[0_1px_1px_rgb(15_40_80/0.03)] transition-colors hover:border-line-strong has-[:checked]:border-accent has-[:checked]:bg-accent-soft has-[:checked]:ring-1 has-[:checked]:ring-accent/30">
      <input type={type} name={name} value={value} defaultChecked={defaultChecked} className="mt-[3px]" />
      <span className="min-w-0 text-[14px]">
        {children}
        {hint && <span className="mt-0.5 block text-[12.5px] text-muted">{hint}</span>}
      </span>
    </label>
  );
}

/** A pill-shaped checkbox, for long lists (sectors, companies). */
export function PillCheck({ name, value, defaultChecked, children }: { name: string; value: string; defaultChecked?: boolean; children: ReactNode }) {
  return (
    <label className="inline-flex min-h-[34px] cursor-pointer items-center gap-2 rounded-full border border-line bg-surface px-3.5 text-[13px] transition-colors hover:border-line-strong has-[:checked]:border-accent has-[:checked]:bg-accent-soft has-[:checked]:font-medium has-[:checked]:text-accent">
      <input type="checkbox" name={name} value={value} defaultChecked={defaultChecked} className="sr-only" />
      <span>{children}</span>
    </label>
  );
}

export function SectionTitle({ children, className = "", action }: { children: ReactNode; className?: string; action?: ReactNode }) {
  return (
    <div className={`mb-3 mt-10 flex items-center justify-between gap-3 ${className}`}>
      <h2 className="text-[19px] font-bold tracking-[-0.02em]">{children}</h2>
      {action}
    </div>
  );
}

export function Fact({ icon, label, children }: { icon?: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex gap-3">
      {icon && <span className="mt-0.5 text-faint">{icon}</span>}
      <div className="min-w-0">
        <p className="text-[12px] font-medium uppercase tracking-[0.06em] text-faint">{label}</p>
        <p className="mt-0.5 text-[14px]">{children}</p>
      </div>
    </div>
  );
}

export function Empty({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-dashed border-line-strong bg-surface/60 px-6 py-12 text-center">
      <span aria-hidden="true" className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-accent-soft text-accent">
        <IconInfo size={20} />
      </span>
      <p className="text-[15.5px] font-semibold">{title}</p>
      {children && <div className="mx-auto mt-1 max-w-md text-[14px] text-muted">{children}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-surface p-4 shadow-[var(--shadow-card)]">
      <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-faint">{label}</p>
      <p className="mt-1 text-[28px] font-bold tracking-[-0.03em] tabular-nums">{value}</p>
      {hint && <p className="mt-0.5 text-[12.5px] text-muted">{hint}</p>}
    </div>
  );
}

/** A row of a settings-style list: label and value on the left, an action on the right. */
export function Row({ label, value, action }: { label: string; value?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5">
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-medium">{label}</p>
        {value && <p className="mt-0.5 truncate text-[13px] text-muted">{value}</p>}
      </div>
      {action}
    </div>
  );
}

export function List({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`divide-y divide-line/80 overflow-hidden rounded-[var(--radius-card)] border border-line/70 bg-surface shadow-[var(--shadow-card)] ${className}`}>{children}</div>;
}
