"use client";

import { useI18n, type Locale } from "@/lib/i18n";

const LOCALES: { value: Locale; label: string }[] = [
  { value: "en", label: "EN" },
  { value: "zh", label: "中文" },
];

export function LocaleSwitcher() {
  const { locale, setLocale } = useI18n();

  return (
    <div className="flex items-center border border-border">
      {LOCALES.map((l, i) => (
        <button
          key={l.value}
          onClick={() => setLocale(l.value)}
          className={`px-2.5 py-1.5 text-xs font-mono transition-colors ${
            locale === l.value
              ? "bg-surface text-accent"
              : "text-muted hover:text-nav-foreground"
          } ${i > 0 ? "border-l border-border" : ""}`}
          aria-label={`Switch to ${l.label}`}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
