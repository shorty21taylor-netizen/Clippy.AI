import { Topbar } from "@/components/layout/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FileText, Megaphone, TrendingUp } from "lucide-react";

const STAT_CARDS = [
  {
    label: "Social Accounts",
    value: "0",
    icon: Users,
    change: "Connect your first account",
    color: "text-[--accent]",
    bg: "bg-[--accent-muted]",
  },
  {
    label: "Content Pieces",
    value: "0",
    icon: FileText,
    change: "Create your first piece",
    color: "text-[--status-success]",
    bg: "bg-[--status-success-muted]",
  },
  {
    label: "Posts Published",
    value: "0",
    icon: Megaphone,
    change: "Schedule your first post",
    color: "text-[--status-pending]",
    bg: "bg-[--status-pending-muted]",
  },
  {
    label: "Leads Captured",
    value: "0",
    icon: TrendingUp,
    change: "Launch your first funnel",
    color: "text-[--status-success]",
    bg: "bg-[--status-success-muted]",
  },
];

export default function DashboardPage() {
  return (
    <div className="flex flex-col h-full overflow-auto">
      <Topbar title="Dashboard" />

      <main className="flex-1 p-6 space-y-6 max-w-[1280px] w-full mx-auto">
        {/* Welcome banner */}
        <div className="rounded-[--radius-xl] bg-gradient-to-br from-[--bg-card] to-[--bg-elevated] border border-[--border-subtle] p-6">
          <h2 className="text-2xl font-bold text-[--text-primary] tracking-[-0.02em]">
            Welcome to Clippy.AI 👋
          </h2>
          <p className="mt-1 text-[--text-secondary]">
            Your command center for mass social media management and AI-powered
            content. Get started by connecting your first social account.
          </p>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {STAT_CARDS.map((stat) => (
            <Card key={stat.label}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-[--text-secondary]">
                    {stat.label}
                  </CardTitle>
                  <div
                    className={`h-8 w-8 rounded-[--radius-sm] ${stat.bg} flex items-center justify-center`}
                  >
                    <stat.icon size={16} className={stat.color} />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-[--text-primary] tracking-[-0.03em]">
                  {stat.value}
                </p>
                <p className="mt-1 text-xs text-[--text-tertiary]">
                  {stat.change}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              title: "Connect Social Accounts",
              desc: "Add Instagram, TikTok, or YouTube accounts to start managing them at scale.",
              href: "/dashboard/social-accounts",
              cta: "Connect accounts →",
            },
            {
              title: "Create Content with AI",
              desc: "Upload a script or video — Claude will generate hooks, captions, and hashtags automatically.",
              href: "/dashboard/content",
              cta: "Open Content Studio →",
            },
            {
              title: "Build a Lead Funnel",
              desc: "Drag-and-drop landing pages that capture leads and book calls from your social traffic.",
              href: "/dashboard/funnels",
              cta: "Build a funnel →",
            },
          ].map((action) => (
            <a key={action.href} href={action.href}>
              <Card className="h-full hover:border-[--border-default] transition-colors duration-150 cursor-pointer group">
                <CardHeader>
                  <CardTitle className="text-[15px] group-hover:text-[--accent] transition-colors">
                    {action.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-[--text-secondary] mb-4">
                    {action.desc}
                  </p>
                  <span className="text-sm font-medium text-[--accent]">
                    {action.cta}
                  </span>
                </CardContent>
              </Card>
            </a>
          ))}
        </div>
      </main>
    </div>
  );
}
