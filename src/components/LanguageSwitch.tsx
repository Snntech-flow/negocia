"use client";
import { useEffect, useRef } from "react";
import { LANGUAGE_NAMES, LOCALES, type Locale } from "@/lib/i18n";
import { useI18n } from "./I18nProvider";

const LANGUAGE_FLAGS: Record<Locale, string> = {
  "pt-BR": "🇧🇷", en: "🇺🇸", es: "🇪🇸", "pt-PT": "🇵🇹",
};

export default function LanguageSwitch() {
  const { locale, setLocale, t } = useI18n();
  const dropdown = useRef<HTMLDetailsElement>(null);
  const trigger = useRef<HTMLElement>(null);

  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !dropdown.current?.contains(event.target) && dropdown.current) dropdown.current.open = false;
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && dropdown.current?.open) {
        dropdown.current.open = false;
        trigger.current?.focus();
      }
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  return <details ref={dropdown} className="relative shrink-0">
    <summary ref={trigger} aria-label={`${t("Idioma")}: ${LANGUAGE_NAMES[locale]}`} title={LANGUAGE_NAMES[locale]}
      className="flex cursor-pointer list-none items-center justify-center rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-xl outline-offset-4 [&::-webkit-details-marker]:hidden">
      <span aria-hidden="true">{LANGUAGE_FLAGS[locale]}</span>
    </summary>
    <ul aria-label={t("Idioma")} className="absolute right-0 z-50 mt-2 w-56 max-w-[calc(100vw-2rem)] rounded-xl border border-slate-700 bg-slate-900 p-1.5 text-white shadow-xl">
      {LOCALES.map((language) => <li key={language}>
        <button type="button" lang={language} aria-pressed={locale === language}
          onClick={() => { setLocale(language); if (dropdown.current) dropdown.current.open = false; trigger.current?.focus(); }}
          className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-[#242427] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#f59e0b] ${locale === language ? "bg-[#242427] font-bold text-[#f59e0b]" : "text-[#ffffff]"}`}>
          <span aria-hidden="true" className="text-xl">{LANGUAGE_FLAGS[language]}</span>
          <span>{LANGUAGE_NAMES[language]}</span>
        </button>
      </li>)}
    </ul>
  </details>;
}
