import { normalizeLocale } from "./index";

/**
 * Locale-aware relative time for desktop UI.
 * Uses Intl.RelativeTimeFormat — do not use packages/ui relativeTime.
 */
export function relativeTime(iso: string, locale: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) {
    return "";
  }
  const sec = Math.round((t - Date.now()) / 1000);
  const abs = Math.abs(sec);
  const tag = normalizeLocale(locale);
  const rtf = new Intl.RelativeTimeFormat(tag, { numeric: "auto" });

  if (abs < 45) {
    return rtf.format(0, "second");
  }
  if (abs < 3600) {
    return rtf.format(Math.trunc(sec / 60), "minute");
  }
  if (abs < 86400) {
    return rtf.format(Math.trunc(sec / 3600), "hour");
  }
  if (abs < 86400 * 14) {
    return rtf.format(Math.trunc(sec / 86400), "day");
  }
  return new Date(t).toLocaleDateString(tag === "en" ? "en-US" : "es-ES");
}
