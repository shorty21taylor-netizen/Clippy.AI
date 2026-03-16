"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  TrendingUp,
  TrendingDown,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  Users,
  DollarSign,
  Zap,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ExternalLink,
  AlertCircle,
  BarChart2,
  ArrowUpRight,
  ArrowDownRight,
  Star,
  Activity,
  Loader2,
  ArrowRight,
  Check,
  X,
  Clock,
  Filter,
  Target,
  Link2,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useWorkspace } from "@/lib/workspace-context";
import { Topbar } from "@/components/layout/topbar";

// ─── Types ──────────────────────────────────────────────────────────────────

type Tab = "overview" | "accounts" | "clips" | "leads" | "revenue";
type TimeRange = "7d" | "14d" | "30d" | "90d";
type Platform = "all" | "tiktok" | "instagram";

interface OverviewData {
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  totalSaves: number;
  engagementRate: number;
  totalClipsPosted: number;
  previousPeriod: {
    totalViews: number;
    totalLikes: number;
    totalComments: number;
    totalShares: number;
    engagementRate: number;
    totalClipsPosted: number;
  };
  trends: {
    views: number;
    likes: number;
    comments: number;
    shares: number;
    engagementRate: number;
    clipsPosted: number;
  };
  viewsOverTime: Array<{ date: string; tiktokViews: number; instagramViews: number }>;
  engagementBreakdown: { views: number; likes: number; comments: number; shares: number; saves: number };
  platformSplit: {
    tiktok: { views: number; percentage: number };
    instagram: { views: number; percentage: number };
  };
  topClips: Array<{
    clipId: string;
    title: string;
    thumbnailPath: string;
    viralityScore: number;
    totalViews: number;
    totalLikes: number;
    totalComments: number;
    totalShares: number;
    engagementRate: number;
    platforms: string[];
    publishedAt: string;
  }>;
  postingHeatmap: Array<{ day: number; hour: number; count: number; avgEngagement: number }>;
}

interface AccountData {
  id: string;
  platform: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  followerCount: number;
  status: string;
  lastSyncedAt: string;
  publishedPostsCount: number;
  avgViews: number;
  avgEngagement: number;
  totalViews: number;
  recentViews: number[];
}

interface AccountDetail {
  account: {
    id: string;
    platform: string;
    username: string;
    displayName: string;
    avatarUrl: string;
    followerCount: number;
    lastSyncedAt: string;
    isActive: boolean;
  };
  totals: { views: number; likes: number; comments: number; shares: number; saves: number; posts: number };
  posts: Array<{
    publishLogId: string;
    clip: { id: string; title: string; viralityScore: number };
    publishedAt: string;
    platformPostId: string;
    metrics: { views: number; likes: number; comments: number; shares: number; saves: number; engagementRate: number } | null;
  }>;
}

interface ClipData {
  id: string;
  title: string;
  thumbnailPath: string;
  viralityScore: number;
  clipType: string;
  status: string;
  sourceVideoId: string;
  sourceVideoTitle: string;
  accountsPostedTo: { tiktok: number; instagram: number; total: number };
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  totalSaves: number;
  avgEngRate: number;
  perAccountBreakdown: Array<{
    accountId: string;
    handle: string;
    displayName: string;
    platform: string;
    views: number;
    likes: number;
    comments: number;
    shares: number;
    saves: number;
    engRate: number;
    postedAt: string;
  }>;
}

interface LeadsData {
  stats: { totalLeads: number; leadsPerDay: number; topSource: string; leadToSaleRate: number };
  leadsOverTime: Array<{ date: string; count: number }>;
  leadsByFunnel: Array<{ funnelId: string; funnelName: string; count: number }>;
  leadsBySource: { direct: number; tiktok: number; instagram: number; other: number };
  statusPipeline: { new: number; contacted: number; qualified: number; converted: number; lost: number };
  recentLeads: Array<{
    id: string;
    name: string;
    email: string;
    funnel: string;
    funnelId: string;
    source: string;
    status: string;
    createdAt: string;
    daysSince: number;
  }>;
}

interface RevenueData {
  totalRevenue: number;
  revenueByProduct: { challenge: number; coaching: number };
  challengePrice: number;
  coachingPrice: number;
  revenueOverTime: Array<{ month: string; challengeRevenue: number; coachingRevenue: number }>;
  revenueByFunnel: Array<{ funnelId: string; name: string; type: string; leads: number; conversions: number; convRate: number; revenue: number }>;
  clipAttribution: Array<{ clipId: string; title: string; views: number; leadsGenerated: number; conversions: number; revenue: number }>;
  projection: { monthlyLeads: number; convRate: number; projectedMonthly: number };
  hasData: boolean;
}

// ─── Utility helpers ────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toString();
}

function fmtCurrency(n: number): string {
  if (n >= 1_000_000) return "$" + (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return "$" + (n / 1_000).toFixed(0) + "K";
  return "$" + n.toLocaleString();
}

function fmtDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function fmtPct(n: number): string {
  return n.toFixed(2) + "%";
}

function fmtAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return mins + " minutes ago";
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + " hour" + (hrs !== 1 ? "s" : "") + " ago";
  const days = Math.floor(hrs / 24);
  return days + " day" + (days !== 1 ? "s" : "") + " ago";
}

// ─── Constants ────────────────────────────────────────────────────────────

const TOOLTIP_STYLE = {
  contentStyle: {
    background: "var(--bg-surface)",
    border: "1px solid var(--border-default)",
    borderRadius: 8,
    fontSize: 13,
    color: "var(--text-primary)",
  },
};

const CARD_STYLE: React.CSSProperties = {
  background: "var(--bg-surface)",
  border: "1px solid var(--border-default)",
  borderRadius: "var(--radius-md)",
  boxShadow: "var(--shadow-sm)",
};

const COLORS = {
  tiktok: "#3B82F6",
  instagram: "#A855F7",
  likes: "#3B82F6",
  comments: "#22C55E",
  shares: "#F59E0B",
  saves: "#A855F7",
  revenue: "#10B981",
  challenge: "#3B82F6",
  coaching: "#10B981",
};

// ─── Sub-components ────────────────────────────────────────────────────────

function SkeletonBlock({ height = 20, width = "100%" }: { height?: number; width?: string | number }) {
  return <div className="skeleton" style={{ height, width, borderRadius: 6 }} />;
}

function TrendBadge({ value }: { value: number }) {
  const positive = value >= 0;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 2,
        fontSize: 11,
        fontWeight: 600,
        color: positive ? "#10B981" : "#F43F5E",
        background: positive ? "rgba(16,185,129,0.08)" : "rgba(244,63,94,0.08)",
        borderRadius: 99,
        padding: "2px 6px",
      }}
    >
      {positive ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
      {Math.abs(value).toFixed(1)}%
    </span>
  );
}

function PlatformBadge({ platform }: { platform: string }) {
  const isTikTok = platform.toLowerCase() === "tiktok";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        fontSize: 10,
        fontWeight: 700,
        color: isTikTok ? "#3B82F6" : "#A855F7",
        background: isTikTok ? "rgba(59,130,246,0.08)" : "rgba(168,85,247,0.08)",
        border: `1px solid ${isTikTok ? "rgba(59,130,246,0.2)" : "rgba(168,85,247,0.2)"}`,
        borderRadius: 99,
        padding: "2px 8px",
        textTransform: "uppercase" as const,
        letterSpacing: "0.05em",
      }}
    >
      {isTikTok ? "TikTok" : "Instagram"}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    new: { bg: "rgba(59,130,246,0.08)", color: "#3B82F6" },
    contacted: { bg: "rgba(245,158,11,0.08)", color: "#F59E0B" },
    qualified: { bg: "rgba(124,58,237,0.08)", color: "#7C3AED" },
    converted: { bg: "rgba(16,185,129,0.08)", color: "#10B981" },
    lost: { bg: "rgba(244,63,94,0.08)", color: "#F43F5E" },
  };
  const s = status.toLowerCase();
  const st = map[s] ?? { bg: "rgba(161,161,170,0.1)", color: "#71717A" };
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        fontSize: 11,
        fontWeight: 600,
        color: st.color,
        background: st.bg,
        borderRadius: 99,
        padding: "2px 8px",
        textTransform: "capitalize" as const,
      }}
    >
      {status}
    </span>
  );
}

function ViralityBadge({ score }: { score: number }) {
  const color = score >= 8 ? "#10B981" : score >= 5 ? "#F59E0B" : "#F43F5E";
  const bg = score >= 8 ? "rgba(16,185,129,0.08)" : score >= 5 ? "rgba(245,158,11,0.08)" : "rgba(244,63,94,0.08)";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 3,
        fontSize: 11,
        fontWeight: 700,
        color,
        background: bg,
        borderRadius: 99,
        padding: "2px 7px",
      }}
    >
      <Star size={9} fill={color} />
      {score.toFixed(1)}
    </span>
  );
}

function SectionError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "14px 18px",
        background: "rgba(245,158,11,0.06)",
        border: "1px solid rgba(245,158,11,0.25)",
        borderRadius: "var(--radius-md)",
        marginBottom: 24,
      }}
    >
      <AlertCircle size={16} style={{ color: "#F59E0B", flexShrink: 0 }} />
      <span style={{ fontSize: 13, color: "var(--text-secondary)", flex: 1 }}>{message}</span>
      <button
        onClick={onRetry}
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: "var(--accent-blue)",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: "4px 8px",
          borderRadius: 6,
        }}
      >
        Retry
      </button>
    </div>
  );
}

function AnalyticsEmptyState() {
  const steps = [
    { n: 1, label: "Connect Accounts", href: "/dashboard/social-accounts", active: false },
    { n: 2, label: "Create Clips", href: "/dashboard/clips", active: false },
    { n: 3, label: "Post to Accounts", href: "/dashboard/publish", active: false },
    { n: 4, label: "Track Results Here", href: "#", active: true },
  ];
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
      <div
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-default)",
          borderRadius: 16,
          padding: "52px 48px",
          maxWidth: 560,
          width: "100%",
          textAlign: "center",
          boxShadow: "var(--shadow-md)",
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            background: "var(--accent-blue-light)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 24px",
          }}
        >
          <BarChart2 size={32} style={{ color: "var(--accent-blue)" }} />
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 10px" }}>
          Your analytics dashboard
        </h2>
        <p
          style={{
            fontSize: 15,
            color: "var(--text-secondary)",
            margin: "0 auto 32px",
            maxWidth: 380,
            lineHeight: 1.6,
          }}
        >
          Connect your social accounts and post your first clips to start tracking performance across all platforms.
        </p>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            marginBottom: 32,
            textAlign: "left",
            maxWidth: 300,
            marginLeft: "auto",
            marginRight: "auto",
          }}
        >
          {steps.map((step) => (
            <a
              key={step.n}
              href={step.href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 14px",
                borderRadius: 10,
                background: step.active ? "var(--accent-blue-light)" : "var(--bg-subtle)",
                border: `1px solid ${step.active ? "var(--accent-blue)" : "var(--border-subtle)"}`,
                textDecoration: "none",
              }}
            >
              <span
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  background: step.active ? "var(--accent-blue)" : "var(--border-default)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  fontWeight: 700,
                  color: step.active ? "#fff" : "var(--text-secondary)",
                  flexShrink: 0,
                }}
              >
                {step.n}
              </span>
              <span
                style={{
                  fontSize: 14,
                  fontWeight: step.active ? 600 : 400,
                  color: step.active ? "var(--accent-blue)" : "var(--text-secondary)",
                }}
              >
                {step.label}
                {step.active && (
                  <span style={{ marginLeft: 6, fontSize: 11, opacity: 0.7 }}>(you are here)</span>
                )}
              </span>
              {!step.active && (
                <ExternalLink size={13} style={{ color: "var(--text-tertiary)", marginLeft: "auto" }} />
              )}
            </a>
          ))}
        </div>
        <a
          href="/dashboard/social-accounts"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "13px 28px",
            borderRadius: 10,
            background: "var(--accent-blue)",
            color: "#fff",
            fontWeight: 600,
            fontSize: 15,
            textDecoration: "none",
          }}
        >
          Connect Your First Account <ArrowRight size={16} />
        </a>
      </div>
    </div>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────

