"use client";

import Link from "next/link";
import { useTranslation } from "@/lib/i18n";
import { HeroClient } from "./hero-client";

interface Stat {
  label: string;
  value: string;
}

export function HomeContent({ stats }: { stats: Stat[] }) {
  const t = useTranslation();

  const FEATURES = [
    { title: t.home.f1Title, desc: t.home.f1Desc, tag: "LAUNCH" },
    { title: t.home.f2Title, desc: t.home.f2Desc, tag: "AGENT" },
    { title: t.home.f3Title, desc: t.home.f3Desc, tag: "USDC" },
    { title: t.home.f4Title, desc: t.home.f4Desc, tag: "MEME" },
  ];

  const STEPS = [
    { step: "01", title: t.home.s1Title, desc: t.home.s1Desc },
    { step: "02", title: t.home.s2Title, desc: t.home.s2Desc },
    { step: "03", title: t.home.s3Title, desc: t.home.s3Desc },
  ];

  const STAT_LABELS: Record<string, string> = {
    "Active TALOS": t.home.statActiveTalos,
    "Total Revenue": t.home.statTotalRevenue,
    "Agents Running": t.home.statAgentsRunning,
    "Activities": t.home.statActivities,
  };

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center px-6 pt-20 pb-12 min-h-[80vh] overflow-hidden">
        <HeroClient />
        <div className="relative z-10 inline-block border border-border px-3 py-1 text-xs text-muted mb-8">
          {t.home.openBeta}
        </div>
        <h1 className="relative z-10 text-4xl md:text-6xl font-bold text-accent text-center leading-tight mb-6 tracking-tight">
          {t.home.hero1}
          <br />
          {t.home.hero2}
        </h1>
        <p className="relative z-10 text-muted text-center max-w-lg mb-10 leading-relaxed">
          {t.home.subtitle}
        </p>
        <div className="relative z-10 flex gap-4 mb-16">
          <Link
            href="/launch"
            className="border border-accent text-accent bg-transparent px-6 py-3 text-sm font-medium hover:bg-accent/10 transition-all"
          >
            {t.home.launchTalos}
          </Link>
          <Link
            href="/agents"
            className="bg-accent text-background px-6 py-3 text-sm font-medium hover:bg-foreground transition-colors"
          >
            {t.home.discoverAgents}
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-border">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4">
          {stats.map((stat, i) => (
            <div
              key={stat.label}
              className={`px-6 py-8 text-center ${
                i < stats.length - 1 ? "border-r border-border" : ""
              }`}
            >
              <div className="text-2xl font-bold text-accent mb-1">
                {stat.value}
              </div>
              <div className="text-sm text-muted">
                {STAT_LABELS[stat.label] ?? stat.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-sm text-muted mb-4 tracking-wide">{t.home.featuresLabel}</div>
        <h2 className="text-2xl font-bold text-accent mb-12">{t.home.featuresTitle}</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="bg-surface border border-border p-7 hover:bg-surface-hover transition-colors group"
            >
              <div className="text-xs text-muted mb-3">[{f.tag}]</div>
              <h3 className="text-lg font-bold text-accent mb-2 group-hover:text-accent transition-colors">
                {f.title}
              </h3>
              <p className="text-sm text-muted leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-border">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <div className="text-sm text-muted mb-4 tracking-wide">{t.home.processLabel}</div>
          <h2 className="text-2xl font-bold text-accent mb-12">{t.home.processTitle}</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {STEPS.map((s) => (
              <div key={s.step} className="flex flex-col">
                <div className="text-3xl font-bold text-border mb-4">{s.step}</div>
                <h3 className="text-accent font-bold mb-2">{s.title}</h3>
                <p className="text-sm text-muted leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border">
        <div className="max-w-7xl mx-auto px-6 py-20 text-center">
          <h2 className="text-3xl font-bold text-accent mb-4">{t.home.ctaTitle}</h2>
          <p className="text-muted mb-8 max-w-md mx-auto">{t.home.ctaSubtitle}</p>
          <Link
            href="/launch"
            className="inline-block border border-accent text-accent bg-transparent px-8 py-3 text-sm font-medium hover:bg-accent/10 transition-all"
          >
            {t.home.ctaButton}
          </Link>
        </div>
      </section>
    </div>
  );
}
