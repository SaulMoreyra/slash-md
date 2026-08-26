export const LOCALE_STORAGE_KEY = "slashmd.locale";

/** Add a locale here + a `locales/<id>.json` resource to ship another language. */
export const LOCALES = [
  { id: "es", label: "Español", hero: "es-ES" },
  { id: "en", label: "English", hero: "en-US" },
] as const;

export type AppLocale = (typeof LOCALES)[number]["id"];

export function isAppLocale(value: string): value is AppLocale {
  return LOCALES.some((locale) => locale.id === value);
}

export function localeMeta(id: AppLocale): (typeof LOCALES)[number] {
  return LOCALES.find((locale) => locale.id === id) ?? LOCALES[0]!;
}
