"use client";

import { createContext, useContext, useMemo, useSyncExternalStore, useEffect } from "react";
import { DEFAULT_LOCALE, isLocale, LOCALE_STORAGE_KEY, translate, type Locale, type Translate } from "@/lib/i18n";

const LANGUAGE_EVENT = "negocialar:language-change";
let memoryLocale: Locale = DEFAULT_LOCALE;
function readLocale(): Locale {
  try {
    const saved = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    return isLocale(saved) ? saved : memoryLocale;
  } catch { return memoryLocale; }
}
function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(LANGUAGE_EVENT, callback);
  return () => { window.removeEventListener("storage", callback); window.removeEventListener(LANGUAGE_EVENT, callback); };
}
function saveLocale(locale: Locale) {
  memoryLocale = locale;
  try { window.localStorage.setItem(LOCALE_STORAGE_KEY, locale); } catch { /* Private browsing still supports this session. */ }
  window.dispatchEvent(new Event(LANGUAGE_EVENT));
}
type I18nValue = { locale: Locale; t: Translate; setLocale: (locale: Locale) => void };
const defaultValue: I18nValue = { locale: DEFAULT_LOCALE, t: ((source, parameters) => translate(DEFAULT_LOCALE, source, parameters)) as Translate, setLocale: () => {} };
const I18nContext = createContext(defaultValue);
export function I18nProvider({ children }: { children: React.ReactNode }) {
  const locale = useSyncExternalStore(subscribe, readLocale, () => DEFAULT_LOCALE);
  const value = useMemo(() => ({ locale, t: ((source, parameters) => translate(locale, source, parameters)) as Translate, setLocale: saveLocale }), [locale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
/** The public site and its shared controls continue in Brazilian Portuguese. */
export function PublicLanguage({ children }: { children: React.ReactNode }) {
  return <I18nContext.Provider value={defaultValue}>{children}</I18nContext.Provider>;
}
export function InteriorLanguage() {
  const { locale } = useI18n();
  useEffect(() => {
    const previous = document.documentElement.lang;
    document.documentElement.lang = locale;
    return () => { document.documentElement.lang = previous; };
  }, [locale]);
  return null;
}
export function useI18n() { return useContext(I18nContext); }
/** Used by the loading UI of lazy components, outside a component's hook scope. */
export function LocalizedText({ source }: { source: string }) {
  return <>{useI18n().t(source)}</>;
}
