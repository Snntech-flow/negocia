import messages from "./messages.json";

export const LOCALES = ["pt-BR", "en", "es", "pt-PT"] as const;
export type Locale = typeof LOCALES[number];
export const DEFAULT_LOCALE: Locale = "pt-BR";
export const LOCALE_STORAGE_KEY = "negocialar:language";
export const LANGUAGE_NAMES: Record<Locale, string> = {
  "pt-BR": "Português (Brasil)", en: "English", es: "Español", "pt-PT": "Português (Portugal)",
};
export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}
const catalog: Record<string, readonly string[]> = messages;
// Only known system-message templates are eligible; free-form fields never call this translator.
const templates = Object.keys(catalog).filter((key) => /\{\d+\}/.test(key) && key.replace(/\{\d+\}/g, "").length >= 12).map((key) => ({
  key,
  positions: [...key.matchAll(/\{(\d+)\}/g)].map((match) => Number(match[1])),
  pattern: new RegExp("^" + key.split(/(\{\d+\})/).map((part) => /^\{\d+\}$/.test(part) ? "([\\s\\S]*?)" : part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("") + "$"),
}));
/** Source strings are stable keys. Values and persisted business codes are never rewritten. */
export function translate(locale: Locale, source: string, parameters?: readonly (string | number | null | undefined)[]): string;
export function translate(locale: Locale, source: string | null | undefined, parameters?: readonly (string | number | null | undefined)[]): string | null | undefined;
export function translate(locale: Locale, source: string | null | undefined, parameters: readonly (string | number | null | undefined)[] = []): string | null | undefined {
  if (typeof source !== "string") return source;
  const index = locale === "en" ? 0 : locale === "es" ? 1 : 2;
  let translated = locale === DEFAULT_LOCALE ? source : catalog[source]?.[index];
  if (translated === undefined && parameters.length === 0 && source.length < 5000) {
    for (const template of templates) {
      const match = template.pattern.exec(source);
      if (!match) continue;
      const values: string[] = [];
      template.positions.forEach((position, index) => { values[position] = match[index + 1]; });
      translated = catalog[template.key][index].replace(/\{(\d+)\}/g, (token, position: string) => values[Number(position)] ?? token);
      break;
    }
  }
  translated ??= source;
  return translated.replace(/\{(\d+)\}/g, (token, position: string) => Number(position) < parameters.length ? String(parameters[Number(position)] ?? "") : token);
}
export type Translate = {
  (source: string, parameters?: readonly (string | number | null | undefined)[]): string;
  (source: string | null | undefined, parameters?: readonly (string | number | null | undefined)[]): string | null | undefined;
};
