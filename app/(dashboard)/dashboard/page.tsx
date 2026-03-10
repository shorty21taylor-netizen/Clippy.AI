import { Topbar } from "@/components/layout/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FileText, Megaphone, TrendingUp } from "lucide-react";

const STAT_CARDS = [
  {
    label: "Social Accounts",
    value: "0",
    icon: Users,
    change: "Connect your first account",
    iconBg: "bg-[--accent-muted]",
    iconColor: "text-[--accent]",
  },
  {
    label: "Content Pieces",
    value: "0",
    icon: FileText,
    change: "Create your first piece",
    iconBg: "bg-[--status-success-muted]",
    iconColor: "text-[--status-success]",
  },
  {
    label: "Posts Published",
    value: "0",
    icon: Megaphone,
    change: "Schedule your first post",
    iconBg: "bg-[--status-pending-muted]",
    iconColor: "text-[--status-pending]",
  },
  {
    label: "Leads Captured",
    value: "0",
    icon: TrendingUp,
    change: "Launch your first funnel",
    iconBg: "bg-[--status-success-muted]",
    iconColor: "text-[--status-success]",
  },
];

export default function DashboardPage() {
  return (
    <div className="flex flex-col h-full overflow-auto">
      <Topbar title="Dashboard" />

      <main className="flex-1 p-8 space-y-8 max-w-[1280px] w-full mx-auto">

        {/* Welcome hero — Apple dark feature card style */}
        <div className="rounded-[28px] bg-[--color-bg-dark-secondary] px-10 py-10 overflow-hidden relative">
          {/* Subtle gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-[rgba(0,113,227,0.15)] to-transparent pointer-events-none" />
          <div className="relative z-10">
            <p className="text-label mb-3" style={{ color: "rgba(161,161,166,0.9)" }}>
              Command Center
            </p>
            <h2 className="text-[32px] font-semibold text-[--color-text-on-dark] tracking-[-0.025em] leading-tight mb-3">
              Welcome to Clippy.AI
            </h2>
            <p className="text-[17px] text-[--color-text-on-dark-secondary] leading-relaxed max-w-lg">
              Your command center for mass social media management and AI-powered
              content. Get started by connecting your first social account.
            </p>
          </div>
        </div>

        {/* KPI Grid — Apple stat card style */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          {STAT_CARDS.map((stat) => (
            <Card key={stat.label} className="p-6">
              <div className="flex items-start justify-between mb-5">
                <div
                  className={`h-10 w-10 rounded-[var(--radius-lg)] ${stat.iconBg} flex items-center justify-center`}
                >
                  <stat.icon size={18} className={stat.iconColor} />
                </div>
              </div>
              <p className="text-[40px] font-bold text-[--text-primary] tracking-[-0.04em] leading-none mb-2">
                {stat.value}
              </p>
              <p className="text-[15px] font-medium text-[--text-primary] mb-1">
                {stat.label}
              </p>
              <p className="text-[13px] text-[--text-tertiary]">
                {stat.change}
              </p>
            </Card>
          ))}
        </div>

        {/* Quick actions — Apple feature card style */}
        <div>
          <h3 className="text-[20px] font-semibold text-[--text-primary] tracking-[-0.02em] mb-5">
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
              <a key={action.href} href={action.href} className="group block">
                <Card className="h-full p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-card-hover)] cursor-pointer">
                  <h4 className="text-[17px] font-semibold text-[--text-primary] tracking-[-0.015em] mb-3 group-hover:text-[--accent] transition-colors duration-200">
                    {action.title}
                  </h4>
                  <p className="text-[15px] text-[--text-secondary] leading-relaxed mb-5">
                    {action.desc}
                  </p>
                  <span className="text-[15px] font-medium text-[--accent] inline-flex items-center gap-1">
                    {action.cta}
                    <span className="transition-transform duration-150 group-hover:translate-x-0.5">›</span>
                  </span>
                </Card>
              </a>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