function RevenuePipelineFunnel({
  data,
  compareOn,
  prevData,
}: {
  data: OverviewData;
  compareOn: boolean;
  prevData?: OverviewData["previousPeriod"];
}) {
  const [hoveredStep, setHoveredStep] = React.useState<number | null>(null);

  const totalEngagements =
    data.engagementBreakdown.likes +
    data.engagementBreakdown.comments +
    data.engagementBreakdown.shares +
    data.engagementBreakdown.saves;

  const steps = [
    { label: "CONTENT", value: data.totalClipsPosted, sublabel: "clips posted" },
    { label: "REACH", value: data.totalViews, sublabel: "total views" },
    { label: "ENGAGEMENT", value: totalEngagements, sublabel: "interactions" },
    { label: "TRAFFIC", value: 0, sublabel: "page visits" },
    { label: "LEADS", value: 0, sublabel: "new leads" },
    { label: "CONVERSIONS", value: 0, sublabel: "sales" },
  ];

  const blueToGreen = [
    "#3B82F6",
    "#4F86E8",
    "#5D8DDB",
    "#6B94CC",
    "#7D9EBF",
    "#10B981",
  ];

  return (
    <div style={{ ...CARD_STYLE, padding: "24px", marginBottom: 24 }}>
      <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 20px" }}>
        Revenue Pipeline
      </h3>
      <div style={{ display: "flex", alignItems: "center", overflowX: "auto", gap: 0 }}>
        {steps.map((step, i) => {
          const isHovered = hoveredStep === i;
          const maxVal = steps[0].value || 1;
          const ratio = step.value > 0 ? step.value / maxVal : i === 0 ? 1 : 0.1 * (1 - i * 0.1);
          const topW = 90 + ratio * 50;
          const bottomW = i < steps.length - 1 ? 90 + (steps[i + 1].value > 0 ? steps[i + 1].value / maxVal : 0.1 * (1 - (i + 1) * 0.1)) * 50 : 50;
          const convRate =
            i < steps.length - 1 && steps[i].value > 0 && steps[i + 1].value > 0
              ? ((steps[i + 1].value / steps[i].value) * 100).toFixed(1) + "%"
              : null;

          return (
            <React.Fragment key={step.label}>
              <div
                style={{ display: "flex", flexDirection: "column", alignItems: "center", position: "relative", minWidth: 110 }}
                onMouseEnter={() => setHoveredStep(i)}
                onMouseLeave={() => setHoveredStep(null)}
              >
                <svg
                  width={110}
                  height={90}
                  viewBox="0 0 110 90"
                  style={{ cursor: "default" }}
                >
                  <defs>
                    <linearGradient id={`stepGrad${i}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={blueToGreen[i]} stopOpacity="1" />
                      <stop offset="100%" stopColor={blueToGreen[i]} stopOpacity="0.7" />
                    </linearGradient>
                  </defs>
                  <polygon
                    points={`${(110 - topW) / 2},10 ${(110 + topW) / 2},10 ${(110 + bottomW) / 2},80 ${(110 - bottomW) / 2},80`}
                    fill={`url(#stepGrad${i})`}
                    opacity={isHovered ? 1 : 0.85}
                    style={{ transition: "opacity 0.15s" }}
                  />
                </svg>
                <div style={{ textAlign: "center", marginTop: -4 }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: "var(--text-tertiary)", letterSpacing: "0.08em", textTransform: "uppercase" as const }}>
                    {step.label}
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text-primary)", lineHeight: 1.2 }}>
                    {step.value > 0 ? fmt(step.value) : "—"}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--text-tertiary)" }}>{step.sublabel}</div>
                  {compareOn && prevData && i === 0 && (
                    <div style={{ fontSize: 10, color: "var(--text-tertiary)" }}>
                      vs {fmt(prevData.totalClipsPosted)} prev
                    </div>
                  )}
                  {compareOn && prevData && i === 1 && (
                    <div style={{ fontSize: 10, color: "var(--text-tertiary)" }}>
                      vs {fmt(prevData.totalViews)} prev
                    </div>
                  )}
                </div>
                {isHovered && (
                  <div
                    style={{
                      position: "absolute",
                      top: -40,
                      left: "50%",
                      transform: "translateX(-50%)",
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--border-default)",
                      borderRadius: 8,
                      padding: "6px 10px",
                      fontSize: 12,
                      color: "var(--text-primary)",
                      whiteSpace: "nowrap",
                      zIndex: 10,
                      boxShadow: "var(--shadow-md)",
                    }}
                  >
                    {step.label}: {step.value > 0 ? fmt(step.value) : "No data"}
                  </div>
                )}
              </div>
              {i < steps.length - 1 && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "0 4px", marginBottom: 30, flexShrink: 0 }}>
                  <ChevronRight size={14} style={{ color: "var(--text-tertiary)" }} />
                  {convRate && (
                    <span style={{ fontSize: 9, color: "var(--text-tertiary)", marginTop: 2 }}>{convRate}</span>
                  )}
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

function StatCard({
  icon,
  iconColor,
  iconBg,
  label,
  value,
  trend,
  prevValue,
  prevLabel,
  compareOn,
  sparklineData,
  sparklineColor,
}: {
  icon: React.ReactNode;
  iconColor: string;
  iconBg: string;
  label: string;
  value: string;
  trend: number;
  prevValue?: string;
  prevLabel?: string;
  compareOn: boolean;
  sparklineData?: number[];
  sparklineColor?: string;
}) {
  return (
    <div style={{ ...CARD_STYLE, padding: "20px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: iconBg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {icon}
          </div>
          <span style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 500 }}>{label}</span>
        </div>
        <TrendBadge value={trend} />
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: "var(--text-primary)", lineHeight: 1 }}>
        {value}
      </div>
      {compareOn && prevValue && (
        <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 4 }}>
          vs {prevValue} {prevLabel || "prev period"}
        </div>
      )}
      {sparklineData && sparklineData.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <ResponsiveContainer width="100%" height={36}>
            <LineChart data={sparklineData.map((v, i) => ({ i, v }))}>
              <Line
                type="monotone"
                dataKey="v"
                stroke={sparklineColor || "#3B82F6"}
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function OverviewTab({
  data,
  loading,
  error,
  onRetry,
  compareOn,
}: {
  data: OverviewData | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  compareOn: boolean;
}) {
  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ ...CARD_STYLE, padding: 24, height: 180 }}>
          <SkeletonBlock height={20} width={200} />
          <div style={{ marginTop: 20 }}>
            <SkeletonBlock height={100} />
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          {[...Array(6)].map((_, i) => (
            <div key={i} style={{ ...CARD_STYLE, padding: 20, height: 120 }}>
              <SkeletonBlock height={16} width={120} />
              <div style={{ marginTop: 12 }}>
                <SkeletonBlock height={28} width={80} />
              </div>
            </div>
          ))}
        </div>
        <div style={{ ...CARD_STYLE, padding: 24, height: 280 }}>
          <SkeletonBlock height={20} width={160} />
          <div style={{ marginTop: 16 }}>
            <SkeletonBlock height={220} />
          </div>
        </div>
      </div>
    );
  }
  if (error) return <SectionError message={error} onRetry={onRetry} />;
  if (!data) return null;

  const viewsSparkline = data.viewsOverTime.map((d) => d.tiktokViews + d.instagramViews);

  const totalTikTok = data.platformSplit?.tiktok?.views ?? 0;
  const totalIG = data.platformSplit?.instagram?.views ?? 0;
  const totalTikTokPct = data.platformSplit?.tiktok?.percentage ?? 0;
  const totalIGPct = data.platformSplit?.instagram?.percentage ?? 0;

  const engBreakdown = [
    { name: "Likes", value: data.engagementBreakdown.likes, color: COLORS.likes },
    { name: "Comments", value: data.engagementBreakdown.comments, color: COLORS.comments },
    { name: "Shares", value: data.engagementBreakdown.shares, color: COLORS.shares },
    { name: "Saves", value: data.engagementBreakdown.saves, color: COLORS.saves },
  ];

  // Build heatmap from postingHeatmap
  const heatmapData = data.postingHeatmap ?? [];
  const maxHeat = Math.max(...heatmapData.map((h) => h.avgEngagement), 1);
  const getHeatCell = (day: number, hour: number) => {
    const cell = heatmapData.find((h) => h.day === day && h.hour === hour);
    return cell ? cell.avgEngagement / maxHeat : 0;
  };
  const bestCell = heatmapData.reduce(
    (best, cur) => (cur.avgEngagement > (best?.avgEngagement ?? 0) ? cur : best),
    null as typeof heatmapData[0] | null
  );

  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const hourLabels = ["12a", "3a", "6a", "9a", "12p", "3p", "6p", "9p"];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <RevenuePipelineFunnel data={data} compareOn={compareOn} prevData={data.previousPeriod} />

      {/* 6 Stat Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        <StatCard
          icon={<Eye size={18} style={{ color: "var(--accent-blue)" }} />}
          iconColor="var(--accent-blue)"
          iconBg="var(--accent-blue-light)"
          label="Total Views"
          value={fmt(data.totalViews)}
          trend={data.trends.views}
          prevValue={fmt(data.previousPeriod?.totalViews ?? 0)}
          compareOn={compareOn}
          sparklineData={viewsSparkline}
          sparklineColor="#3B82F6"
        />
        <StatCard
          icon={<Heart size={18} style={{ color: "var(--accent-emerald)" }} />}
          iconColor="var(--accent-emerald)"
          iconBg="var(--accent-emerald-light)"
          label="Engagement Rate"
          value={fmtPct(data.engagementRate)}
          trend={data.trends.engagementRate}
          prevValue={fmtPct(data.previousPeriod?.engagementRate ?? 0)}
          compareOn={compareOn}
          sparklineData={viewsSparkline.map((v, i, arr) => (arr[i - 1] ? v / arr[i - 1] : 1))}
          sparklineColor="#10B981"
        />
        <StatCard
          icon={<Zap size={18} style={{ color: "var(--accent-violet)" }} />}
          iconColor="var(--accent-violet)"
          iconBg="var(--accent-violet-light)"
          label="Clips Posted"
          value={data.totalClipsPosted.toString()}
          trend={data.trends.clipsPosted}
          prevValue={(data.previousPeriod?.totalClipsPosted ?? 0).toString()}
          compareOn={compareOn}
          sparklineData={viewsSparkline.map(() => data.totalClipsPosted)}
          sparklineColor="#7C3AED"
        />
        <StatCard
          icon={<Heart size={18} style={{ color: "var(--accent-blue)" }} />}
          iconColor="var(--accent-blue)"
          iconBg="var(--accent-blue-light)"
          label="Total Likes"
          value={fmt(data.totalLikes)}
          trend={data.trends.likes}
          prevValue={fmt(data.previousPeriod?.totalLikes ?? 0)}
          compareOn={compareOn}
          sparklineData={viewsSparkline}
          sparklineColor="#3B82F6"
        />
        <StatCard
          icon={<MessageCircle size={18} style={{ color: "var(--accent-emerald)" }} />}
          iconColor="var(--accent-emerald)"
          iconBg="var(--accent-emerald-light)"
          label="Total Comments"
          value={fmt(data.totalComments)}
          trend={data.trends.comments}
          prevValue={fmt(data.previousPeriod?.totalComments ?? 0)}
          compareOn={compareOn}
          sparklineData={viewsSparkline}
          sparklineColor="#10B981"
        />
        <StatCard
          icon={<Share2 size={18} style={{ color: "var(--accent-amber)" }} />}
          iconColor="var(--accent-amber)"
          iconBg="var(--accent-amber-light)"
          label="Shares + Saves"
          value={fmt(data.totalShares + data.totalSaves)}
          trend={data.trends.shares}
          prevValue={fmt((data.previousPeriod?.totalShares ?? 0))}
          compareOn={compareOn}
          sparklineData={viewsSparkline}
          sparklineColor="#F59E0B"
        />
      </div>

      {/* Views Over Time */}
      <div style={{ ...CARD_STYLE, padding: 24 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 20px" }}>
          Views Over Time
        </h3>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={data.viewsOverTime} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="tiktokGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="instagramGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#A855F7" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#A855F7" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
            <XAxis
              dataKey="date"
              tickFormatter={fmtDate}
              tick={{ fontSize: 11, fill: "var(--text-tertiary)" } as Record<string, unknown>}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={fmt}
              tick={{ fontSize: 11, fill: "var(--text-tertiary)" } as Record<string, unknown>}
              axisLine={false}
              tickLine={false}
              width={50}
            />
            <Tooltip
              {...TOOLTIP_STYLE}
              labelFormatter={(label) => fmtDate(String(label))}
              formatter={(value: unknown, name: unknown) => [
                fmt(Number(value) || 0),
                name === "tiktokViews" ? "TikTok" : "Instagram",
              ]}
            />
            <Area
              type="monotone"
              dataKey="tiktokViews"
              name="tiktokViews"
              stroke="#3B82F6"
              strokeWidth={2}
              fill="url(#tiktokGrad)"
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="instagramViews"
              name="instagramViews"
              stroke="#A855F7"
              strokeWidth={2}
              fill="url(#instagramGrad)"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
        <div style={{ display: "flex", gap: 20, marginTop: 12, justifyContent: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#3B82F6" }} />
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
              TikTok: {fmt(totalTikTok)} ({totalTikTokPct.toFixed(1)}%)
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#A855F7" }} />
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
              Instagram: {fmt(totalIG)} ({totalIGPct.toFixed(1)}%)
            </span>
          </div>
        </div>
      </div>

      {/* Engagement + Heatmap */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Engagement Breakdown */}
        <div style={{ ...CARD_STYLE, padding: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 16px" }}>
            Engagement Breakdown
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {engBreakdown.map((item) => {
              const total = engBreakdown.reduce((s, x) => s + x.value, 0) || 1;
              const pct = (item.value / total) * 100;
              return (
                <div key={item.name}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 500 }}>
                      {item.name}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>
                      {fmt(item.value)}
                    </span>
                  </div>
                  <div style={{ height: 6, background: "var(--bg-subtle)", borderRadius: 99, overflow: "hidden" }}>
                    <div
                      style={{
                        height: "100%",
                        width: pct + "%",
                        background: item.color,
                        borderRadius: 99,
                        transition: "width 0.3s ease",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Posting Heatmap */}
        <div style={{ ...CARD_STYLE, padding: 24 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
              Best Posting Times
            </h3>
            {bestCell && (
              <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                Best: {dayLabels[bestCell.day]} {hourLabels[Math.floor(bestCell.hour / 3)]}
              </span>
            )}
          </div>
          <div style={{ fontSize: 10, color: "var(--text-tertiary)", display: "flex", gap: 0, marginLeft: 32, marginBottom: 4 }}>
            {hourLabels.map((h) => (
              <div key={h} style={{ width: 22, textAlign: "center" }}>
                {h}
              </div>
            ))}
          </div>
          {dayLabels.map((day, di) => (
            <div key={day} style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 3 }}>
              <span style={{ fontSize: 10, color: "var(--text-tertiary)", width: 28, textAlign: "right", flexShrink: 0 }}>
                {day}
              </span>
              <div style={{ display: "flex", gap: 2 }}>
                {[0, 3, 6, 9, 12, 15, 18, 21].map((hr) => {
                  const intensity = getHeatCell(di, hr);
                  const isBest = bestCell && bestCell.day === di && bestCell.hour === hr;
                  return (
                    <div
                      key={hr}
                      title={`${day} ${hr}:00 - Engagement: ${(intensity * 100).toFixed(0)}%`}
                      style={{
                        width: 18,
                        height: 16,
                        borderRadius: 3,
                        background: intensity > 0 ? `rgba(59,130,246,${0.1 + intensity * 0.85})` : "var(--bg-subtle)",
                        border: isBest ? "1.5px solid #3B82F6" : "1px solid transparent",
                        transition: "background 0.1s",
                      }}
                    />
                  );
                })}
              </div>
            </div>
          ))}
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10 }}>
            <span style={{ fontSize: 10, color: "var(--text-tertiary)" }}>Low</span>
            {[0.1, 0.3, 0.5, 0.7, 0.9].map((v) => (
              <div
                key={v}
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 3,
                  background: `rgba(59,130,246,${0.1 + v * 0.85})`,
                }}
              />
            ))}
            <span style={{ fontSize: 10, color: "var(--text-tertiary)" }}>High</span>
          </div>
        </div>
      </div>

      {/* Top Clips */}
      <div style={{ ...CARD_STYLE, padding: 24 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 16px" }}>
          Top Performing Clips
        </h3>
        {data.topClips.length === 0 ? (
          <div style={{ textAlign: "center", padding: "32px 0", color: "var(--text-tertiary)", fontSize: 14 }}>
            No clips yet. Post some clips to see performance here.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Virality", "Title", "Views", "Eng Rate", "Platforms", "Published"].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: "left",
                      fontSize: 11,
                      fontWeight: 600,
                      color: "var(--text-tertiary)",
                      padding: "0 12px 10px",
                      borderBottom: "1px solid var(--border-subtle)",
                      textTransform: "uppercase" as const,
                      letterSpacing: "0.06em",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.topClips.map((clip, i) => (
                <tr
                  key={clip.clipId}
                  style={{
                    borderBottom: i < data.topClips.length - 1 ? "1px solid var(--border-subtle)" : undefined,
                  }}
                >
                  <td style={{ padding: "12px" }}>
                    <ViralityBadge score={clip.viralityScore} />
                  </td>
                  <td style={{ padding: "12px", fontSize: 13, fontWeight: 500, color: "var(--text-primary)", maxWidth: 200 }}>
                    <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {clip.title}
                    </span>
                  </td>
                  <td style={{ padding: "12px", fontSize: 13, color: "var(--text-primary)", fontWeight: 600 }}>
                    {fmt(clip.totalViews)}
                  </td>
                  <td style={{ padding: "12px", fontSize: 13, color: "var(--text-secondary)" }}>
                    {fmtPct(clip.engagementRate)}
                  </td>
                  <td style={{ padding: "12px" }}>
                    <div style={{ display: "flex", gap: 4 }}>
                      {clip.platforms.map((p) => (
                        <PlatformBadge key={p} platform={p} />
                      ))}
                    </div>
                  </td>
                  <td style={{ padding: "12px", fontSize: 12, color: "var(--text-tertiary)" }}>
                    {fmtDate(clip.publishedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─── Accounts Tab ────────────────────────────────────────────────────────────

function AccountsTab({
  data,
  loading,
  error,
  onRetry,
  expandedAccountId,
  setExpandedAccountId,
  accountDetail,
  accountDetailLoading,
  sortBy,
  setSortBy,
}: {
  data: AccountData[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  expandedAccountId: string | null;
  setExpandedAccountId: (id: string | null) => void;
  accountDetail: AccountDetail | null;
  accountDetailLoading: boolean;
  sortBy: string;
  setSortBy: (s: string) => void;
}) {
  if (loading) {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        {[...Array(6)].map((_, i) => (
          <div key={i} style={{ ...CARD_STYLE, padding: 20, height: 200 }}>
            <SkeletonBlock height={16} width={120} />
            <div style={{ marginTop: 16 }}>
              <SkeletonBlock height={12} />
            </div>
            <div style={{ marginTop: 8 }}>
              <SkeletonBlock height={60} />
            </div>
          </div>
        ))}
      </div>
    );
  }
  if (error) return <SectionError message={error} onRetry={onRetry} />;
  if (!data.length) {
    return (
      <div
        style={{
          ...CARD_STYLE,
          padding: "48px 24px",
          textAlign: "center",
          color: "var(--text-tertiary)",
          fontSize: 14,
        }}
      >
        No connected accounts found.{" "}
        <a href="/dashboard/social-accounts" style={{ color: "var(--accent-blue)" }}>
          Connect an account
        </a>
      </div>
    );
  }

  const sorted = [...data].sort((a, b) => {
    if (sortBy === "totalViews") return b.totalViews - a.totalViews;
    if (sortBy === "avgEngagement") return b.avgEngagement - a.avgEngagement;
    if (sortBy === "followerCount") return b.followerCount - a.followerCount;
    if (sortBy === "publishedPostsCount") return b.publishedPostsCount - a.publishedPostsCount;
    return 0;
  });

  return (
    <div>
      {/* Sort bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Sort by:</span>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          style={{
            fontSize: 13,
            padding: "6px 10px",
            borderRadius: 8,
            border: "1px solid var(--border-default)",
            background: "var(--bg-surface)",
            color: "var(--text-primary)",
            cursor: "pointer",
          }}
        >
          <option value="totalViews">Total Views</option>
          <option value="avgEngagement">Avg Engagement</option>
          <option value="followerCount">Follower Count</option>
          <option value="publishedPostsCount">Posts Count</option>
        </select>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        {sorted.map((account) => {
          const isTikTok = account.platform.toLowerCase() === "tiktok";
          const borderColor = isTikTok ? "#3B82F6" : "#A855F7";
          const initials = (account.displayName || account.username || "?").slice(0, 2).toUpperCase();
          const statusColor =
            account.status === "ACTIVE"
              ? "#10B981"
              : account.status === "PENDING"
              ? "#F59E0B"
              : "#F43F5E";

          return (
            <div
              key={account.id}
              style={{
                ...CARD_STYLE,
                padding: 20,
                borderLeft: `4px solid ${borderColor}`,
                transition: "box-shadow 0.15s",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <div style={{ position: "relative", flexShrink: 0 }}>
                  {account.avatarUrl ? (
                    <img
                      src={account.avatarUrl}
                      alt={account.displayName}
                      style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover" }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: "50%",
                        background: isTikTok ? "rgba(59,130,246,0.12)" : "rgba(168,85,247,0.12)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 14,
                        fontWeight: 700,
                        color: borderColor,
                      }}
                    >
                      {initials}
                    </div>
                  )}
                  <div
                    style={{
                      position: "absolute",
                      bottom: -2,
                      right: -2,
                      width: 14,
                      height: 14,
                      borderRadius: "50%",
                      background: statusColor,
                      border: "2px solid var(--bg-surface)",
                    }}
                  />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: "var(--text-primary)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {account.displayName || account.username}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-tertiary)" }}>@{account.username}</div>
                </div>
                <PlatformBadge platform={account.platform} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
                {[
                  { label: "Followers", value: fmt(account.followerCount) },
                  { label: "Posts", value: account.publishedPostsCount.toString() },
                  { label: "Avg Views", value: fmt(account.avgViews) },
                  { label: "Avg Eng", value: fmtPct(account.avgEngagement) },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    style={{
                      background: "var(--bg-subtle)",
                      borderRadius: 8,
                      padding: "8px 10px",
                    }}
                  >
                    <div style={{ fontSize: 10, color: "var(--text-tertiary)", marginBottom: 2 }}>{stat.label}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{stat.value}</div>
                  </div>
                ))}
              </div>

              {account.recentViews && account.recentViews.length > 0 && (
                <div style={{ marginBottom: 12, height: 40 }}>
                  <ResponsiveContainer width="100%" height={40}>
                    <BarChart data={account.recentViews.map((v, i) => ({ i, v }))}>
                      <Bar dataKey="v" fill={borderColor} isAnimationActive={false} radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              <button
                onClick={() =>
                  setExpandedAccountId(expandedAccountId === account.id ? null : account.id)
                }
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--accent-blue)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "4px 0",
                  marginLeft: "auto",
                }}
              >
                {expandedAccountId === account.id ? "Collapse" : "View Details"}
                <ChevronRight
                  size={13}
                  style={{
                    transform: expandedAccountId === account.id ? "rotate(90deg)" : "none",
                    transition: "transform 0.15s",
                  }}
                />
              </button>
            </div>
          );
        })}
      </div>

      {/* Account Detail Panel */}
      {expandedAccountId && (
        <div style={{ ...CARD_STYLE, padding: 28, marginTop: 20 }}>
          {accountDetailLoading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <SkeletonBlock height={24} width={200} />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
                {[...Array(4)].map((_, i) => (
                  <SkeletonBlock key={i} height={80} />
                ))}
              </div>
              <SkeletonBlock height={180} />
              <SkeletonBlock height={240} />
            </div>
          ) : accountDetail ? (
            <AccountDetailPanel detail={accountDetail} onClose={() => setExpandedAccountId(null)} />
          ) : null}
        </div>
      )}
    </div>
  );
}

function AccountDetailPanel({
  detail,
  onClose,
}: {
  detail: AccountDetail;
  onClose: () => void;
}) {
  const [expandedPost, setExpandedPost] = React.useState<string | null>(null);

  const { account, totals, posts } = detail;
  const isTikTok = account.platform.toLowerCase() === "tiktok";
  const initials = (account.displayName || account.username || "?").slice(0, 2).toUpperCase();

  const postsWithMetrics = posts.filter((p) => p.metrics);
  const bestPost = postsWithMetrics.reduce(
    (best, cur) =>
      (cur.metrics?.views ?? 0) > (best?.metrics?.views ?? 0) ? cur : best,
    postsWithMetrics[0]
  );
  const worstPost = postsWithMetrics.reduce(
    (worst, cur) =>
      (cur.metrics?.views ?? 0) < (worst?.metrics?.views ?? Infinity) ? cur : worst,
    postsWithMetrics[0]
  );

  const donutData = [
    { name: "Likes", value: totals.likes, color: COLORS.likes },
    { name: "Comments", value: totals.comments, color: COLORS.comments },
    { name: "Shares", value: totals.shares, color: COLORS.shares },
    { name: "Saves", value: totals.saves, color: COLORS.saves },
  ];

  const viewsChartData = posts
    .filter((p) => p.metrics)
    .sort((a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime())
    .map((p) => ({ date: fmtDate(p.publishedAt), views: p.metrics?.views ?? 0 }));

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {account.avatarUrl ? (
            <img
              src={account.avatarUrl}
              alt={account.displayName}
              style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover" }}
            />
          ) : (
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                background: isTikTok ? "rgba(59,130,246,0.12)" : "rgba(168,85,247,0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
                fontWeight: 700,
                color: isTikTok ? "#3B82F6" : "#A855F7",
              }}
            >
              {initials}
            </div>
          )}
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: "var(--text-primary)" }}>
              {account.displayName}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
              <span style={{ fontSize: 13, color: "var(--text-tertiary)" }}>@{account.username}</span>
              <PlatformBadge platform={account.platform} />
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: account.isActive ? "#10B981" : "#F43F5E",
                  background: account.isActive ? "rgba(16,185,129,0.08)" : "rgba(244,63,94,0.08)",
                  borderRadius: 99,
                  padding: "1px 8px",
                }}
              >
                {account.isActive ? "Active" : "Inactive"}
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 32,
            height: 32,
            borderRadius: 8,
            border: "1px solid var(--border-default)",
            background: "var(--bg-subtle)",
            cursor: "pointer",
            color: "var(--text-secondary)",
          }}
        >
          <X size={14} />
        </button>
      </div>

      {/* 4 mini stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Total Views", value: fmt(totals.views) },
          { label: "Avg Engagement", value: totals.posts > 0 ? fmtPct(((totals.likes + totals.comments) / totals.views) * 100) : "—" },
          { label: "Follower Count", value: fmt(account.followerCount) },
          { label: "Posts Published", value: totals.posts.toString() },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              background: "var(--bg-subtle)",
              borderRadius: 10,
              padding: "14px 16px",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 4 }}>{stat.label}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "var(--text-primary)" }}>{stat.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20, marginBottom: 24 }}>
        {/* Views over time */}
        <div>
          <h4 style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", margin: "0 0 12px" }}>
            Views Per Post (chronological)
          </h4>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={viewsChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: "var(--text-tertiary)" } as Record<string, unknown>}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={fmt}
                tick={{ fontSize: 10, fill: "var(--text-tertiary)" } as Record<string, unknown>}
                axisLine={false}
                tickLine={false}
                width={40}
              />
              <Tooltip {...TOOLTIP_STYLE} formatter={(v: unknown) => [fmt(Number(v) || 0), "Views"]} />
              <Line
                type="monotone"
                dataKey="views"
                stroke={isTikTok ? "#3B82F6" : "#A855F7"}
                strokeWidth={2}
                dot={{ r: 3 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Engagement Donut */}
        <div>
          <h4 style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", margin: "0 0 12px" }}>
            Engagement Distribution
          </h4>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie
                data={donutData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={65}
                dataKey="value"
                isAnimationActive={false}
              >
                {donutData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip {...TOOLTIP_STYLE} formatter={(v: unknown) => [fmt(Number(v) || 0), ""]} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "4px 10px", marginTop: 4 }}>
            {donutData.map((d) => (
              <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: d.color }} />
                <span style={{ fontSize: 10, color: "var(--text-tertiary)" }}>{d.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Posts table */}
      <h4 style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", margin: "0 0 12px" }}>
        Post Performance
      </h4>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            {["Title", "Posted", "Views", "Likes", "Comments", "Shares", "Eng Rate"].map((h) => (
              <th
                key={h}
                style={{
                  textAlign: "left",
                  fontSize: 11,
                  fontWeight: 600,
                  color: "var(--text-tertiary)",
                  padding: "0 10px 8px",
                  borderBottom: "1px solid var(--border-subtle)",
                  textTransform: "uppercase" as const,
                  letterSpacing: "0.06em",
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {posts.map((post, i) => {
            const isBest = bestPost && post.publishLogId === bestPost.publishLogId;
            const isWorst = worstPost && post.publishLogId === worstPost.publishLogId && post.publishLogId !== bestPost?.publishLogId;
            const isExpanded = expandedPost === post.publishLogId;

            return (
              <React.Fragment key={post.publishLogId}>
                <tr
                  style={{
                    borderBottom: "1px solid var(--border-subtle)",
                    opacity: isWorst ? 0.55 : 1,
                    background: isBest ? "rgba(16,185,129,0.03)" : undefined,
                    cursor: post.platformPostId ? "pointer" : "default",
                  }}
                  onClick={() => setExpandedPost(isExpanded ? null : post.publishLogId)}
                >
                  <td style={{ padding: "10px 10px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {isBest && <Star size={12} fill="#F59E0B" style={{ color: "#F59E0B", flexShrink: 0 }} />}
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 500,
                          color: "var(--text-primary)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          maxWidth: 180,
                          display: "block",
                        }}
                      >
                        {post.clip.title}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: "10px", fontSize: 12, color: "var(--text-tertiary)" }}>
                    {fmtDate(post.publishedAt)}
                  </td>
                  <td style={{ padding: "10px", fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                    {post.metrics ? fmt(post.metrics.views) : "—"}
                  </td>
                  <td style={{ padding: "10px", fontSize: 13, color: "var(--text-secondary)" }}>
                    {post.metrics ? fmt(post.metrics.likes) : "—"}
                  </td>
                  <td style={{ padding: "10px", fontSize: 13, color: "var(--text-secondary)" }}>
                    {post.metrics ? fmt(post.metrics.comments) : "—"}
                  </td>
                  <td style={{ padding: "10px", fontSize: 13, color: "var(--text-secondary)" }}>
                    {post.metrics ? fmt(post.metrics.shares) : "—"}
                  </td>
                  <td style={{ padding: "10px", fontSize: 13, color: "var(--text-secondary)" }}>
                    {post.metrics ? fmtPct(post.metrics.engagementRate) : "—"}
                  </td>
                </tr>
                {isExpanded && post.platformPostId && (
                  <tr style={{ background: "var(--bg-subtle)" }}>
                    <td colSpan={7} style={{ padding: "10px 10px" }}>
                      <a
                        href={`https://${account.platform.toLowerCase()}.com/${post.platformPostId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          fontSize: 12,
                          color: "var(--accent-blue)",
                          textDecoration: "none",
                        }}
                      >
                        <ExternalLink size={12} /> View on {account.platform}
                      </a>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Clips Tab ────────────────────────────────────────────────────────────────

function ClipsTab({
  data,
  loading,
  error,
  onRetry,
  expandedClipId,
  setExpandedClipId,
  sortBy,
  setSortBy,
}: {
  data: ClipData[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  expandedClipId: string | null;
  setExpandedClipId: (id: string | null) => void;
  sortBy: string;
  setSortBy: (s: string) => void;
}) {
  if (loading) {
    return (
      <div style={{ ...CARD_STYLE, padding: 24 }}>
        <SkeletonBlock height={20} width={200} />
        <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 12 }}>
          {[...Array(5)].map((_, i) => (
            <SkeletonBlock key={i} height={48} />
          ))}
        </div>
      </div>
    );
  }
  if (error) return <SectionError message={error} onRetry={onRetry} />;

  const sorted = [...data].sort((a, b) => {
    if (sortBy === "totalViews") return b.totalViews - a.totalViews;
    if (sortBy === "engagementRate") return b.avgEngRate - a.avgEngRate;
    if (sortBy === "viralityScore") return b.viralityScore - a.viralityScore;
    return 0;
  });

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Sort by:</span>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          style={{
            fontSize: 13,
            padding: "6px 10px",
            borderRadius: 8,
            border: "1px solid var(--border-default)",
            background: "var(--bg-surface)",
            color: "var(--text-primary)",
            cursor: "pointer",
          }}
        >
          <option value="totalViews">Total Views</option>
          <option value="engagementRate">Engagement Rate</option>
          <option value="viralityScore">Virality Score</option>
        </select>
      </div>

      <div style={{ ...CARD_STYLE, overflow: "hidden" }}>
        {sorted.length === 0 ? (
          <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--text-tertiary)", fontSize: 14 }}>
            No clips with analytics data yet. Publish clips and run a sync to see performance.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--bg-subtle)" }}>
                {["", "Virality", "Title", "Source Video", "Type", "TikTok", "Instagram", "Total Views", "Eng Rate", "Status"].map(
                  (h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: "left",
                        fontSize: 11,
                        fontWeight: 600,
                        color: "var(--text-tertiary)",
                        padding: "10px 12px",
                        borderBottom: "1px solid var(--border-default)",
                        textTransform: "uppercase" as const,
                        letterSpacing: "0.06em",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {sorted.map((clip, i) => {
                const isExpanded = expandedClipId === clip.id;
                return (
                  <React.Fragment key={clip.id}>
                    <tr
                      style={{
                        borderBottom: "1px solid var(--border-subtle)",
                        background: isExpanded ? "var(--bg-subtle)" : undefined,
                        cursor: "pointer",
                      }}
                      onClick={() => setExpandedClipId(isExpanded ? null : clip.id)}
                    >
                      <td style={{ padding: "12px 12px", width: 28 }}>
                        <ChevronRight
                          size={14}
                          style={{
                            color: "var(--text-tertiary)",
                            transform: isExpanded ? "rotate(90deg)" : "none",
                            transition: "transform 0.15s",
                          }}
                        />
                      </td>
                      <td style={{ padding: "12px 12px" }}>
                        <ViralityBadge score={clip.viralityScore} />
                      </td>
                      <td style={{ padding: "12px 12px" }}>
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 500,
                            color: "var(--text-primary)",
                            display: "block",
                            maxWidth: 180,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {clip.title}
                        </span>
                      </td>
                      <td style={{ padding: "12px 12px" }}>
                        <span
                          style={{
                            fontSize: 12,
                            color: "var(--text-tertiary)",
                            display: "block",
                            maxWidth: 140,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {clip.sourceVideoTitle || "—"}
                        </span>
                      </td>
                      <td style={{ padding: "12px 12px" }}>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: "var(--text-secondary)",
                            background: "var(--bg-subtle)",
                            borderRadius: 99,
                            padding: "2px 7px",
                            border: "1px solid var(--border-subtle)",
                            textTransform: "capitalize" as const,
                          }}
                        >
                          {clip.clipType}
                        </span>
                      </td>
                      <td style={{ padding: "12px 12px", fontSize: 13, color: "var(--text-secondary)" }}>
                        {clip.accountsPostedTo.tiktok > 0 ? (
                          <span style={{ color: "#3B82F6", fontWeight: 600 }}>{clip.accountsPostedTo.tiktok}</span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td style={{ padding: "12px 12px", fontSize: 13, color: "var(--text-secondary)" }}>
                        {clip.accountsPostedTo.instagram > 0 ? (
                          <span style={{ color: "#A855F7", fontWeight: 600 }}>{clip.accountsPostedTo.instagram}</span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td style={{ padding: "12px 12px", fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
                        {clip.totalViews > 0 ? fmt(clip.totalViews) : "—"}
                      </td>
                      <td style={{ padding: "12px 12px", fontSize: 13, color: "var(--text-secondary)" }}>
                        {clip.avgEngRate > 0 ? fmtPct(clip.avgEngRate) : "—"}
                      </td>
                      <td style={{ padding: "12px 12px" }}>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color:
                              clip.status === "PUBLISHED"
                                ? "#10B981"
                                : clip.status === "READY"
                                ? "#3B82F6"
                                : "var(--text-tertiary)",
                            background:
                              clip.status === "PUBLISHED"
                                ? "rgba(16,185,129,0.08)"
                                : clip.status === "READY"
                                ? "rgba(59,130,246,0.08)"
                                : "var(--bg-subtle)",
                            borderRadius: 99,
                            padding: "2px 8px",
                            textTransform: "capitalize" as const,
                          }}
                        >
                          {clip.status.toLowerCase()}
                        </span>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={10} style={{ padding: 0, background: "var(--bg-subtle)" }}>
                          <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border-subtle)", borderBottom: "1px solid var(--border-subtle)" }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 10, textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>
                              Per-Account Breakdown
                            </div>
                            {clip.perAccountBreakdown.length === 0 ? (
                              <div style={{ fontSize: 13, color: "var(--text-tertiary)" }}>No publish data available.</div>
                            ) : (
                              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                <thead>
                                  <tr>
                                    {["Account", "Platform", "Views", "Likes", "Comments", "Shares", "Eng Rate", "Posted At"].map((h) => (
                                      <th
                                        key={h}
                                        style={{
                                          textAlign: "left",
                                          fontSize: 10,
                                          fontWeight: 600,
                                          color: "var(--text-tertiary)",
                                          padding: "4px 8px 8px",
                                          borderBottom: "1px solid var(--border-subtle)",
                                          textTransform: "uppercase" as const,
                                          letterSpacing: "0.05em",
                                        }}
                                      >
                                        {h}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {[...clip.perAccountBreakdown]
                                    .sort((a, b) => b.views - a.views)
                                    .map((row) => (
                                      <tr key={row.accountId}>
                                        <td style={{ padding: "8px", fontSize: 12, color: "var(--text-primary)", fontWeight: 500 }}>
                                          {row.displayName || row.handle}
                                        </td>
                                        <td style={{ padding: "8px" }}>
                                          <PlatformBadge platform={row.platform} />
                                        </td>
                                        <td style={{ padding: "8px", fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>
                                          {row.views > 0 ? fmt(row.views) : "—"}
                                        </td>
                                        <td style={{ padding: "8px", fontSize: 12, color: "var(--text-secondary)" }}>
                                          {row.likes > 0 ? fmt(row.likes) : "—"}
                                        </td>
                                        <td style={{ padding: "8px", fontSize: 12, color: "var(--text-secondary)" }}>
                                          {row.comments > 0 ? fmt(row.comments) : "—"}
                                        </td>
                                        <td style={{ padding: "8px", fontSize: 12, color: "var(--text-secondary)" }}>
                                          {row.shares > 0 ? fmt(row.shares) : "—"}
                                        </td>
                                        <td style={{ padding: "8px", fontSize: 12, color: "var(--text-secondary)" }}>
                                          {row.engRate > 0 ? fmtPct(row.engRate) : "—"}
                                        </td>
                                        <td style={{ padding: "8px", fontSize: 12, color: "var(--text-tertiary)" }}>
                                          {fmtDate(row.postedAt)}
                                        </td>
                                      </tr>
                                    ))}
                                </tbody>
                              </table>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─── Leads Tab ────────────────────────────────────────────────────────────────

function LeadsTab({
  data,
  loading,
  error,
  onRetry,
}: {
  data: LeadsData | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
          {[...Array(4)].map((_, i) => (
            <div key={i} style={{ ...CARD_STYLE, padding: 20, height: 100 }}>
              <SkeletonBlock height={14} width={100} />
              <div style={{ marginTop: 12 }}>
                <SkeletonBlock height={28} width={80} />
              </div>
            </div>
          ))}
        </div>
        <div style={{ ...CARD_STYLE, padding: 24, height: 240 }}>
          <SkeletonBlock height={180} />
        </div>
      </div>
    );
  }
  if (error) return <SectionError message={error} onRetry={onRetry} />;
  if (!data) return null;

  const { stats, leadsOverTime, leadsByFunnel, leadsBySource, statusPipeline, recentLeads } = data;

  const sourceData = [
    { name: "Direct", value: leadsBySource.direct, color: "#3B82F6" },
    { name: "TikTok", value: leadsBySource.tiktok, color: "#000000" },
    { name: "Instagram", value: leadsBySource.instagram, color: "#A855F7" },
    { name: "Other", value: leadsBySource.other, color: "#94A3B8" },
  ].filter((d) => d.value > 0);

  const maxFunnel = Math.max(...leadsByFunnel.map((f) => f.count), 1);

  const pipeline = [
    { key: "new", label: "NEW", color: "#3B82F6", bg: "rgba(59,130,246,0.08)", count: statusPipeline.new },
    { key: "contacted", label: "CONTACTED", color: "#F59E0B", bg: "rgba(245,158,11,0.08)", count: statusPipeline.contacted },
    { key: "qualified", label: "QUALIFIED", color: "#7C3AED", bg: "rgba(124,58,237,0.08)", count: statusPipeline.qualified },
    { key: "converted", label: "CONVERTED", color: "#10B981", bg: "rgba(16,185,129,0.08)", count: statusPipeline.converted },
    { key: "lost", label: "LOST", color: "#F43F5E", bg: "rgba(244,63,94,0.08)", count: statusPipeline.lost },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* 4 Stat Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        <div style={{ ...CARD_STYLE, padding: 20 }}>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 8 }}>Total Leads</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "var(--text-primary)" }}>
            {stats.totalLeads.toLocaleString()}
          </div>
        </div>
        <div style={{ ...CARD_STYLE, padding: 20 }}>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 8 }}>Leads Per Day</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "var(--text-primary)" }}>
            {stats.leadsPerDay.toFixed(1)}
          </div>
        </div>
        <div style={{ ...CARD_STYLE, padding: 20 }}>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 8 }}>Top Source</div>
          <div
            style={{
              fontSize: 18,
              fontWeight: 800,
              color: "var(--text-primary)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {stats.topSource || "—"}
          </div>
        </div>
        <div style={{ ...CARD_STYLE, padding: 20 }}>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 8 }}>Lead-to-Sale Rate</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "var(--text-primary)" }}>
            {fmtPct(stats.leadToSaleRate)}
          </div>
        </div>
      </div>

      {/* Leads Over Time */}
      <div style={{ ...CARD_STYLE, padding: 24 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 16px" }}>
          Leads Over Time
        </h3>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={leadsOverTime} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="leadsGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
            <XAxis
              dataKey="date"
              tickFormatter={fmtDate}
              tick={{ fontSize: 11, fill: "var(--text-tertiary)" } as Record<string, unknown>}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "var(--text-tertiary)" } as Record<string, unknown>}
              axisLine={false}
              tickLine={false}
              width={30}
            />
            <Tooltip
              {...TOOLTIP_STYLE}
              labelFormatter={(l) => fmtDate(String(l))}
              formatter={(v: unknown) => [Number(v) || 0, "Leads"]}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke="#F59E0B"
              strokeWidth={2}
              fill="url(#leadsGrad)"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Funnels + Sources */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Leads by Funnel */}
        <div style={{ ...CARD_STYLE, padding: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 16px" }}>
            Leads by Funnel
          </h3>
          {leadsByFunnel.length === 0 ? (
            <div style={{ fontSize: 13, color: "var(--text-tertiary)" }}>No funnel data available.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {leadsByFunnel.map((funnel) => (
                <div key={funnel.funnelId}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <a
                      href={`/dashboard/leads?funnel=${funnel.funnelId}`}
                      style={{ fontSize: 13, color: "var(--accent-blue)", fontWeight: 500, textDecoration: "none" }}
                    >
                      {funnel.funnelName}
                    </a>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>
                      {funnel.count}
                    </span>
                  </div>
                  <div style={{ height: 6, background: "var(--bg-subtle)", borderRadius: 99, overflow: "hidden" }}>
                    <div
                      style={{
                        height: "100%",
                        width: ((funnel.count / maxFunnel) * 100).toFixed(1) + "%",
                        background: "#F59E0B",
                        borderRadius: 99,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Lead Source Breakdown */}
        <div style={{ ...CARD_STYLE, padding: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 16px" }}>
            Lead Sources
          </h3>
          {sourceData.length === 0 ? (
            <div style={{ fontSize: 13, color: "var(--text-tertiary)" }}>No source data available.</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={sourceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    dataKey="value"
                    isAnimationActive={false}
                  >
                    {sourceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip {...TOOLTIP_STYLE} formatter={(v: unknown) => [Number(v) || 0, "Leads"]} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "6px 16px", marginTop: 8, justifyContent: "center" }}>
                {sourceData.map((d) => (
                  <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: d.color }} />
                    <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                      {d.name} ({d.value})
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Pipeline */}
      <div style={{ ...CARD_STYLE, padding: 24 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 20px" }}>
          Lead Pipeline
        </h3>
        <div style={{ display: "flex", alignItems: "center", gap: 0, overflowX: "auto" }}>
          {pipeline.map((stage, i) => {
            const nextStage = pipeline[i + 1];
            const convPct =
              stage.count > 0 && nextStage
                ? ((nextStage.count / stage.count) * 100).toFixed(0) + "%"
                : null;
            return (
              <React.Fragment key={stage.key}>
                <div
                  style={{
                    background: stage.bg,
                    border: `1px solid ${stage.color}30`,
                    borderRadius: 12,
                    padding: "16px 20px",
                    textAlign: "center",
                    minWidth: 110,
                    flex: 1,
                  }}
                >
                  <div style={{ fontSize: 9, fontWeight: 700, color: stage.color, letterSpacing: "0.1em", marginBottom: 6 }}>
                    {stage.label}
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: stage.color }}>{stage.count}</div>
                  <div style={{ fontSize: 10, color: stage.color, opacity: 0.7, marginTop: 2 }}>leads</div>
                </div>
                {i < pipeline.length - 1 && (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "0 8px", flexShrink: 0 }}>
                    <ChevronRight size={16} style={{ color: "var(--text-tertiary)" }} />
                    {convPct && (
                      <span style={{ fontSize: 9, color: "var(--text-tertiary)", marginTop: 2 }}>{convPct}</span>
                    )}
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Recent Leads */}
      <div style={{ ...CARD_STYLE, padding: 24 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 16px" }}>
          Recent Leads
        </h3>
        {recentLeads.length === 0 ? (
          <div style={{ fontSize: 13, color: "var(--text-tertiary)", textAlign: "center", padding: "24px 0" }}>
            No leads yet.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Name", "Email", "Funnel", "Source", "Status", "Created", "Days"].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: "left",
                      fontSize: 11,
                      fontWeight: 600,
                      color: "var(--text-tertiary)",
                      padding: "0 10px 10px",
                      borderBottom: "1px solid var(--border-subtle)",
                      textTransform: "uppercase" as const,
                      letterSpacing: "0.06em",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentLeads.map((lead, i) => {
                const urgent = lead.daysSince > 2 && lead.status.toLowerCase() === "new";
                return (
                  <tr
                    key={lead.id}
                    style={{ borderBottom: i < recentLeads.length - 1 ? "1px solid var(--border-subtle)" : undefined }}
                  >
                    <td style={{ padding: "10px" }}>
                      <a
                        href={`/dashboard/leads?id=${lead.id}`}
                        style={{
                          fontSize: 13,
                          fontWeight: 500,
                          color: "var(--text-primary)",
                          textDecoration: "none",
                        }}
                      >
                        {lead.name}
                      </a>
                    </td>
                    <td style={{ padding: "10px", fontSize: 12, color: "var(--text-secondary)" }}>
                      {lead.email}
                    </td>
                    <td style={{ padding: "10px", fontSize: 12, color: "var(--text-secondary)", maxWidth: 140 }}>
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>
                        {lead.funnel}
                      </span>
                    </td>
                    <td style={{ padding: "10px", fontSize: 12, color: "var(--text-secondary)", textTransform: "capitalize" as const }}>
                      {lead.source}
                    </td>
                    <td style={{ padding: "10px" }}>
                      <StatusBadge status={lead.status} />
                    </td>
                    <td style={{ padding: "10px", fontSize: 12, color: "var(--text-tertiary)" }}>
                      {fmtDate(lead.createdAt)}
                    </td>
                    <td
                      style={{
                        padding: "10px",
                        fontSize: 12,
                        fontWeight: urgent ? 700 : 400,
                        color: urgent ? "#F43F5E" : "var(--text-tertiary)",
                      }}
                    >
                      {lead.daysSince}d
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─── Revenue Tab ─────────────────────────────────────────────────────────────

function RevenueTab({
  data,
  loading,
  error,
  onRetry,
  workspaceId,
  settingsOpen,
  setSettingsOpen,
  challengePrice,
  setChallengePrice,
  coachingPrice,
  setCoachingPrice,
}: {
  data: RevenueData | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  workspaceId: string;
  settingsOpen: boolean;
  setSettingsOpen: (v: boolean) => void;
  challengePrice: number;
  setChallengePrice: (v: number) => void;
  coachingPrice: number;
  setCoachingPrice: (v: number) => void;
}) {
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);

  const saveSettings = async () => {
    setSaving(true);
    try {
      await fetch(`/api/workspaces/${workspaceId}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeTicketPrice: challengePrice, coachingProgramPrice: coachingPrice }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ ...CARD_STYLE, padding: 24, height: 160 }}>
          <SkeletonBlock height={20} width={200} />
          <div style={{ marginTop: 16 }}>
            <SkeletonBlock height={80} />
          </div>
        </div>
        <div style={{ ...CARD_STYLE, padding: 24, height: 280 }}>
          <SkeletonBlock height={200} />
        </div>
      </div>
    );
  }
  if (error) return <SectionError message={error} onRetry={onRetry} />;

  const revenueSettingsCard = (
    <div style={{ ...CARD_STYLE, marginBottom: 24, overflow: "hidden" }}>
      <button
        onClick={() => setSettingsOpen(!settingsOpen)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          padding: "16px 20px",
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "var(--text-primary)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <DollarSign size={16} style={{ color: "var(--accent-emerald)" }} />
          <span style={{ fontSize: 14, fontWeight: 600 }}>Revenue Settings</span>
        </div>
        {settingsOpen ? <ChevronUp size={16} style={{ color: "var(--text-tertiary)" }} /> : <ChevronDown size={16} style={{ color: "var(--text-tertiary)" }} />}
      </button>
      {settingsOpen && (
        <div style={{ padding: "0 20px 20px", borderTop: "1px solid var(--border-subtle)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>
                Challenge Ticket Price ($)
              </label>
              <input
                type="number"
                value={challengePrice}
                onChange={(e) => setChallengePrice(Number(e.target.value))}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "1px solid var(--border-default)",
                  background: "var(--bg-subtle)",
                  color: "var(--text-primary)",
                  fontSize: 14,
                  boxSizing: "border-box" as const,
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>
                Coaching Program Price ($)
              </label>
              <input
                type="number"
                value={coachingPrice}
                onChange={(e) => setCoachingPrice(Number(e.target.value))}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "1px solid var(--border-default)",
                  background: "var(--bg-subtle)",
                  color: "var(--text-primary)",
                  fontSize: 14,
                  boxSizing: "border-box" as const,
                }}
              />
            </div>
          </div>
          <button
            onClick={saveSettings}
            disabled={saving}
            style={{
              marginTop: 14,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 20px",
              borderRadius: 8,
              background: "var(--accent-emerald)",
              color: "#fff",
              fontSize: 13,
              fontWeight: 600,
              border: "none",
              cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : saved ? <Check size={13} /> : null}
            {saved ? "Saved!" : "Save Settings"}
          </button>
        </div>
      )}
    </div>
  );

  if (!data || !data.hasData) {
    return (
      <div>
        {revenueSettingsCard}
        <div
          style={{
            ...CARD_STYLE,
            padding: "64px 48px",
            textAlign: "center",
            maxWidth: 520,
            margin: "0 auto",
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: "var(--accent-emerald-light)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 20px",
            }}
          >
            <DollarSign size={28} style={{ color: "var(--accent-emerald)" }} />
          </div>
          <h3 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 10px" }}>
            No revenue data yet
          </h3>
          <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6, margin: "0 0 24px" }}>
            Mark leads as Converted in the Leads page to see revenue analytics here.
          </p>
          <a
            href="/dashboard/leads"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "10px 20px",
              borderRadius: 8,
              background: "var(--accent-emerald)",
              color: "#fff",
              fontSize: 14,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Go to Leads <ArrowRight size={14} />
          </a>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {revenueSettingsCard}

      {/* Hero Revenue Number */}
      <div
        style={{
          ...CARD_STYLE,
          padding: "40px 24px",
          textAlign: "center",
          background: "linear-gradient(135deg, rgba(16,185,129,0.06) 0%, rgba(59,130,246,0.06) 100%)",
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", letterSpacing: "0.1em", marginBottom: 8 }}>
          ESTIMATED REVENUE THIS PERIOD
        </div>
        <div style={{ fontSize: 52, fontWeight: 900, color: "var(--text-primary)", lineHeight: 1 }}>
          {fmtCurrency(data.totalRevenue)}
        </div>
        <div
          style={{
            display: "flex",
            gap: 20,
            justifyContent: "center",
            marginTop: 14,
            fontSize: 14,
            color: "var(--text-secondary)",
          }}
        >
          <span>
            <span style={{ color: COLORS.challenge, fontWeight: 600 }}>Challenge: </span>
            {fmtCurrency(data.revenueByProduct.challenge)}
          </span>
          <span style={{ color: "var(--text-tertiary)" }}>|</span>
          <span>
            <span style={{ color: COLORS.coaching, fontWeight: 600 }}>Coaching: </span>
            {fmtCurrency(data.revenueByProduct.coaching)}
          </span>
        </div>
      </div>

      {/* Revenue Over Time */}
      <div style={{ ...CARD_STYLE, padding: 24 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 16px" }}>
          Revenue Over Time
        </h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data.revenueOverTime} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: "var(--text-tertiary)" } as Record<string, unknown>}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v) => fmtCurrency(v)}
              tick={{ fontSize: 11, fill: "var(--text-tertiary)" } as Record<string, unknown>}
              axisLine={false}
              tickLine={false}
              width={60}
            />
            <Tooltip
              {...TOOLTIP_STYLE}
              formatter={(v: unknown, name: unknown) => [fmtCurrency(Number(v) || 0), name === "challengeRevenue" ? "Challenge" : "Coaching"]}
            />
            <Legend formatter={(v) => (v === "challengeRevenue" ? "Challenge" : "Coaching")} />
            <Bar dataKey="challengeRevenue" fill={COLORS.challenge} stackId="a" isAnimationActive={false} radius={[0, 0, 0, 0]} />
            <Bar dataKey="coachingRevenue" fill={COLORS.coaching} stackId="a" isAnimationActive={false} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Revenue by Funnel */}
      <div style={{ ...CARD_STYLE, padding: 24 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 16px" }}>
          Revenue by Funnel
        </h3>
        {data.revenueByFunnel.length === 0 ? (
          <div style={{ fontSize: 13, color: "var(--text-tertiary)" }}>No funnel revenue data.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Funnel", "Type", "Leads", "Conversions", "Conv Rate", "Revenue"].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: "left",
                      fontSize: 11,
                      fontWeight: 600,
                      color: "var(--text-tertiary)",
                      padding: "0 12px 10px",
                      borderBottom: "1px solid var(--border-subtle)",
                      textTransform: "uppercase" as const,
                      letterSpacing: "0.06em",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.revenueByFunnel.map((row, i) => (
                <tr
                  key={row.funnelId}
                  style={{ borderBottom: i < data.revenueByFunnel.length - 1 ? "1px solid var(--border-subtle)" : undefined }}
                >
                  <td style={{ padding: "12px", fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>
                    {row.name}
                  </td>
                  <td style={{ padding: "12px" }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: row.type === "challenge" ? COLORS.challenge : COLORS.coaching,
                        background: row.type === "challenge" ? "rgba(59,130,246,0.08)" : "rgba(16,185,129,0.08)",
                        borderRadius: 99,
                        padding: "2px 8px",
                        textTransform: "capitalize" as const,
                      }}
                    >
                      {row.type}
                    </span>
                  </td>
                  <td style={{ padding: "12px", fontSize: 13, color: "var(--text-secondary)" }}>{row.leads}</td>
                  <td style={{ padding: "12px", fontSize: 13, color: "var(--text-secondary)" }}>{row.conversions}</td>
                  <td style={{ padding: "12px", fontSize: 13, color: "var(--text-secondary)" }}>
                    {fmtPct(row.convRate)}
                  </td>
                  <td style={{ padding: "12px", fontSize: 13, fontWeight: 700, color: "var(--accent-emerald)" }}>
                    {fmtCurrency(row.revenue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Clip Attribution */}
      <div style={{ ...CARD_STYLE, padding: 24 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 16px" }}>
          Clip Attribution
        </h3>
        {data.clipAttribution.length === 0 ? (
          <div
            style={{
              padding: "24px",
              background: "var(--bg-subtle)",
              borderRadius: 10,
              fontSize: 13,
              color: "var(--text-secondary)",
              lineHeight: 1.6,
            }}
          >
            Set up UTM tracking on your links (utm_campaign=clip_CLIPID) to see which clips drive revenue.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Clip", "Views", "Leads", "Conversions", "Revenue"].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: "left",
                      fontSize: 11,
                      fontWeight: 600,
                      color: "var(--text-tertiary)",
                      padding: "0 12px 10px",
                      borderBottom: "1px solid var(--border-subtle)",
                      textTransform: "uppercase" as const,
                      letterSpacing: "0.06em",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.clipAttribution.map((row, i) => (
                <tr
                  key={row.clipId}
                  style={{ borderBottom: i < data.clipAttribution.length - 1 ? "1px solid var(--border-subtle)" : undefined }}
                >
                  <td style={{ padding: "12px", fontSize: 13, fontWeight: 500, color: "var(--text-primary)", maxWidth: 200 }}>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>
                      {row.title}
                    </span>
                  </td>
                  <td style={{ padding: "12px", fontSize: 13, color: "var(--text-secondary)" }}>{fmt(row.views)}</td>
                  <td style={{ padding: "12px", fontSize: 13, color: "var(--text-secondary)" }}>{row.leadsGenerated}</td>
                  <td style={{ padding: "12px", fontSize: 13, color: "var(--text-secondary)" }}>{row.conversions}</td>
                  <td style={{ padding: "12px", fontSize: 13, fontWeight: 700, color: "var(--accent-emerald)" }}>
                    {fmtCurrency(row.revenue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Projections */}
      <div
        style={{
          ...CARD_STYLE,
          padding: 24,
          background: "linear-gradient(135deg, rgba(59,130,246,0.05) 0%, rgba(16,185,129,0.05) 100%)",
          border: "1px solid rgba(16,185,129,0.2)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <Activity size={18} style={{ color: "var(--accent-emerald)" }} />
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
            Revenue Projection
          </h3>
        </div>
        <p style={{ fontSize: 14, color: "var(--text-secondary)", margin: "0 0 10px", lineHeight: 1.6 }}>
          At your current rate of{" "}
          <strong style={{ color: "var(--text-primary)" }}>{data.projection.monthlyLeads} leads/month</strong> with{" "}
          <strong style={{ color: "var(--text-primary)" }}>{fmtPct(data.projection.convRate)}</strong> conversion, you're
          projected to earn{" "}
          <strong style={{ color: "var(--accent-emerald)", fontSize: 16 }}>
            {fmtCurrency(data.projection.projectedMonthly)}
          </strong>{" "}
          this month.
        </p>
      </div>
    </div>
  );
}

// ─── Main Page Component ─────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const { workspace, isLoading: workspaceLoading } = useWorkspace();

  // Global state
  const [activeTab, setActiveTab] = React.useState<Tab>("overview");
  const [timeRange, setTimeRange] = React.useState<TimeRange>("30d");
  const [platform, setPlatform] = React.useState<Platform>("all");
  const [compareOn, setCompareOn] = React.useState(false);
  const [syncing, setSyncing] = React.useState(false);
  const [lastSynced, setLastSynced] = React.useState<Date | null>(null);
  const [showStaleWarning, setShowStaleWarning] = React.useState(false);

  // Account filter
  const [accountsList, setAccountsList] = React.useState<AccountData[]>([]);
  const [selectedAccountIds, setSelectedAccountIds] = React.useState<string[]>([]);
  const [accountFilterOpen, setAccountFilterOpen] = React.useState(false);
  const accountFilterRef = useRef<HTMLDivElement>(null);

  // Activity check
  const [activityChecked, setActivityChecked] = React.useState(false);
  const [hasActivity, setHasActivity] = React.useState(false);

  // Per-tab data
  const [overviewData, setOverviewData] = React.useState<OverviewData | null>(null);
  const [overviewLoading, setOverviewLoading] = React.useState(false);
  const [overviewError, setOverviewError] = React.useState<string | null>(null);

  const [accountsData, setAccountsData] = React.useState<AccountData[]>([]);
  const [accountsLoading, setAccountsLoading] = React.useState(false);
  const [accountsError, setAccountsError] = React.useState<string | null>(null);
  const [expandedAccountId, setExpandedAccountId] = React.useState<string | null>(null);
  const [accountDetail, setAccountDetail] = React.useState<AccountDetail | null>(null);
  const [accountDetailLoading, setAccountDetailLoading] = React.useState(false);
  const [accountSortBy, setAccountSortBy] = React.useState("totalViews");

  const [clipsData, setClipsData] = React.useState<ClipData[]>([]);
  const [clipsLoading, setClipsLoading] = React.useState(false);
  const [clipsError, setClipsError] = React.useState<string | null>(null);
  const [expandedClipId, setExpandedClipId] = React.useState<string | null>(null);
  const [clipSortBy, setClipSortBy] = React.useState("totalViews");

  const [leadsData, setLeadsData] = React.useState<LeadsData | null>(null);
  const [leadsLoading, setLeadsLoading] = React.useState(false);
  const [leadsError, setLeadsError] = React.useState<string | null>(null);

  const [revenueData, setRevenueData] = React.useState<RevenueData | null>(null);
  const [revenueLoading, setRevenueLoading] = React.useState(false);
  const [revenueError, setRevenueError] = React.useState<string | null>(null);
  const [revenueSettingsOpen, setRevenueSettingsOpen] = React.useState(false);
  const [challengePrice, setChallengePrice] = React.useState(197);
  const [coachingPrice, setCoachingPrice] = React.useState(6000);

  const workspaceId = workspace?.id ?? "";

  // Close account filter dropdown on outside click
  React.useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (accountFilterRef.current && !accountFilterRef.current.contains(e.target as Node)) {
        setAccountFilterOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Stale data check
  React.useEffect(() => {
    if (lastSynced) {
      const diff = Date.now() - lastSynced.getTime();
      setShowStaleWarning(diff > 24 * 60 * 60 * 1000);
    }
  }, [lastSynced]);

  // ── Data fetchers ──────────────────────────────────────────────────────────

  const fetchOverview = useCallback(async () => {
    if (!workspaceId) return;
    setOverviewLoading(true);
    setOverviewError(null);
    try {
      const params = new URLSearchParams({ workspaceId, timeRange });
      if (platform !== "all") params.set("platform", platform);
      const res = await fetch(`/api/analytics/overview?${params}`);
      if (!res.ok) throw new Error("Failed to load overview");
      const json = await res.json();
      setOverviewData(json);
      setHasActivity(true);
      setActivityChecked(true);
    } catch (err) {
      setOverviewError(err instanceof Error ? err.message : "Unknown error");
      setActivityChecked(true);
    } finally {
      setOverviewLoading(false);
    }
  }, [workspaceId, timeRange, platform]);

  const fetchAccounts = useCallback(async () => {
    if (!workspaceId) return;
    setAccountsLoading(true);
    setAccountsError(null);
    try {
      const res = await fetch(`/api/analytics/accounts?workspaceId=${workspaceId}&timeRange=${timeRange}`);
      if (!res.ok) throw new Error("Failed to load accounts");
      const json = await res.json();
      setAccountsData(json.accounts ?? []);
      setAccountsList(json.accounts ?? []);
    } catch (err) {
      setAccountsError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setAccountsLoading(false);
    }
  }, [workspaceId, timeRange]);

  const fetchAccountDetail = useCallback(async (id: string) => {
    setAccountDetailLoading(true);
    setAccountDetail(null);
    try {
      const res = await fetch(`/api/analytics/accounts/${id}`);
      if (!res.ok) throw new Error("Failed to load account detail");
      const json = await res.json();
      setAccountDetail(json);
    } catch {
      // silently fail, detail will be null
    } finally {
      setAccountDetailLoading(false);
    }
  }, []);

  const fetchClips = useCallback(async () => {
    if (!workspaceId) return;
    setClipsLoading(true);
    setClipsError(null);
    try {
      const res = await fetch(
        `/api/analytics/clips?workspaceId=${workspaceId}&timeRange=${timeRange}&sortBy=${clipSortBy}`
      );
      if (!res.ok) throw new Error("Failed to load clips");
      const json = await res.json();
      setClipsData(json.clips ?? []);
    } catch (err) {
      setClipsError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setClipsLoading(false);
    }
  }, [workspaceId, timeRange, clipSortBy]);

  const fetchLeads = useCallback(async () => {
    if (!workspaceId) return;
    setLeadsLoading(true);
    setLeadsError(null);
    try {
      const res = await fetch(`/api/analytics/leads?workspaceId=${workspaceId}&timeRange=${timeRange}`);
      if (!res.ok) throw new Error("Failed to load leads");
      const json = await res.json();
      setLeadsData(json);
    } catch (err) {
      setLeadsError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLeadsLoading(false);
    }
  }, [workspaceId, timeRange]);

  const fetchRevenue = useCallback(async () => {
    if (!workspaceId) return;
    setRevenueLoading(true);
    setRevenueError(null);
    try {
      const res = await fetch(`/api/analytics/revenue?workspaceId=${workspaceId}&timeRange=${timeRange}`);
      if (!res.ok) throw new Error("Failed to load revenue");
      const json = await res.json();
      setRevenueData(json);
      if (json.challengePrice) setChallengePrice(json.challengePrice);
      if (json.coachingPrice) setCoachingPrice(json.coachingPrice);
    } catch (err) {
      setRevenueError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setRevenueLoading(false);
    }
  }, [workspaceId, timeRange]);

  // ── Fetch on mount / tab change ────────────────────────────────────────────

  React.useEffect(() => {
    if (!workspaceId) return;
    fetchAccounts(); // always load accounts for filter
  }, [workspaceId, fetchAccounts]);

  React.useEffect(() => {
    if (!workspaceId) return;
    if (activeTab === "overview") fetchOverview();
    if (activeTab === "accounts") fetchAccounts();
    if (activeTab === "clips") fetchClips();
    if (activeTab === "leads") fetchLeads();
    if (activeTab === "revenue") fetchRevenue();
  }, [activeTab, workspaceId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Refetch on filter change
  React.useEffect(() => {
    if (!workspaceId || !activityChecked) return;
    if (activeTab === "overview") fetchOverview();
    if (activeTab === "accounts") fetchAccounts();
    if (activeTab === "clips") fetchClips();
    if (activeTab === "leads") fetchLeads();
    if (activeTab === "revenue") fetchRevenue();
  }, [timeRange, platform]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch account detail when expanded
  React.useEffect(() => {
    if (expandedAccountId) {
      fetchAccountDetail(expandedAccountId);
    }
  }, [expandedAccountId, fetchAccountDetail]);

  // ── Sync handler ──────────────────────────────────────────────────────────

  const handleSync = async () => {
    if (!workspaceId || syncing) return;
    setSyncing(true);
    try {
      await fetch(`/api/analytics/sync?workspaceId=${workspaceId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId }),
      });
      setLastSynced(new Date());
      setShowStaleWarning(false);
      // Refetch current tab
      if (activeTab === "overview") fetchOverview();
      else if (activeTab === "accounts") fetchAccounts();
      else if (activeTab === "clips") fetchClips();
      else if (activeTab === "leads") fetchLeads();
      else if (activeTab === "revenue") fetchRevenue();
    } finally {
      setSyncing(false);
    }
  };

  const isStale =
    lastSynced !== null && Date.now() - lastSynced.getTime() > 24 * 60 * 60 * 1000;

  const accountFilterLabel =
    selectedAccountIds.length === 0
      ? "All Accounts"
      : selectedAccountIds.length === 1
      ? "@" + (accountsList.find((a) => a.id === selectedAccountIds[0])?.username ?? "1 account")
      : `${selectedAccountIds.length} accounts`;

  // Loading state
  if (workspaceLoading) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-page)" }}>
        <Topbar title="Analytics" />
        <div style={{ padding: "32px 40px" }}>
          <SkeletonBlock height={48} />
          <div style={{ marginTop: 24 }}>
            <SkeletonBlock height={300} />
          </div>
        </div>
      </div>
    );
  }

  // No workspace
  if (!workspace) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-page)" }}>
        <Topbar title="Analytics" />
        <div style={{ padding: "80px 40px", textAlign: "center", color: "var(--text-secondary)", fontSize: 15 }}>
          No workspace found.
        </div>
      </div>
    );
  }

  // Activity check + empty state
  if (activityChecked && !hasActivity) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-page)" }}>
        <Topbar title="Analytics" />
        <div style={{ padding: "24px 40px" }}>
          <AnalyticsEmptyState />
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-page)" }}>
      <Topbar title="Analytics" />

      <div style={{ padding: "24px 40px" }}>
        {/* ── Stale Warning Banner ── */}
        {showStaleWarning && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 16px",
              background: "rgba(245,158,11,0.08)",
              border: "1px solid rgba(245,158,11,0.3)",
              borderRadius: 10,
              marginBottom: 16,
            }}
          >
            <AlertCircle size={15} style={{ color: "#F59E0B", flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: "#92400E", flex: 1 }}>
              Analytics data may be outdated. Last synced{" "}
              {lastSynced ? fmtAgo(lastSynced) : "a long time ago"}.{" "}
              <button
                onClick={handleSync}
                style={{ background: "none", border: "none", color: "#D97706", fontWeight: 600, cursor: "pointer", fontSize: 13, padding: 0 }}
              >
                Sync Now
              </button>
            </span>
            <button
              onClick={() => setShowStaleWarning(false)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#D97706", padding: "2px", display: "flex" }}
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* ── Global Controls Bar ── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap" as const,
            marginBottom: 24,
            background: "var(--bg-surface)",
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-md)",
            padding: "10px 14px",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          {/* Tab Pills */}
          <div style={{ display: "flex", gap: 2 }}>
            {(["overview", "accounts", "clips", "leads", "revenue"] as Tab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: "6px 14px",
                  borderRadius: 8,
                  border: "none",
                  background: activeTab === tab ? "var(--accent-blue)" : "transparent",
                  color: activeTab === tab ? "#fff" : "var(--text-secondary)",
                  fontSize: 13,
                  fontWeight: activeTab === tab ? 600 : 400,
                  cursor: "pointer",
                  textTransform: "capitalize" as const,
                  transition: "all 0.15s",
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          <div style={{ width: 1, height: 24, background: "var(--border-default)", margin: "0 4px" }} />

          {/* Platform Filter */}
          <div style={{ display: "flex", gap: 2 }}>
            {(["all", "tiktok", "instagram"] as Platform[]).map((p) => (
              <button
                key={p}
                onClick={() => setPlatform(p)}
                style={{
                  padding: "5px 11px",
                  borderRadius: 7,
                  border: "1px solid",
                  borderColor: platform === p ? "var(--accent-blue)" : "transparent",
                  background: platform === p ? "var(--accent-blue-light)" : "transparent",
                  color: platform === p ? "var(--accent-blue)" : "var(--text-secondary)",
                  fontSize: 12,
                  fontWeight: platform === p ? 600 : 400,
                  cursor: "pointer",
                  textTransform: "capitalize" as const,
                }}
              >
                {p === "all" ? "All" : p === "tiktok" ? "TikTok" : "Instagram"}
              </button>
            ))}
          </div>

          {/* Time Range */}
          <div style={{ display: "flex", gap: 2 }}>
            {(["7d", "14d", "30d", "90d"] as TimeRange[]).map((t) => (
              <button
                key={t}
                onClick={() => setTimeRange(t)}
                style={{
                  padding: "5px 10px",
                  borderRadius: 7,
                  border: "1px solid",
                  borderColor: timeRange === t ? "var(--accent-blue)" : "transparent",
                  background: timeRange === t ? "var(--accent-blue-light)" : "transparent",
                  color: timeRange === t ? "var(--accent-blue)" : "var(--text-secondary)",
                  fontSize: 12,
                  fontWeight: timeRange === t ? 600 : 400,
                  cursor: "pointer",
                  textTransform: "uppercase" as const,
                }}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Account Filter */}
          <div ref={accountFilterRef} style={{ position: "relative" }}>
            <button
              onClick={() => setAccountFilterOpen(!accountFilterOpen)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "5px 11px",
                borderRadius: 7,
                border: "1px solid var(--border-default)",
                background: selectedAccountIds.length > 0 ? "var(--accent-blue-light)" : "var(--bg-subtle)",
                color: selectedAccountIds.length > 0 ? "var(--accent-blue)" : "var(--text-secondary)",
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              <Filter size={11} />
              {accountFilterLabel}
              <ChevronDown size={11} />
            </button>
            {accountFilterOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 6px)",
                  left: 0,
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-default)",
                  borderRadius: 10,
                  boxShadow: "var(--shadow-md)",
                  minWidth: 200,
                  zIndex: 100,
                  padding: "8px 0",
                }}
              >
                <button
                  onClick={() => setSelectedAccountIds([])}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    width: "100%",
                    padding: "8px 14px",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: 13,
                    color: selectedAccountIds.length === 0 ? "var(--accent-blue)" : "var(--text-primary)",
                    fontWeight: selectedAccountIds.length === 0 ? 600 : 400,
                  }}
                >
                  {selectedAccountIds.length === 0 && <Check size={12} />}
                  {selectedAccountIds.length !== 0 && <div style={{ width: 12 }} />}
                  All Accounts
                </button>
                {accountsList.map((account) => {
                  const checked = selectedAccountIds.includes(account.id);
                  return (
                    <button
                      key={account.id}
                      onClick={() => {
                        setSelectedAccountIds((prev) =>
                          checked ? prev.filter((id) => id !== account.id) : [...prev, account.id]
                        );
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        width: "100%",
                        padding: "8px 14px",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        fontSize: 13,
                        color: checked ? "var(--accent-blue)" : "var(--text-primary)",
                        fontWeight: checked ? 600 : 400,
                      }}
                    >
                      {checked ? <Check size={12} /> : <div style={{ width: 12 }} />}
                      <div
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: "50%",
                          background: account.platform.toLowerCase() === "tiktok" ? "rgba(59,130,246,0.15)" : "rgba(168,85,247,0.15)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 9,
                          fontWeight: 700,
                          color: account.platform.toLowerCase() === "tiktok" ? "#3B82F6" : "#A855F7",
                          flexShrink: 0,
                        }}
                      >
                        {(account.username || "?").slice(0, 1).toUpperCase()}
                      </div>
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        @{account.username}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Compare Toggle */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Compare</span>
            <button
              onClick={() => setCompareOn(!compareOn)}
              style={{
                width: 36,
                height: 20,
                borderRadius: 99,
                background: compareOn ? "var(--accent-blue)" : "var(--bg-subtle)",
                border: "1px solid",
                borderColor: compareOn ? "var(--accent-blue)" : "var(--border-default)",
                cursor: "pointer",
                position: "relative",
                transition: "background 0.2s",
                flexShrink: 0,
                padding: 0,
              }}
              aria-label="Toggle compare"
            >
              <div
                style={{
                  position: "absolute",
                  top: 2,
                  left: compareOn ? 17 : 2,
                  width: 14,
                  height: 14,
                  borderRadius: "50%",
                  background: "#fff",
                  transition: "left 0.2s",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                }}
              />
            </button>
          </div>

          {/* Sync + Last synced */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" }}>
            {lastSynced && (
              <span
                style={{
                  fontSize: 11,
                  color: isStale ? "#F59E0B" : "var(--text-tertiary)",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                {isStale && <AlertCircle size={11} style={{ color: "#F59E0B" }} />}
                {isStale ? "Stale data" : `Synced ${fmtAgo(lastSynced)}`}
              </span>
            )}
            <button
              onClick={handleSync}
              disabled={syncing}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 14px",
                borderRadius: 8,
                border: "1px solid var(--border-default)",
                background: "var(--bg-subtle)",
                color: "var(--text-primary)",
                fontSize: 12,
                fontWeight: 600,
                cursor: syncing ? "not-allowed" : "pointer",
                opacity: syncing ? 0.7 : 1,
              }}
            >
              {syncing ? (
                <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />
              ) : (
                <RefreshCw size={13} />
              )}
              Sync Now
            </button>
          </div>
        </div>

        {/* ── Tab Content ── */}
        {activeTab === "overview" && (
          <OverviewTab
            data={overviewData}
            loading={overviewLoading}
            error={overviewError}
            onRetry={fetchOverview}
            compareOn={compareOn}
          />
        )}
        {activeTab === "accounts" && (
          <AccountsTab
            data={accountsData}
            loading={accountsLoading}
            error={accountsError}
            onRetry={fetchAccounts}
            expandedAccountId={expandedAccountId}
            setExpandedAccountId={setExpandedAccountId}
            accountDetail={accountDetail}
            accountDetailLoading={accountDetailLoading}
            sortBy={accountSortBy}
            setSortBy={setAccountSortBy}
          />
        )}
        {activeTab === "clips" && (
          <ClipsTab
            data={clipsData}
            loading={clipsLoading}
            error={clipsError}
            onRetry={fetchClips}
            expandedClipId={expandedClipId}
            setExpandedClipId={setExpandedClipId}
            sortBy={clipSortBy}
            setSortBy={setClipSortBy}
          />
        )}
        {activeTab === "leads" && (
          <LeadsTab
            data={leadsData}
            loading={leadsLoading}
            error={leadsError}
            onRetry={fetchLeads}
          />
        )}
        {activeTab === "revenue" && (
          <RevenueTab
            data={revenueData}
            loading={revenueLoading}
            error={revenueError}
            onRetry={fetchRevenue}
            workspaceId={workspaceId}
            settingsOpen={revenueSettingsOpen}
            setSettingsOpen={setRevenueSettingsOpen}
            challengePrice={challengePrice}
            setChallengePrice={setChallengePrice}
            coachingPrice={coachingPrice}
            setCoachingPrice={setCoachingPrice}
          />
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
