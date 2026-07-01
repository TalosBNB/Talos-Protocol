"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEvmWallet } from "./providers";
import { ThemeToggle } from "./theme-toggle";
import { LocaleSwitcher } from "./locale-switcher";
import { useTranslation } from "@/lib/i18n";

const X_PROFILE_URL = "https://x.com/talosdotfun/";

function XLogoLink({ className = "" }: { className?: string }) {
  return (
    <a
      href={X_PROFILE_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Talos on X"
      className={`inline-flex items-center justify-center w-8 h-8 text-muted hover:text-nav-foreground transition-colors ${className}`}
    >
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" aria-hidden="true">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    </a>
  );
}

export function Header() {
  const pathname = usePathname();
  const { isConnected, address, connect, disconnect } = useEvmWallet();
  const [menuOpen, setMenuOpen] = useState(false);
  const t = useTranslation();

  const NAV_ITEMS = [
    { href: "/agents", label: t.nav.agents, requiresWallet: false },
    { href: "/activity", label: t.nav.activity, requiresWallet: false },
    { href: "/playbooks", label: t.nav.playbooks, requiresWallet: false },
    { href: "/leaderboard", label: t.nav.leaderboard, requiresWallet: false },
    { href: "/docs", label: t.nav.docs, requiresWallet: false, highlight: true },
  ];

  const truncatedAddress = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : null;

  return (
    <header className="border-b border-border bg-background relative z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
        {/* Left: logo + desktop nav */}
        <div className="flex items-center gap-6 lg:gap-8 min-w-0">
          <Link
            href="/"
            className="text-nav-accent text-3xl sm:text-4xl font-ruthie shrink-0"
            onClick={() => setMenuOpen(false)}
          >
            Talos
          </Link>
          <nav className="hidden md:flex items-center gap-5 lg:gap-6">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`text-sm transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                  item.highlight
                    ? pathname === item.href
                      ? "text-accent font-bold"
                      : "text-accent/80 hover:text-accent font-medium"
                    : pathname === item.href
                      ? "text-nav-accent"
                      : "text-muted hover:text-nav-foreground"
                }`}
              >
                {item.highlight && <span className="text-accent/60">&lt;/&gt;</span>}
                {item.label}
                {item.requiresWallet && !isConnected && (
                  <span className="w-1.5 h-1.5 rounded-full bg-yellow-500/70" title={t.nav.walletRequired} />
                )}
              </Link>
            ))}
          </nav>
        </div>

        {/* Right: desktop actions + mobile hamburger */}
        <div className="flex items-center gap-2 sm:gap-3">
          <XLogoLink />
          <ThemeToggle />
          <LocaleSwitcher />
          {/* Desktop only */}
          {isConnected && (
            <Link
              href="/dashboard"
              className={`hidden md:inline-flex text-sm transition-colors items-center gap-1.5 ${
                pathname === "/dashboard" ? "text-nav-accent" : "text-muted hover:text-nav-foreground"
              }`}
            >
              {t.nav.dashboard}
            </Link>
          )}
          <Link
            href="/launch"
            className={`hidden md:inline-flex px-4 py-2 text-sm font-medium transition-colors ${
              pathname === "/launch"
                ? "bg-accent text-background"
                : "bg-accent/90 text-background hover:bg-accent"
            }`}
          >
            {t.nav.launchpad}
          </Link>
          {isConnected ? (
            <div className="hidden md:flex items-center gap-3">
              <span className="text-xs text-nav-foreground font-mono bg-surface border border-border px-3 py-1.5">
                {truncatedAddress}
              </span>
              <button
                onClick={disconnect}
                className="text-xs text-muted hover:text-nav-foreground transition-colors"
              >
                {t.nav.disconnect}
              </button>
            </div>
          ) : (
            <button
              onClick={() => connect().catch(() => {})}
              className="hidden md:inline-flex border border-border px-4 py-2 text-sm text-nav-foreground hover:bg-surface-hover transition-colors cursor-pointer"
            >
              {t.nav.connectWallet}
            </button>
          )}

          {/* Mobile: wallet status pill */}
          {isConnected && (
            <span className="md:hidden text-xs font-mono text-nav-foreground bg-surface border border-border px-2 py-1">
              {truncatedAddress}
            </span>
          )}

          {/* Hamburger */}
          <button
            className="md:hidden flex flex-col justify-center items-center w-8 h-8 gap-1.5 text-foreground"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? t.nav.closeMenu : t.nav.openMenu}
          >
            <span
              className={`block h-px w-5 bg-current transition-transform origin-center ${menuOpen ? "translate-y-[7px] rotate-45" : ""}`}
            />
            <span
              className={`block h-px w-5 bg-current transition-opacity ${menuOpen ? "opacity-0" : ""}`}
            />
            <span
              className={`block h-px w-5 bg-current transition-transform origin-center ${menuOpen ? "-translate-y-[7px] -rotate-45" : ""}`}
            />
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="md:hidden border-t border-border bg-background absolute top-full left-0 right-0 z-50 shadow-lg">
          <nav className="flex flex-col px-4 py-3 gap-0.5">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-2 px-2 py-3 text-sm border-b border-border/50 last:border-0 ${
                  item.highlight
                    ? pathname === item.href
                      ? "text-accent font-bold"
                      : "text-accent/80 font-medium"
                    : pathname === item.href
                      ? "text-nav-accent"
                      : "text-muted"
                }`}
              >
                {item.highlight && <span className="text-accent/60 text-xs">&lt;/&gt;</span>}
                {item.label}
              </Link>
            ))}
            {isConnected && (
              <Link
                href="/dashboard"
                onClick={() => setMenuOpen(false)}
                className={`flex items-center px-2 py-3 text-sm border-b border-border/50 ${
                  pathname === "/dashboard" ? "text-nav-accent" : "text-muted"
                }`}
              >
                {t.nav.dashboard}
              </Link>
            )}
            <Link
              href="/launch"
              onClick={() => setMenuOpen(false)}
              className="flex items-center px-2 py-3 text-sm text-accent font-medium border-b border-border/50"
            >
              {t.nav.launchpad} →
            </Link>
            <a
              href={X_PROFILE_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2 px-2 py-3 text-sm text-muted border-b border-border/50"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" aria-hidden="true">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              @talosdotfun
            </a>
            <div className="flex items-center justify-between pt-3 pb-2 gap-4">
              <LocaleSwitcher />
              {isConnected ? (
                <button
                  onClick={() => { disconnect(); setMenuOpen(false); }}
                  className="text-xs text-muted hover:text-foreground transition-colors"
                >
                  {t.nav.disconnectWallet}
                </button>
              ) : (
                <button
                  onClick={() => { connect().catch(() => {}); setMenuOpen(false); }}
                  className="flex-1 border border-border py-2.5 text-sm text-foreground hover:bg-surface transition-colors"
                >
                  {t.nav.connectWallet}
                </button>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
