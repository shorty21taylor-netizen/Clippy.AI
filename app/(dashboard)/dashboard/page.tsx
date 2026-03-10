import { Topbar } from "@/components/layout/topbar";
import { Users, FileText, Megaphone, TrendingUp } from "lucide-react";

const STAT_CARDS = [
  {
    label: "Social Accounts",
    value: "0",
    change: "Connect your first account",
    icon: Users,
  },
  {
    label: "Content Pieces",
    value: "0",
    change: "Create your first piece",
    icon: FileText,
  },
  {
    label: "Posts Published",
    value: "0",
    change: "Schedule your first post",
    icon: Megaphone,
  },
  {
    label: "Leads Captured",
    value: "0",
    change: "Launch your first funnel",
    icon: TrendingUp,
  },
];

export default function DashboardPage() {
  return (
    <div className="flex flex-col h-full overflow-auto bg-[--bg-base]">
      <Topbar title="Dashboard" />

      {/* page-enter animation on the main content only */}
      <main className="flex-1 px-10 py-10 space-y-12 max-w-[1200px] w-full mx-auto page-enter">

        {/* ── Hero / Welcome — Apple light product page style ────────────── */}
        <div
          className="rounded-[var(--radius-xl)] bg-[--bg-surface] px-12 py-10 shadow-[var(--shadow-card)]"
        >
          <p className="text-label text-[--text-accent] mb-2">Command Center</p>
          <h2 className="text-[32px] font-bold text-[--text-primary] tracking-[-0.025em] leading-tight mb-3">
            Welcome to Clippy.AI
          </h2>
          <p className="text-[17px] text-[--text-secondary] leading-[1.6] max-w-[480px]">
            Your command center for mass social media management and AI-powered
            content. Get started by connecting your first social account.
          </p>
        </div>

        {/* ── KPI Stat Cards ────────────────────────────────────────────── */}
        <section>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
            {STAT_CARDS.map((stat) => (
              <div
                key={stat.label}
                className="rounded-[var(--radius-lg)] bg-[--bg-surface] px-6 py-7 shadow-[var(--shadow-card)] transition-all duration-[250ms] ease-out hover:-translate-y-[3px] hover:shadow-[var(--shadow-card-hover)] cursor-default"
              >
                {/* Icon */}
                <div className="h-9 w-9 rounded-[10px] bg-[--accent-subtle] flex items-center justify-center mb-4">
                  <stat.icon size={17} className="text-[--accent]" />
                </div>
                {/* Stat number */}
                <p className="text-[40px] font-bold text-[--text-primary] tracking-[-0.03em] leading-none mb-[6px]">
                  {stat.value}
                </p>
                {/* Label */}
                <p className="text-[15px] font-medium text-[--text-primary] mb-1">
                  {stat.label}
                </p>
                {/* Sub-label */}
                <p className="text-[13px] text-[--text-tertiary]">
                  {stat.change}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Get Started Action Cards ──────────────────────────────────── */}
        <section>
          <h3 className="text-[22px] font-semibold text-[--text-primary] tracking-[-0.015em] mb-5">
            Get started
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
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
            ].map((action) => (
              <a
                key={action.href}
                href={action.href}
                className="group block rounded-[var(--radius-lg)] bg-[--bg-surface] px-7 py-7 shadow-[var(--shadow-card)] transition-all duration-[250ms] ease-out hover:-translate-y-1 hover:shadow-[var(--shadow-card-hover)] cursor-pointer"
              >
                <h4 className="text-[17px] font-semibold text-[--text-primary] tracking-[-0.015em] mb-2">
                  {action.title}
                </h4>
                <p className="text-[14px] text-[--text-secondary] leading-[1.55] mb-5">
                  {action.desc}
                </p>
                <span className="text-[14px] font-medium text-[--accent] inline-flex items-center gap-1">
                  {action.cta}
                  <span className="inline-block transition-transform duration-200 group-hover:translate-x-1">›</span>
                </span>
              </a>
            ))}
          </div>
        </section>

      </main>
    </div>
  );
}
