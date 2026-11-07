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
    <div className="lang-sel bg-white/5 backdrop-blur-md border-white/10">
      {routing.locales.map((l) => (
        <button
          key={l}
          className={`lang-btn transition-all duration-200 hover:text-white ${l === locale ? "on" : ""}`}
          onClick={() => router.replace(pathname, { locale: l })}
        >
          {LABELS[l]}
        </button>
      ))}
    </div>
  );
}
