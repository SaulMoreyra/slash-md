import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import es from "./locales/es.json";
import {
  isAppLocale,
  localeMeta,
  LOCALE_STORAGE_KEY,
  LOCALES,
  type AppLocale,
} from "./locales";

export { LOCALES, isAppLocale, localeMeta, LOCALE_STORAGE_KEY, type AppLocale };

export function detectLocale(): AppLocale {
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored && isAppLocale(stored)) {
      return stored;
    }
  } catch {
    /* ignore */
  }
  if (typeof navigator !== "undefined") {
    const nav = navigator.language.toLowerCase();
    const match = LOCALES.find((locale) => nav === locale.id || nav.startsWith(`${locale.id}-`));
    if (match) {
      return match.id;
    }
  }
  return "es";
}

export function toHeroLocale(lng: string): string {
  const id = normalizeLocale(lng);
  return localeMeta(id).hero;
}

export function normalizeLocale(lng: string): AppLocale {
  const lower = lng.toLowerCase();
  const match = LOCALES.find((locale) => lower === locale.id || lower.startsWith(`${locale.id}-`));
  return match?.id ?? "es";
}

export async function changeLanguage(lng: AppLocale): Promise<void> {
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, lng);
  } catch {
    /* ignore */
  }
  document.documentElement.lang = lng;
  await i18n.changeLanguage(lng);
}

const initial = detectLocale();
document.documentElement.lang = initial;

void i18n.use(initReactI18next).init({
  resources: {
    es: { translation: es },
    en: { translation: en },
  },
  lng: initial,
  fallbackLng: "es",
  supportedLngs: LOCALES.map((locale) => locale.id),
  interpolation: { escapeValue: false },
});

export default i18n;
