"use client";

import { Topbar } from "@/components/layout/topbar";
import { Users, FileText, Megaphone, TrendingUp, ArrowRight, Wand2, Funnel } from "lucide-react";

/* Visual-only accent data — drives per-card color identity */
const CARD_ACCENTS = [
  {
    color:    "var(--accent-blue)",
    light:    "var(--accent-blue-light)",
    border:   "var(--accent-blue-border)",
    orb:      "rgba(59, 130, 246, 0.08)",
    strip:    "linear-gradient(90deg, var(--accent-blue), var(--accent-blue-light))",
  },
  {
    color:    "var(--accent-violet)",
    light:    "var(--accent-violet-light)",
    border:   "var(--accent-violet-border)",
    orb:      "rgba(124, 58, 237, 0.08)",
    strip:    "linear-gradient(90deg, var(--accent-violet), var(--accent-violet-light))",
  },
  {
    color:    "var(--accent-emerald)",
    light:    "var(--accent-emerald-light)",
    border:   "var(--accent-emerald-border)",
    orb:      "rgba(16, 185, 129, 0.08)",
    strip:    "linear-gradient(90deg, var(--accent-emerald), var(--accent-emerald-light))",
  },
  {
    color:    "var(--accent-amber)",
    light:    "var(--accent-amber-light)",
    border:   "var(--accent-amber-border)",
    orb:      "rgba(245, 158, 11, 0.08)",
    strip:    "linear-gradient(90deg, var(--accent-amber), var(--accent-amber-light))",
  },
];

const ACTION_ACCENTS = [
  { color: "var(--accent-blue)",    light: "var(--accent-blue-light)",    border: "rgba(59, 130, 246, 0.25)",  strip: "linear-gradient(90deg, var(--accent-blue), transparent)" },
  { color: "var(--accent-violet)",  light: "var(--accent-violet-light)",  border: "rgba(124, 58, 237, 0.25)", strip: "linear-gradient(90deg, var(--accent-violet), transparent)" },
  { color: "var(--accent-emerald)", light: "var(--accent-emerald-light)", border: "rgba(16, 185, 129, 0.25)", strip: "linear-gradient(90deg, var(--accent-emerald), transparent)" },
];

const STAT_CARDS = [
  { label: "Social Accounts",  value: "0", change: "Connect your first account", icon: Users },
  { label: "Content Pieces",   value: "0", change: "Create your first piece",    icon: FileText },
  { label: "Posts Published",  value: "0", change: "Schedule your first post",   icon: Megaphone },
  { label: "Leads Captured",   value: "0", change: "Launch your first funnel",   icon: TrendingUp },
];

