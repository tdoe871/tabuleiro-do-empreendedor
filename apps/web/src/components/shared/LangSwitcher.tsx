"use client";

import { usePathname } from "@/i18n/navigation";
import { useRouter } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { useLocale } from "next-intl";

const LABELS: Record<Locale, string> = {
  "pt-BR": "🇧🇷 PT",
  es: "🇪🇸 ES",
  en: "🇺🇸 EN",
  fr: "🇫🇷 FR",
};

export function LangSwitcher() {
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="lang-sel bg-[var(--ag-color-surface-solid,#0c2d40)] border-[var(--ag-color-border,rgba(45,212,191,0.24))]">
      {routing.locales.map((l) => (
        <button
          key={l}
          className={`lang-btn transition-all duration-200 hover:text-[var(--ag-color-text,#ecfeff)] ${l === locale ? "on" : ""}`}
          onClick={() => router.replace(pathname, { locale: l })}
        >
          {LABELS[l]}
        </button>
      ))}
    </div>
  );
}
