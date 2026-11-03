"use client";
import { Languages } from "lucide-react";
import { LANGUAGE_NAMES, LOCALES, isLocale } from "@/lib/i18n";
import { useI18n } from "./I18nProvider";

export default function LanguageSwitch() {
  const { locale, setLocale, t } = useI18n();
  return <label className="inline-flex min-w-0 items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-white">
    <Languages className="h-4 w-4 shrink-0" aria-hidden="true" />
    <span className="sr-only">{t("Idioma")}</span>
    <select value={locale} onChange={(event) => { if (isLocale(event.target.value)) setLocale(event.target.value); }} className="min-w-0 max-w-32 bg-slate-900 text-xs text-white outline-offset-4 sm:max-w-40">
      {LOCALES.map((language) => <option key={language} value={language} lang={language}>{LANGUAGE_NAMES[language]}</option>)}
    </select>
  </label>;
}