export default function DashboardPage() {
  return (
    <div className="flex flex-col h-full overflow-auto" style={{ background: "var(--bg-page)" }}>
      <Topbar title="Dashboard" />

      <main
        className="flex-1 max-w-[1280px] w-full mx-auto px-10 py-9 page-enter"
        style={{ display: "flex", flexDirection: "column", gap: "36px" }}
      >

        {/* ── HERO CARD ─────────────────────────────────────────────────── */}
        <div
          className="hero-card rounded-[var(--radius-3xl)] px-11 py-10"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
            boxShadow: "var(--shadow-md)",
          }}
        >
          <div className="relative z-10">
            {/* Status pill */}
            <div
              className="inline-flex items-center gap-[6px] rounded-[var(--radius-pill)] px-3 py-1 mb-4 text-[12px] font-semibold"
              style={{
                background: "rgba(16, 185, 129, 0.08)",
                border: "1px solid rgba(16, 185, 129, 0.20)",
                color: "#059669",
              }}
            >
              <span className="status-dot" />
              System Online
            </div>

            <h2
              className="font-extrabold leading-[1.1] tracking-[-0.03em] mb-2"
              style={{ fontSize: "clamp(24px, 3vw, 36px)" }}
            >
              Welcome to{" "}
              <span className="gradient-text">Clippy.AI</span>
            </h2>

            <p
              className="leading-[1.6] max-w-[520px]"
              style={{ fontSize: "16px", color: "var(--text-secondary)" }}
            >
              Your command center for mass social media management and AI-powered
              content. Get started by connecting your first social account.
            </p>
          </div>
        </div>

        {/* ── STAT CARDS ────────────────────────────────────────────────── */}
        <section>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4" style={{ gap: "20px" }}>
            {STAT_CARDS.map((stat, i) => {
              const a = CARD_ACCENTS[i];
              const Icon = stat.icon;
              return (
                <div
                  key={stat.label}
                  className="stat-card rounded-[var(--radius-2xl)] p-6 cursor-default"
                  style={{
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border-subtle)",
                    boxShadow: "var(--shadow-md)",
                    transition: `all var(--duration-base) var(--ease-spring)`,
                    animationDelay: `${i * 60}ms`,
                    animationFillMode: "both",
                    animation: `fadeUp 0.4s var(--ease-smooth) ${i * 60}ms both`,
                    "--card-orb-color": a.orb,
                  } as React.CSSProperties}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLDivElement;
                    el.style.transform = "translateY(-4px) scale(1.01)";
                    el.style.boxShadow = "var(--shadow-lg)";
                    el.style.borderColor = a.border;
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLDivElement;
                    el.style.transform = "";
                    el.style.boxShadow = "var(--shadow-md)";
                    el.style.borderColor = "var(--border-subtle)";
                  }}
                >
                  {/* Icon container */}
                  <div
                    className="flex items-center justify-center rounded-[var(--radius-md)] mb-4"
                    style={{ width: 40, height: 40, background: a.light }}
                  >
                    <Icon size={20} style={{ color: a.color }} />
                  </div>

                  {/* Stat number */}
                  <p
                    className="font-extrabold leading-none mb-1"
                    style={{
                      fontSize: "48px",
                      letterSpacing: "-0.04em",
                      color: "var(--text-primary)",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {stat.value}
                  </p>

                  {/* Label */}
                  <p className="text-[14px] font-semibold mb-[3px]" style={{ color: "var(--text-primary)" }}>
                    {stat.label}
                  </p>

                  {/* Sub-label */}
                  <p className="text-[12px]" style={{ color: "var(--text-tertiary)" }}>
                    {stat.change}
                  </p>

                  {/* Bottom trend strip */}
                  <div
                    className="mt-4 rounded-full"
                    style={{ height: "3px", width: "40%", background: a.strip }}
                  />
                </div>
              );
            })}
          </div>
        </section>

        {/* ── GET STARTED CARDS ─────────────────────────────────────────── */}
        <section>
          <h3
            className="font-bold tracking-[-0.01em] mb-4"
            style={{ fontSize: "16px", color: "var(--text-primary)" }}
          >
            Get started
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap: "20px" }}>
            {[
              {
                title: "Connect Social Accounts",
                desc: "Add Instagram, TikTok, or YouTube accounts to start managing them at scale.",
                href: "/dashboard/social-accounts",
                cta: "Connect accounts",
              },
              {
                title: "Create Content with AI",
                desc: "Upload a script or video — Claude will generate hooks, captions, and hashtags automatically.",
                href: "/dashboard/content",
                cta: "Open Content Studio",
              },
              {
                title: "Build a Lead Funnel",
                desc: "Drag-and-drop landing pages that capture leads and book calls from your social traffic.",
                href: "/dashboard/funnels",
                cta: "Build a funnel",
              },
            ].map((action, i) => {
              const a = ACTION_ACCENTS[i];
              return (
                <a
                  key={action.href}
                  href={action.href}
                  className="action-card group block rounded-[var(--radius-2xl)] p-7 cursor-pointer"
                  style={{
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border-subtle)",
                    boxShadow: "var(--shadow-md)",
                    transition: `all 300ms var(--ease-spring)`,
                    animationDelay: `${i * 60}ms`,
                    animation: `fadeUp 0.4s var(--ease-smooth) ${(STAT_CARDS.length + i) * 60}ms both`,
                    "--card-strip-gradient": a.strip,
                  } as React.CSSProperties}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLAnchorElement;
                    el.style.transform = "translateY(-6px)";
                    el.style.boxShadow = "var(--shadow-lg)";
                    el.style.borderColor = a.border;
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLAnchorElement;
                    el.style.transform = "";
                    el.style.boxShadow = "var(--shadow-md)";
                    el.style.borderColor = "var(--border-subtle)";
                  }}
                >
                  {/* Icon badge */}
                  <div
                    className="flex items-center justify-center rounded-[var(--radius-lg)] mb-4"
                    style={{
                      width: 48,
                      height: 48,
                      background: a.light,
                      transition: "transform 300ms var(--ease-spring)",
                    }}
                  >
                    {i === 0 && <Users size={22} style={{ color: a.color }} />}
                    {i === 1 && <Wand2 size={22} style={{ color: a.color }} />}
                    {i === 2 && <Funnel size={22} style={{ color: a.color }} />}
                  </div>

                  <h4
                    className="font-bold tracking-[-0.01em] mb-2"
                    style={{ fontSize: "16px", color: "var(--text-primary)" }}
                  >
                    {action.title}
                  </h4>
                  <p
                    className="leading-[1.6] mb-5"
                    style={{ fontSize: "13px", color: "var(--text-secondary)" }}
                  >
                    {action.desc}
                  </p>

                  {/* CTA row */}
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-semibold" style={{ color: a.color }}>
                      {action.cta}
                    </span>
                    <div
                      className="card-arrow flex items-center justify-center rounded-full transition-all duration-[250ms]"
                      style={{
                        width: 28,
                        height: 28,
                        background: a.light,
                        opacity: 0.6,
                      }}
                    >
                      <ArrowRight size={14} style={{ color: a.color }} />
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        </section>

      </main>
    </div>
  );
}

