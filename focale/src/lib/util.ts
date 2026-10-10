import { site } from "../config/site";

export const PLACEHOLDER_PREFIX = "[DA COMPILARE";

export function isPlaceholder(value: unknown): boolean {
  return typeof value === "string" && value.startsWith(PLACEHOLDER_PREFIX);
}

/** Italian number format: 3.000, 21.600 */
export function num(n: number): string {
  return new Intl.NumberFormat("it-IT", { maximumFractionDigits: 0, useGrouping: "always" }).format(n);
}

/** Price with euro sign after the number, Italian style: "990 €" */
export function euro(n: number): string {
  return `${num(n)} €`;
}

/** Dev fallback so the build works before the real domain exists. */
const FALLBACK_URL = "http://localhost:4321";

export function siteUrl(): string {
  return isPlaceholder(site.url) ? FALLBACK_URL : site.url.replace(/\/$/, "");
}

export function absUrl(path: string): string {
  return new URL(path, siteUrl() + "/").toString();
}

/** Read a dotted path such as "deliveryDays.professionale" from the config. */
function lookup(path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, site);
}

/**
 * Replace {key} and {nested.key} tokens with config values.
 * Unknown tokens are left as they are so mistakes stay visible.
 */
export function fill(text: string, extra: Record<string, string | number> = {}): string {
  return text.replace(/\{([a-zA-Z0-9_.]+)\}/g, (match, key: string) => {
    if (key in extra) return String(extra[key]);
    const value = lookup(key);
    if (typeof value === "number") return num(value);
    if (typeof value === "string") return value;
    return match;
  });
}

export function whatsappHref(message: string): string {
  return `https://wa.me/${site.whatsappNumber}?text=${encodeURIComponent(message)}`;
}

export function telHref(): string {
  return `tel:${site.phoneE164}`;
}

export function mailHref(): string {
  return `mailto:${site.email}`;
}

export const foundersOpen = (): boolean => site.foundersSpotsLeft > 0;

export function plain(text: string): string {
  return text.replace(/\*\*/g, "");
}

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * Like fill(), but returns safe HTML: text is escaped, placeholders are wrapped in
 * <span data-placeholder> and **bold** becomes <strong>.
 */
export function fillHtml(text: string): string {
  const out = escapeHtml(text).replace(/\{([a-zA-Z0-9_.]+)\}/g, (match, key: string) => {
    const value = lookup(key);
    if (typeof value === "number") return num(value);
    if (typeof value === "string") return isPlaceholder(value) ? `<span data-placeholder>${escapeHtml(value)}</span>` : escapeHtml(value);
    return match;
  });
  return out.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}
