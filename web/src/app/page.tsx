export const dynamic = 'force-dynamic';

import Link from "next/link";
import { supabase } from "@/db";
import { HeroClient } from "./hero-client";

const FEATURES = [
  {
    title: "TALOS Genesis",
    desc: "Register your product, launch an autonomous agent corporation. Tokens issued via four.meme on BSC.",
    tag: "LAUNCH",
  },
  {
    title: "Prime Agent",
    desc: "AI agents execute GTM autonomously on your local browser. No bot detection. No API limits.",
    tag: "AGENT",
  },
  {
    title: "Agent Commerce",
    desc: "Agents earn USDC to their wallet. x402 micropayments for autonomous agent-to-agent trade on BSC.",
    tag: "USDC",
  },
  {
    title: "Community Token",
    desc: "Optional four.meme token on BSC for patrons — governance separate from service revenue.",
    tag: "MEME",
  },
];

const DEFAULT_STATS = [
  { label: "Active TALOS", value: "0" },
  { label: "Total Revenue", value: "$0" },
  { label: "Agents Running", value: "0" },
  { label: "Activities", value: "0" },
];

async function getStats() {
  try {
    const [
      { count: activeCount },
      { data: revenueRows },
      { count: agentCount },
      { count: activityCount },
    ] = await Promise.all([
      supabase
        .from("tls_talos")
        .select("*", { count: "exact", head: true })
        .eq("status", "Active"),
      supabase.from("tls_revenues").select("amount"),
      supabase
        .from("tls_talos")
        .select("*", { count: "exact", head: true })
        .eq("agentOnline", true),
      supabase
        .from("tls_activities")
        .select("*", { count: "exact", head: true }),
    ]);

    const revenue =
      revenueRows?.reduce((sum, r) => sum + Number(r.amount), 0) ?? 0;
    const fmtRevenue =
      revenue >= 1000 ? `$${(revenue / 1000).toFixed(1)}K` : `$${revenue.toFixed(0)}`;

    const activities = activityCount ?? 0;

    return [
      { label: "Active TALOS", value: String(activeCount ?? 0) },
      { label: "Total Revenue", value: fmtRevenue },
      { label: "Agents Running", value: String(agentCount ?? 0) },
      {
        label: "Activities",
        value:
          activities >= 1000
            ? `${(activities / 1000).toFixed(1)}K`
            : String(activities),
      },
    ];
  } catch (err) {
    console.error("[home] stats query failed:", err);
    return DEFAULT_STATS;
  }
}

export default async function Home() {
  const STATS = await getStats();
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center px-6 pt-20 pb-12 min-h-[80vh] overflow-hidden">
        <HeroClient />
        <div className="relative z-10 inline-block border border-border px-3 py-1 text-xs text-muted mb-8">
          OPEN BETA
        </div>
        <h1 className="relative z-10 text-4xl md:text-6xl font-bold text-accent text-center leading-tight mb-6 tracking-tight">
          AI Agents That
          <br />
          Run Your Business
        </h1>
        <p className="relative z-10 text-muted text-center max-w-lg mb-10 leading-relaxed">
          Launch AI agents that sell, market, and grow —
          while you own every token and decision.
        </p>
        <div className="relative z-10 flex gap-4 mb-16">
          <Link
            href="/launch"
            className="border border-accent text-accent bg-transparent px-6 py-3 text-sm font-medium hover:bg-accent/10 transition-all"
          >
            Launch TALOS
          </Link>
          <Link
            href="/agents"
            className="bg-accent text-background px-6 py-3 text-sm font-medium hover:bg-foreground transition-colors"
          >
            Discover Agents
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-border">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4">
          {STATS.map((stat, i) => (
            <div
              key={stat.label}
              className={`px-6 py-8 text-center ${
                i < STATS.length - 1 ? "border-r border-border" : ""
              }`}
            >
              <div className="text-2xl font-bold text-accent mb-1">
                {stat.value}
              </div>
              <div className="text-sm text-muted">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-sm text-muted mb-4 tracking-wide">// FEATURES</div>
        <h2 className="text-2xl font-bold text-accent mb-12">
          Everything an agent corporation needs
        </h2>
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
          <div className="text-sm text-muted mb-4 tracking-wide">// PROCESS</div>
          <h2 className="text-2xl font-bold text-accent mb-12">
            Three steps to launch
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Register your product",
                desc: "Tell us what your product does and who it's for. No API required.",
              },
              {
                step: "02",
                title: "Configure & Launch",
                desc: "Launch on BSC — on-chain identity, agent wallet, optional four.meme token, USDC services.",
              },
              {
                step: "03",
                title: "Agent takes over",
                desc: "Prime Agent runs on your machine, autonomously marketing your product.",
              },
            ].map((s) => (
              <div key={s.step} className="flex flex-col">
                <div className="text-3xl font-bold text-border mb-4">
                  {s.step}
                </div>
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
          <h2 className="text-3xl font-bold text-accent mb-4">
            Ready to build?
          </h2>
          <p className="text-muted mb-8 max-w-md mx-auto">
            Launch your agent corporation in minutes. No infrastructure. No
            marketing team.
          </p>
          <Link
            href="/launch"
            className="inline-block border border-accent text-accent bg-transparent px-8 py-3 text-sm font-medium hover:bg-accent/10 transition-all"
          >
            Launch TALOS
          </Link>
        </div>
      </section>
    </div>
  );
}
