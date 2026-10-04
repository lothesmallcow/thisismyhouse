// UI primitives. Big targets (>= 56px), text labels always, calm colors.
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { IconAlert, IconCheck, IconInfo } from "./icons";

type Variant = "primary" | "secondary" | "danger" | "quiet" | "success";

const base =
  "inline-flex items-center justify-center gap-3 rounded-2xl px-6 min-h-[58px] text-[1.05rem] font-bold leading-tight text-center transition-colors select-none disabled:opacity-50 disabled:cursor-not-allowed no-underline";
const variants: Record<Variant, string> = {
  primary: "bg-navy text-white hover:bg-navy-strong shadow-[0_6px_16px_-8px_rgb(20_42_64/0.6)]",
  secondary: "bg-card text-navy border-2 border-navy hover:bg-navy-soft",
  danger: "bg-rose-ink text-white hover:bg-[#561409]",
  quiet: "bg-transparent text-navy underline underline-offset-4 decoration-2 hover:bg-navy-soft",
  success: "bg-sage-ink text-white hover:bg-[#123a1e]",
};

export function Button({ variant = "primary", wide, className = "", ...rest }: ComponentProps<"button"> & { variant?: Variant; wide?: boolean }) {
  return <button className={`${base} ${variants[variant]} ${wide ? "w-full" : ""} ${className}`} {...rest} />;
}

export function LinkButton({ variant = "primary", wide, className = "", ...rest }: ComponentProps<typeof Link> & { variant?: Variant; wide?: boolean }) {
  return <Link className={`${base} ${variants[variant]} ${wide ? "w-full" : ""} ${className}`} {...rest} />;
}

export function ExternalButton({ variant = "secondary", wide, className = "", ...rest }: ComponentProps<"a"> & { variant?: Variant; wide?: boolean }) {
  return <a target="_blank" rel="noopener noreferrer" className={`${base} ${variants[variant]} ${wide ? "w-full" : ""} ${className}`} {...rest} />;
}

export function Card({ className = "", children, ...rest }: ComponentProps<"div">) {
  return (
    <div className={`rounded-[var(--radius-card)] border border-line bg-card p-5 sm:p-6 shadow-[var(--shadow-card)] ${className}`} {...rest}>
      {children}
    </div>
  );
}

export function PageHeader({ title, help, children }: { title: string; help: string; children?: ReactNode }) {
  return (
    <header className="mb-6 rise">
      <h1 className="text-[2.1rem] sm:text-[2.5rem] font-semibold leading-[1.1]">{title}</h1>
      <HelpBox text={help} />
      {children}
    </header>
  );
}

/** "Cosa faccio qui?" — always visible, one sentence. */
export function HelpBox({ text }: { text: string }) {
  return (
    <p className="mt-3 flex gap-3 rounded-2xl bg-navy-soft/70 px-4 py-3 text-[1rem] text-ink">
      <IconInfo className="mt-1 shrink-0 text-navy" />
      <span>
        <strong className="text-navy">Cosa faccio qui?</strong> {text}
      </span>
    </p>
  );
}

export function Notice({ tone = "info", title, children }: { tone?: "info" | "success" | "warn" | "danger"; title?: string; children?: ReactNode }) {
  const styles = {
    info: "bg-navy-soft text-ink border-navy/20",
    success: "bg-sage text-sage-ink border-sage-ink/20",
    warn: "bg-amber text-amber-ink border-amber-ink/20",
    danger: "bg-rose text-rose-ink border-rose-ink/25",
  }[tone];
  const Icon = tone === "success" ? IconCheck : tone === "info" ? IconInfo : IconAlert;
  return (
    <div role={tone === "danger" || tone === "warn" ? "alert" : "status"} className={`flex gap-3 rounded-2xl border px-4 py-4 ${styles}`}>
      <Icon className="mt-0.5 shrink-0" size={26} />
      <div>
        {title && <p className="font-bold">{title}</p>}
        {children && <div className="text-[1rem]">{children}</div>}
      </div>
    </div>
  );
}

const LEVEL_STYLE = {
  molto: "bg-sage text-sage-ink",
  adatta: "bg-amber text-amber-ink",
  poco: "bg-mist text-mist-ink",
} as const;
const LEVEL_TEXT = { molto: "Molto adatta", adatta: "Adatta", poco: "Poco adatta" } as const;
const LEVEL_DOTS = { molto: 3, adatta: 2, poco: 1 } as const;

export function LevelBadge({ level }: { level: "molto" | "adatta" | "poco" }) {
  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[0.95rem] font-bold ${LEVEL_STYLE[level]}`}>
      <span className="flex gap-1" aria-hidden="true">
        {[1, 2, 3].map((i) => (
          <span key={i} className={`h-2.5 w-2.5 rounded-full ${i <= LEVEL_DOTS[level] ? "bg-current" : "bg-current/25"}`} />
        ))}
      </span>
      {LEVEL_TEXT[level]}
    </span>
  );
}

export function Field({ label, hint, children, htmlFor }: { label: string; hint?: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="space-y-2">
      <label htmlFor={htmlFor} className="block text-[1.05rem] font-bold">
        {label}
      </label>
      {hint && <p className="text-[0.98rem] text-ink-soft">{hint}</p>}
      {children}
    </div>
  );
}

/** A big tappable row with a checkbox or radio inside a label. */
export function ChoiceRow({ type = "checkbox", name, value, defaultChecked, children }: { type?: "checkbox" | "radio"; name: string; value: string; defaultChecked?: boolean; children: ReactNode }) {
  return (
    <label className="flex min-h-[60px] cursor-pointer items-center gap-4 rounded-2xl border-2 border-line bg-white px-4 py-3 has-[:checked]:border-navy has-[:checked]:bg-navy-soft">
      <input type={type} name={name} value={value} defaultChecked={defaultChecked} />
      <span className="text-[1.02rem]">{children}</span>
    </label>
  );
}

export function SectionTitle({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <h2 className={`mb-3 mt-9 text-[1.55rem] font-semibold ${className}`}>{children}</h2>;
}

export function Fact({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex gap-3 rounded-2xl bg-paper px-4 py-3">
      <span className="mt-1 text-navy">{icon}</span>
      <div>
        <p className="text-[0.95rem] font-bold uppercase tracking-wide text-ink-soft">{label}</p>
        <p className="text-[1.02rem]">{children}</p>
      </div>
    </div>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-[var(--radius-card)] border-2 border-dashed border-line-strong bg-card/60 px-6 py-10 text-center">
      <p className="font-serif text-[1.45rem] font-semibold">{title}</p>
      {children && <div className="mt-2 text-ink-soft">{children}</div>}
    </div>
  );
}
