"use client";

import React, { useState, useEffect, useCallback } from "react";
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

function fmtAgo(date: Date | null): string {
  if (!date) return "";
  const secs = Math.floor((Date.now() - date.getTime()) / 1000);
  if (secs < 60) return "just now";
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

// ─── Types ──────────────────────────────────────────────────────────────────

interface OverviewData {
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  totalSaves: number;
  engagementRate: number;
  totalClipsPosted: number;
  previousPeriod?: {
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
  postingHeatmap?: Array<{ day: number; hour: number; count: number; avgEngagement: number }>;
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


// ─── Shared chart styling ────────────────────────────────────────────────────

const CHART_GRID = <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />;

const TOOLTIP_STYLE = {
  contentStyle: {
    background: "#FFFFFF",
    border: "1px solid #E4E4E7",
    borderRadius: 8,
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
    fontSize: 13,
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
  leads: "#F59E0B",
};

const PIE_COLORS = ["#3B82F6", "#A855F7", "#F59E0B", "#10B981"];

// ─── Small sub-components ────────────────────────────────────────────────────

function SkeletonBlock({ height = 20, width = "100%" }: { height?: number; width?: string | number }) {
  return (
    <div
      className="skeleton"
      style={{ height, width, borderRadius: 6 }}
    />
  );
}

// ─── Onboarding empty state ───────────────────────────────────────────────────

function AnalyticsEmptyState() {
  const steps = [
    { n: 1, label: "Connect Accounts", href: "/dashboard/social-accounts", active: false },
    { n: 2, label: "Create Clips", href: "/dashboard/clips", active: false },
    { n: 3, label: "Post to Accounts", href: "/dashboard/publish", active: false },
    { n: 4, label: "Track Results Here", href: "#", active: true },
  ];
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
      <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: 16, padding: "52px 48px", maxWidth: 560, width: "100%", textAlign: "center", boxShadow: "var(--shadow-md)" }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--accent-blue-light)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
          <BarChart2 size={32} style={{ color: "var(--accent-blue)" }} />
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 10px" }}>
          Your analytics dashboard
        </h2>
        <p style={{ fontSize: 15, color: "var(--text-secondary)", margin: "0 auto 32px", maxWidth: 380, lineHeight: 1.6 }}>
          Connect your social accounts and post your first clips to start tracking performance across all platforms.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 32, textAlign: "left", maxWidth: 300, marginLeft: "auto", marginRight: "auto" }}>
          {steps.map(step => (
            <a
              key={step.n}
              href={step.href}
              style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 10, background: step.active ? "var(--accent-blue-light)" : "var(--bg-subtle)", border: `1px solid ${step.active ? "var(--accent-blue-border)" : "var(--border-subtle)"}`, textDecoration: "none" }}
            >
              <span style={{ width: 24, height: 24, borderRadius: "50%", background: step.active ? "var(--accent-blue)" : "var(--border-default)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: step.active ? "#fff" : "var(--text-secondary)", flexShrink: 0 }}>
                {step.n}
              </span>
              <span style={{ fontSize: 14, fontWeight: step.active ? 600 : 400, color: step.active ? "var(--accent-blue)" : "var(--text-secondary)" }}>
                {step.label}
                {step.active && <span style={{ marginLeft: 6, fontSize: 11, opacity: 0.7 }}>(you are here)</span>}
              </span>
              {!step.active && <ExternalLink size={13} style={{ color: "var(--text-tertiary)", marginLeft: "auto" }} />}
            </a>
          ))}
        </div>
        <a
          href="/dashboard/social-accounts"
          style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "13px 28px", borderRadius: 10, background: "var(--accent-blue)", color: "#fff", fontWeight: 600, fontSize: 15, textDecoration: "none" }}
        >
          Connect Your First Account <ArrowRight size={16} />
        </a>
      </div>
    </div>
  );
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
        textTransform: "uppercase",
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
  const style = map[s] ?? { bg: "rgba(161,161,170,0.1)", color: "#71717A" };
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        fontSize: 11,
        fontWeight: 600,
        color: style.color,
        background: style.bg,
        borderRadius: 99,
        padding: "2px 8px",
        textTransform: "capitalize",
      }}
    >
      {status}
    </span>
  );
}

function MiniSparkline({ data, color = "#3B82F6" }: { data: number[]; color?: string }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data, 1);
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * 60;
      const y = 20 - (v / max) * 18;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg width={60} height={20} style={{ display: "block" }}>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ViralityBadge({ score }: { score: number }) {
  const color =
    score >= 8 ? "#10B981" : score >= 5 ? "#F59E0B" : "#F43F5E";
  const bg =
    score >= 8 ? "rgba(16,185,129,0.08)" : score >= 5 ? "rgba(245,158,11,0.08)" : "rgba(244,63,94,0.08)";
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
      <span style={{ fontSize: 13, color: "#71717A", flex: 1 }}>{message}</span>
      <button
        onClick={onRetry}
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: "#3B82F6",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          textDecoration: "underline",
        }}
      >
        Retry
      </button>
    </div>
  );
}


// ─── TAB 1: Overview ─────────────────────────────────────────────────────────

function RevenueFunnel({ data }: { data: OverviewData | null }) {
  if (!data) {
    return <SkeletonBlock height={140} />;
  }

  const clipsPosted = data.totalClipsPosted;
  const totalViews = data.totalViews;
  const totalEngagements = data.totalLikes + data.totalComments + data.totalShares + data.totalSaves;
  const pageVisits = Math.round(totalViews * 0.004);
  const leadsEstimate = pageVisits > 0 ? Math.round(pageVisits * 0.05) : 0;
  const conversions = Math.round(leadsEstimate * 0.05);

  const steps = [
    { label: "Content", sublabel: "Clips Posted", value: clipsPosted, color: "#3B82F6" },
    { label: "Reach", sublabel: "Total Views", value: totalViews, color: "#6366F1" },
    { label: "Engagement", sublabel: "Interactions", value: totalEngagements, color: "#8B5CF6" },
    { label: "Traffic", sublabel: "Page Visits", value: pageVisits, color: "#A855F7" },
    { label: "Leads", sublabel: "Leads Est.", value: leadsEstimate, color: "#EC4899" },
    { label: "Converts", sublabel: "Conversions", value: conversions, color: "#10B981" },
  ];

  const maxVal = Math.max(clipsPosted, 1);

  return (
    <div style={{ ...CARD_STYLE, padding: 24, marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
        <Activity size={16} style={{ color: "#3B82F6" }} />
        <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>Revenue Pipeline Funnel</span>
      </div>
      <div style={{ display: "flex", alignItems: "stretch", gap: 0, overflowX: "auto" }}>
        {steps.map((step, i) => {
          const nextStep = steps[i + 1];
          const convRate =
            i < steps.length - 1 && step.value > 0
              ? ((nextStep.value / step.value) * 100).toFixed(1)
              : null;

          const barHeight = Math.max(40, Math.min(100, (step.value / Math.max(steps[0].value, 1)) * 100));

          return (
            <React.Fragment key={step.label}>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  flex: 1,
                  minWidth: 90,
                }}
              >
                <div
                  style={{
                    width: "100%",
                    height: barHeight,
                    background: `linear-gradient(135deg, ${step.color}22, ${step.color}44)`,
                    border: `1px solid ${step.color}44`,
                    borderRadius: 8,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "8px 4px",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: "30%",
                      background: `${step.color}22`,
                    }}
                  />
                  <span style={{ fontSize: 16, fontWeight: 800, color: step.color, lineHeight: 1 }}>
                    {fmt(step.value)}
                  </span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: step.color, opacity: 0.8, marginTop: 2 }}>
                    {step.label}
                  </span>
                </div>
                <span style={{ fontSize: 10, color: "var(--text-tertiary)", marginTop: 6, textAlign: "center" }}>
                  {step.sublabel}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "0 6px",
                    flexShrink: 0,
                  }}
                >
                  <ChevronRight size={14} style={{ color: "var(--text-tertiary)" }} />
                  {convRate !== null && (
                    <span style={{ fontSize: 9, fontWeight: 600, color: "var(--text-tertiary)", marginTop: 2, whiteSpace: "nowrap" }}>
                      {convRate}%
                    </span>
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

function OverviewStatCards({
  data,
  loading,
  compareOn = false,
}: {
  data: OverviewData | null;
  loading: boolean;
  compareOn?: boolean;
}) {
  if (loading || !data) {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} style={{ ...CARD_STYLE, padding: 20 }}>
            <SkeletonBlock height={12} width="60%" />
            <SkeletonBlock height={28} width="80%" />
            <SkeletonBlock height={10} width="40%" />
          </div>
        ))}
      </div>
    );
  }

  const prev = data.previousPeriod;

  const stats = [
    {
      label: "Total Views",
      value: fmt(data.totalViews),
      prevValue: prev ? fmt(prev.totalViews) : null,
      trend: data.trends.views,
      icon: Eye,
      color: "#3B82F6",
      orb: "rgba(59,130,246,0.08)",
      sparkData: data.viewsOverTime.map((d) => d.tiktokViews + d.instagramViews),
    },
    {
      label: "Engagement Rate",
      value: fmtPct(data.engagementRate),
      prevValue: prev ? fmtPct(prev.engagementRate) : null,
      trend: data.trends.engagementRate,
      icon: Heart,
      color: "#F43F5E",
      orb: "rgba(244,63,94,0.08)",
      sparkData: data.viewsOverTime.map(() => data.engagementRate),
    },
    {
      label: "Clips Posted",
      value: data.totalClipsPosted.toString(),
      prevValue: prev ? prev.totalClipsPosted.toString() : null,
      trend: data.trends.clipsPosted,
      icon: Activity,
      color: "#A855F7",
      orb: "rgba(168,85,247,0.08)",
      sparkData: [] as number[],
    },
    {
      label: "Total Likes",
      value: fmt(data.totalLikes),
      prevValue: prev ? fmt(prev.totalLikes) : null,
      trend: data.trends.likes,
      icon: Heart,
      color: "#F43F5E",
      orb: "rgba(244,63,94,0.08)",
      sparkData: data.viewsOverTime.map((d) => Math.round((d.tiktokViews + d.instagramViews) * 0.05)),
    },
    {
      label: "Total Comments",
      value: fmt(data.totalComments),
      prevValue: prev ? fmt(prev.totalComments) : null,
      trend: data.trends.comments,
      icon: MessageCircle,
      color: "#22C55E",
      orb: "rgba(34,197,94,0.08)",
      sparkData: data.viewsOverTime.map((d) => Math.round((d.tiktokViews + d.instagramViews) * 0.012)),
    },
    {
      label: "Total Shares",
      value: fmt(data.totalShares),
      prevValue: prev ? fmt(prev.totalShares) : null,
      trend: data.trends.shares,
      icon: Share2,
      color: "#F59E0B",
      orb: "rgba(245,158,11,0.08)",
      sparkData: data.viewsOverTime.map((d) => Math.round((d.tiktokViews + d.instagramViews) * 0.008)),
    },
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 16,
        marginBottom: 24,
      }}
    >
      {stats.map((s) => {
        const Icon = s.icon;
        return (
          <div
            key={s.label}
            className="stat-card"
            style={{
              ...CARD_STYLE,
              padding: 20,
              "--card-orb-color": s.orb,
            } as React.CSSProperties}
          >
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: s.orb,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon size={16} style={{ color: s.color }} />
              </div>
              <MiniSparkline data={s.sparkData} color={s.color} />
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: 4 }}>
              {s.value}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 500 }}>{s.label}</span>
              {s.trend !== 0 && <TrendBadge value={s.trend} />}
            </div>
            {compareOn && s.prevValue && (
              <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 6 }}>
                vs {s.prevValue} prev period
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}


function ViewsOverTimeChart({ data }: { data: OverviewData | null }) {
  if (!data || data.viewsOverTime.length === 0) {
    return (
      <div style={{ ...CARD_STYLE, padding: 24, marginBottom: 24 }}>
        <SkeletonBlock height={200} />
      </div>
    );
  }

  const chartData = data.viewsOverTime.map((d) => ({
    ...d,
    date: fmtDate(d.date),
  }));

  return (
    <div style={{ ...CARD_STYLE, padding: 24, marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
        <TrendingUp size={16} style={{ color: "#3B82F6" }} />
        <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>Views Over Time</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 16 }}>
          <span style={{ fontSize: 11, color: "#3B82F6", display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#3B82F6", display: "inline-block" }} />
            TikTok
          </span>
          <span style={{ fontSize: 11, color: "#A855F7", display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#A855F7", display: "inline-block" }} />
            Instagram
          </span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <defs>
            <linearGradient id="tiktokGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="instagramGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#A855F7" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#A855F7" stopOpacity={0} />
            </linearGradient>
          </defs>
          {CHART_GRID}
          <XAxis dataKey="date" stroke="#A1A1AA" tick={{ fontSize: 11, fill: "#71717A" }} />
          <YAxis stroke="#A1A1AA" tick={{ fontSize: 11, fill: "#71717A" }} tickFormatter={(v) => fmt(v)} />
          <Tooltip {...TOOLTIP_STYLE} formatter={(v) => fmt(Number(v ?? 0))} />
          <Area
            type="monotone"
            dataKey="tiktokViews"
            name="TikTok"
            stroke="#3B82F6"
            fill="url(#tiktokGrad)"
            strokeWidth={2}
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="instagramViews"
            name="Instagram"
            stroke="#A855F7"
            fill="url(#instagramGrad)"
            strokeWidth={2}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function EngagementBreakdownChart({ data }: { data: OverviewData | null }) {
  if (!data) {
    return (
      <div style={{ ...CARD_STYLE, padding: 24, marginBottom: 24 }}>
        <SkeletonBlock height={200} />
      </div>
    );
  }

  const eb = data.engagementBreakdown;
  const total = eb.likes + eb.comments + eb.shares + eb.saves;
  const chartData = [
    { name: "Likes", value: eb.likes, color: COLORS.likes },
    { name: "Comments", value: eb.comments, color: COLORS.comments },
    { name: "Shares", value: eb.shares, color: COLORS.shares },
    { name: "Saves", value: eb.saves, color: COLORS.saves },
  ];

  return (
    <div style={{ ...CARD_STYLE, padding: 24, marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
        <BarChart2 size={16} style={{ color: "#3B82F6" }} />
        <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>Engagement Breakdown</span>
        <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--text-secondary)" }}>
          {fmt(total)} total
        </span>
      </div>
      <div style={{ display: "flex", gap: 24 }}>
        <ResponsiveContainer width="60%" height={180}>
          <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            {CHART_GRID}
            <XAxis dataKey="name" stroke="#A1A1AA" tick={{ fontSize: 11, fill: "#71717A" }} />
            <YAxis stroke="#A1A1AA" tick={{ fontSize: 11, fill: "#71717A" }} tickFormatter={(v) => fmt(v)} />
            <Tooltip {...TOOLTIP_STYLE} formatter={(v) => fmt(Number(v ?? 0))} />
            <Bar dataKey="value" name="Count" radius={[4, 4, 0, 0]} isAnimationActive={false}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12, justifyContent: "center" }}>
          {chartData.map((item) => (
            <div key={item.name} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: item.color, flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: "var(--text-secondary)", flex: 1 }}>{item.name}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>{fmt(item.value)}</span>
              <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                {total > 0 ? ((item.value / total) * 100).toFixed(1) + "%" : "0%"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Posting Time Heatmap ────────────────────────────────────────────────────

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOUR_LABELS = ["12a", "3a", "6a", "9a", "12p", "3p", "6p", "9p"];

function PostingHeatmap({ data }: { data: OverviewData | null }) {
  const heatmap = data?.postingHeatmap ?? [];
  // Build 7×24 grid
  const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
  let maxEng = 0;
  for (const cell of heatmap) {
    if (cell.day >= 0 && cell.day < 7 && cell.hour >= 0 && cell.hour < 24) {
      grid[cell.day][cell.hour] = cell.avgEngagement;
      if (cell.avgEngagement > maxEng) maxEng = cell.avgEngagement;
    }
  }

  return (
    <div style={{ ...CARD_STYLE, padding: 24, marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
        <Clock size={16} style={{ color: "#F59E0B" }} />
        <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>Best Posting Times</span>
        <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--text-tertiary)" }}>
          Avg engagement rate by day & hour
        </span>
      </div>
      {heatmap.length === 0 ? (
        <div style={{ textAlign: "center", padding: "32px 0", color: "var(--text-tertiary)", fontSize: 13 }}>
          No posting history yet. Publish clips to see the best times.
        </div>
      ) : (
        <div>
          {/* Hour labels */}
          <div style={{ display: "flex", marginLeft: 36, marginBottom: 4, gap: 0 }}>
            {Array.from({ length: 24 }).map((_, h) => (
              <div
                key={h}
                style={{
                  flex: 1,
                  fontSize: 9,
                  color: "var(--text-tertiary)",
                  textAlign: "center",
                  opacity: h % 3 === 0 ? 1 : 0,
                }}
              >
                {HOUR_LABELS[Math.floor(h / 3)]}
              </div>
            ))}
          </div>
          {/* Rows */}
          {DAY_LABELS.map((day, dayIdx) => (
            <div key={dayIdx} style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 3 }}>
              <div style={{ width: 32, fontSize: 10, color: "var(--text-tertiary)", textAlign: "right", paddingRight: 6 }}>
                {day}
              </div>
              {Array.from({ length: 24 }).map((_, hourIdx) => {
                const val = grid[dayIdx][hourIdx];
                const intensity = maxEng > 0 ? val / maxEng : 0;
                const bg = intensity > 0
                  ? `rgba(59,130,246,${Math.max(0.08, intensity)})`
                  : "var(--bg-subtle)";
                return (
                  <div
                    key={hourIdx}
                    title={val > 0 ? `${day} ${hourIdx}:00 — ${val.toFixed(1)}% avg engagement` : undefined}
                    style={{
                      flex: 1,
                      height: 16,
                      background: bg,
                      borderRadius: 3,
                      margin: "0 1px",
                      cursor: val > 0 ? "pointer" : "default",
                      border: intensity > 0.8 ? "1px solid rgba(59,130,246,0.4)" : "none",
                    }}
                  />
                );
              })}
            </div>
          ))}
          {/* Legend */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10, justifyContent: "flex-end" }}>
            <span style={{ fontSize: 10, color: "var(--text-tertiary)" }}>Low</span>
            {[0.1, 0.3, 0.5, 0.7, 1.0].map((v, i) => (
              <div
                key={i}
                style={{ width: 12, height: 12, borderRadius: 2, background: `rgba(59,130,246,${v})` }}
              />
            ))}
            <span style={{ fontSize: 10, color: "var(--text-tertiary)" }}>High</span>
          </div>
        </div>
      )}
    </div>
  );
}

function TopClipsTable({ clips }: { clips: OverviewData["topClips"] }) {
  if (!clips || clips.length === 0) {
    return (
      <div style={{ ...CARD_STYLE, padding: 24 }}>
        <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-tertiary)", fontSize: 13 }}>
          No clip data available yet. Publish some clips to see analytics.
        </div>
      </div>
    );
  }

  return (
    <div style={{ ...CARD_STYLE, padding: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
        <Star size={16} style={{ color: "#F59E0B" }} />
        <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>Top Clips</span>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["Title", "Virality", "Views", "Likes", "Comments", "Eng. Rate", "Platforms"].map((h) => (
                <th
                  key={h}
                  style={{
                    textAlign: "left",
                    fontSize: 11,
                    fontWeight: 600,
                    color: "var(--text-tertiary)",
                    padding: "0 12px 10px 0",
                    borderBottom: "1px solid var(--border-default)",
                    whiteSpace: "nowrap",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {clips.slice(0, 5).map((clip) => (
              <tr key={clip.clipId} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                <td style={{ padding: "12px 12px 12px 0", fontSize: 13, fontWeight: 500, color: "var(--text-primary)", maxWidth: 200 }}>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>
                    {clip.title}
                  </span>
                </td>
                <td style={{ padding: "12px 12px 12px 0" }}>
                  <ViralityBadge score={clip.viralityScore} />
                </td>
                <td style={{ padding: "12px 12px 12px 0", fontSize: 13, color: "var(--text-primary)", fontWeight: 600 }}>
                  {fmt(clip.totalViews)}
                </td>
                <td style={{ padding: "12px 12px 12px 0", fontSize: 13, color: "var(--text-secondary)" }}>
                  {fmt(clip.totalLikes)}
                </td>
                <td style={{ padding: "12px 12px 12px 0", fontSize: 13, color: "var(--text-secondary)" }}>
                  {fmt(clip.totalComments)}
                </td>
                <td style={{ padding: "12px 12px 12px 0", fontSize: 13, color: "var(--text-secondary)" }}>
                  {fmtPct(clip.engagementRate)}
                </td>
                <td style={{ padding: "12px 0 12px 0" }}>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {clip.platforms.map((p) => (
                      <PlatformBadge key={p} platform={p} />
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


// ─── TAB 2: Accounts ─────────────────────────────────────────────────────────

function AccountsTab({ workspaceId, timeRange }: { workspaceId: string; timeRange: string }) {
  const [accounts, setAccounts] = useState<AccountData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AccountDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [sortBy, setSortBy] = useState("totalViews");

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/analytics/accounts?workspaceId=${workspaceId}&timeRange=${timeRange}`);
      if (!res.ok) throw new Error("Failed to load accounts");
      const data = await res.json();
      setAccounts(data.accounts ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load accounts");
    } finally {
      setLoading(false);
    }
  }, [workspaceId, timeRange]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const loadDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/analytics/accounts/${id}`);
      if (!res.ok) throw new Error("Failed to load account detail");
      const data = await res.json();
      setDetail(data);
    } catch {
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const handleCardClick = (id: string) => {
    if (selectedId === id) {
      setSelectedId(null);
      setDetail(null);
    } else {
      setSelectedId(id);
      loadDetail(id);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        {[1, 2, 3].map((i) => (
          <div key={i} style={{ ...CARD_STYLE, padding: 20 }}>
            <SkeletonBlock height={48} width={48} />
            <SkeletonBlock height={14} width="70%" />
            <SkeletonBlock height={12} width="50%" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return <SectionError message={error} onRetry={loadAccounts} />;
  }

  if (accounts.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-tertiary)", fontSize: 14 }}>
        <Users size={32} style={{ margin: "0 auto 12px", opacity: 0.3 }} />
        <p>No social accounts connected yet.</p>
        <a href="/dashboard/social-accounts" style={{ color: "#3B82F6", fontSize: 13, marginTop: 8, display: "inline-block" }}>
          Connect an account →
        </a>
      </div>
    );
  }

  const sortedAccounts = [...accounts].sort((a, b) => {
    if (sortBy === "avgEngagement") return b.avgEngagement - a.avgEngagement;
    if (sortBy === "followerCount") return b.followerCount - a.followerCount;
    if (sortBy === "postsCount") return b.publishedPostsCount - a.publishedPostsCount;
    return (b.totalViews ?? 0) - (a.totalViews ?? 0);
  });

  return (
    <div>
      {/* Sort controls */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Sort by:</span>
        {[
          { value: "totalViews", label: "Total Views" },
          { value: "avgEngagement", label: "Avg Engagement" },
          { value: "followerCount", label: "Followers" },
          { value: "postsCount", label: "Posts" },
        ].map((opt) => (
          <button
            key={opt.value}
            onClick={() => setSortBy(opt.value)}
            style={{
              padding: "4px 12px",
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
              background: sortBy === opt.value ? "#3B82F6" : "var(--bg-subtle)",
              color: sortBy === opt.value ? "#fff" : "var(--text-secondary)",
            }}
          >
            {opt.label}
          </button>
        ))}
        <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--text-tertiary)" }}>
          {accounts.length} account{accounts.length !== 1 ? "s" : ""}
        </span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        {sortedAccounts.map((acc) => {
          const isTikTok = acc.platform.toLowerCase() === "tiktok";
          const isSelected = selectedId === acc.id;
          const initials = (acc.displayName || acc.username || "?").slice(0, 2).toUpperCase();

          return (
            <div key={acc.id}>
              <div
                onClick={() => handleCardClick(acc.id)}
                style={{
                  ...CARD_STYLE,
                  padding: 20,
                  cursor: "pointer",
                  borderLeft: `3px solid ${isTikTok ? "#3B82F6" : "#A855F7"}`,
                  transition: "box-shadow 150ms, transform 150ms",
                  ...(isSelected ? { boxShadow: "0 0 0 2px " + (isTikTok ? "#3B82F6" : "#A855F7") + "44" } : {}),
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.boxShadow = "var(--shadow-md)";
                  (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.boxShadow = isSelected ? "0 0 0 2px " + (isTikTok ? "#3B82F6" : "#A855F7") + "44" : "var(--shadow-sm)";
                  (e.currentTarget as HTMLDivElement).style.transform = "";
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 16 }}>
                  {acc.avatarUrl ? (
                    <img
                      src={acc.avatarUrl}
                      alt={acc.displayName}
                      style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: "50%",
                        background: isTikTok ? "rgba(59,130,246,0.12)" : "rgba(168,85,247,0.12)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 14,
                        fontWeight: 700,
                        color: isTikTok ? "#3B82F6" : "#A855F7",
                        flexShrink: 0,
                      }}
                    >
                      {initials}
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {acc.displayName || acc.username}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      @{acc.username}
                    </div>
                  </div>
                  <PlatformBadge platform={acc.platform} />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                  {[
                    { label: "Followers", value: fmt(acc.followerCount) },
                    { label: "Posts", value: fmt(acc.publishedPostsCount) },
                    { label: "Avg Views", value: fmt(acc.avgViews) },
                    { label: "Avg Eng.", value: fmtPct(acc.avgEngagement) },
                  ].map((s) => (
                    <div key={s.label}>
                      <div style={{ fontSize: 10, color: "var(--text-tertiary)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 2 }}>
                        {s.label}
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>{s.value}</div>
                    </div>
                  ))}
                </div>

                {acc.recentViews && acc.recentViews.length > 0 && (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 10, color: "var(--text-tertiary)" }}>Recent views</span>
                    <MiniSparkline data={acc.recentViews} color={isTikTok ? "#3B82F6" : "#A855F7"} />
                  </div>
                )}

                <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 6 }}>
                  {isSelected ? (
                    <ChevronUp size={12} style={{ color: "var(--text-tertiary)" }} />
                  ) : (
                    <ChevronDown size={12} style={{ color: "var(--text-tertiary)" }} />
                  )}
                  <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                    {isSelected ? "Collapse" : "View detail"}
                  </span>
                </div>
              </div>

              {isSelected && (
                <div style={{ ...CARD_STYLE, marginTop: 8, padding: 20, borderTop: "2px solid " + (isTikTok ? "#3B82F6" : "#A855F7") }}>
                  {detailLoading ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-tertiary)", fontSize: 13 }}>
                      <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
                      Loading detail...
                    </div>
                  ) : detail ? (
                    <AccountDetailView detail={detail} />
                  ) : (
                    <span style={{ fontSize: 13, color: "var(--text-tertiary)" }}>No detail available</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AccountDetailView({ detail }: { detail: AccountDetail }) {
  const { totals, posts } = detail;
  const postsWithMetrics = posts.filter((p) => p.metrics);
  const bestPost = postsWithMetrics.reduce<typeof posts[0] | null>((best, p) =>
    p.metrics && (!best || !best.metrics || p.metrics.views > best.metrics!.views) ? p : best, null);
  const worstPost = postsWithMetrics.reduce<typeof posts[0] | null>((worst, p) =>
    p.metrics && (!worst || !worst.metrics || p.metrics.views < worst.metrics!.views) ? p : worst, null);

  const stats = [
    { label: "Total Views", value: fmt(totals.views), icon: Eye, color: "#3B82F6" },
    { label: "Total Engagement", value: fmt(totals.likes + totals.comments + totals.shares + totals.saves), icon: Heart, color: "#F43F5E" },
    { label: "Posts Published", value: totals.posts.toString(), icon: BarChart2, color: "#F59E0B" },
    { label: "Followers", value: fmt(detail.account.followerCount), icon: Users, color: "#10B981" },
  ];

  // Engagement distribution for donut
  const engTotal = totals.likes + totals.comments + totals.shares + totals.saves;
  const engDist = [
    { name: "Likes", value: totals.likes, color: "#3B82F6" },
    { name: "Comments", value: totals.comments, color: "#22C55E" },
    { name: "Shares", value: totals.shares, color: "#F59E0B" },
    { name: "Saves", value: totals.saves, color: "#A855F7" },
  ].filter((d) => d.value > 0);

  // Views over time from posts (chronological)
  const viewsChartData = [...posts]
    .filter((p) => p.metrics && p.publishedAt)
    .sort((a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime())
    .map((p) => ({ date: fmtDate(p.publishedAt), views: p.metrics!.views }));

  return (
    <div>
      {/* 4 mini stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} style={{ background: "var(--bg-subtle)", borderRadius: 10, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: s.color + "1A", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon size={14} style={{ color: s.color }} />
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)", lineHeight: 1.1 }}>{s.value}</div>
                <div style={{ fontSize: 10, color: "var(--text-tertiary)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>{s.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts row: Views Over Time + Engagement Donut */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 16, marginBottom: 20 }}>
        {viewsChartData.length > 1 && (
          <div style={{ background: "var(--bg-subtle)", borderRadius: 10, padding: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>Views Per Post</div>
            <ResponsiveContainer width="100%" height={140}>
              <LineChart data={viewsChartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--text-tertiary)" }} />
                <YAxis tick={{ fontSize: 10, fill: "var(--text-tertiary)" }} tickFormatter={(v) => fmt(v)} />
                <Tooltip {...TOOLTIP_STYLE} formatter={(v) => fmt(Number(v))} />
                <Line type="monotone" dataKey="views" stroke="#3B82F6" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
        {engDist.length > 0 && (
          <div style={{ background: "var(--bg-subtle)", borderRadius: 10, padding: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>Engagement Mix</div>
            <ResponsiveContainer width="100%" height={100}>
              <PieChart>
                <Pie data={engDist} innerRadius={28} outerRadius={46} paddingAngle={2} dataKey="value" isAnimationActive={false}>
                  {engDist.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip {...TOOLTIP_STYLE} formatter={(v, n) => [fmt(Number(v)), n]} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 12px", marginTop: 8 }}>
              {engDist.map((e) => (
                <div key={e.name} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: e.color }} />
                  <span style={{ color: "var(--text-secondary)" }}>{e.name}</span>
                  <span style={{ color: "var(--text-tertiary)" }}>
                    {engTotal > 0 ? ((e.value / engTotal) * 100).toFixed(0) + "%" : "0%"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Best & Worst Posts */}
      {(bestPost || worstPost) && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
          {bestPost && bestPost.metrics && (
            <div style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 10, padding: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <Star size={13} style={{ color: "#22C55E" }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: "#22C55E", textTransform: "uppercase", letterSpacing: "0.05em" }}>Best Post</span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {bestPost.clip.title}
              </div>
              <div style={{ display: "flex", gap: 16, fontSize: 12, color: "var(--text-secondary)" }}>
                <span><strong style={{ color: "var(--text-primary)" }}>{fmt(bestPost.metrics.views)}</strong> views</span>
                <span><strong style={{ color: "var(--text-primary)" }}>{fmtPct(bestPost.metrics.engagementRate)}</strong> eng</span>
                <span style={{ marginLeft: "auto", color: "var(--text-tertiary)", fontSize: 11 }}>{fmtDate(bestPost.publishedAt)}</span>
              </div>
            </div>
          )}
          {worstPost && worstPost.metrics && worstPost.publishLogId !== bestPost?.publishLogId && (
            <div style={{ background: "rgba(244,63,94,0.05)", border: "1px solid rgba(244,63,94,0.15)", borderRadius: 10, padding: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <TrendingDown size={13} style={{ color: "#F43F5E" }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: "#F43F5E", textTransform: "uppercase", letterSpacing: "0.05em" }}>Needs Work</span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {worstPost.clip.title}
              </div>
              <div style={{ display: "flex", gap: 16, fontSize: 12, color: "var(--text-secondary)" }}>
                <span><strong style={{ color: "var(--text-primary)" }}>{fmt(worstPost.metrics.views)}</strong> views</span>
                <span><strong style={{ color: "var(--text-primary)" }}>{fmtPct(worstPost.metrics.engagementRate)}</strong> eng</span>
                <span style={{ marginLeft: "auto", color: "var(--text-tertiary)", fontSize: 11 }}>{fmtDate(worstPost.publishedAt)}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Full post table */}
      {posts.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-tertiary)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            All Posts ({posts.length})
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Title", "Posted", "Views", "Likes", "Comments", "Shares", "Eng. Rate"].map((h) => (
                  <th key={h} style={{ textAlign: "left", fontSize: 10, fontWeight: 600, color: "var(--text-tertiary)", padding: "0 10px 8px 0", borderBottom: "1px solid var(--border-default)", whiteSpace: "nowrap", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => {
                const isBest = post.publishLogId === bestPost?.publishLogId;
                return (
                  <tr
                    key={post.publishLogId}
                    style={{ borderBottom: "1px solid var(--border-subtle)", opacity: !post.metrics ? 0.5 : 1, background: isBest ? "rgba(34,197,94,0.03)" : "transparent" }}
                  >
                    <td style={{ padding: "10px 10px 10px 0", fontSize: 12, color: "var(--text-primary)", maxWidth: 200 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        {isBest && <Star size={11} style={{ color: "#22C55E", flexShrink: 0 }} />}
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>
                          {post.clip?.title ?? "—"}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: "10px 10px 10px 0", fontSize: 11, color: "var(--text-tertiary)", whiteSpace: "nowrap" }}>
                      {fmtDate(post.publishedAt)}
                    </td>
                    <td style={{ padding: "10px 10px 10px 0", fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>
                      {post.metrics ? fmt(post.metrics.views) : "—"}
                    </td>
                    <td style={{ padding: "10px 10px 10px 0", fontSize: 12, color: "var(--text-secondary)" }}>
                      {post.metrics ? fmt(post.metrics.likes) : "—"}
                    </td>
                    <td style={{ padding: "10px 10px 10px 0", fontSize: 12, color: "var(--text-secondary)" }}>
                      {post.metrics ? fmt(post.metrics.comments) : "—"}
                    </td>
                    <td style={{ padding: "10px 10px 10px 0", fontSize: 12, color: "var(--text-secondary)" }}>
                      {post.metrics ? fmt(post.metrics.shares) : "—"}
                    </td>
                    <td style={{ padding: "10px 0 10px 0", fontSize: 12, color: "var(--text-secondary)" }}>
                      {post.metrics ? fmtPct(post.metrics.engagementRate) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}


// ─── TAB 3: Clips ────────────────────────────────────────────────────────────

function ClipsTab({ workspaceId, timeRange }: { workspaceId: string; timeRange: string }) {
  const [clips, setClips] = useState<ClipData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"totalViews" | "avgEngRate" | "viralityScore">("totalViews");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadClips = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/analytics/clips?workspaceId=${workspaceId}&timeRange=${timeRange}&sortBy=${sortBy}`
      );
      if (!res.ok) throw new Error("Failed to load clips");
      const data = await res.json();
      setClips(data.clips ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load clips");
    } finally {
      setLoading(false);
    }
  }, [workspaceId, timeRange, sortBy]);

  useEffect(() => {
    loadClips();
  }, [loadClips]);

  if (loading) {
    return (
      <div style={{ ...CARD_STYLE, padding: 24 }}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} style={{ display: "flex", gap: 12, marginBottom: 16, paddingBottom: 16, borderBottom: "1px solid var(--border-subtle)" }}>
            <SkeletonBlock height={40} width={40} />
            <div style={{ flex: 1 }}>
              <SkeletonBlock height={14} width="60%" />
              <SkeletonBlock height={11} width="40%" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return <SectionError message={error} onRetry={loadClips} />;
  }

  if (clips.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-tertiary)", fontSize: 14 }}>
        <Activity size={32} style={{ margin: "0 auto 12px", opacity: 0.3 }} />
        <p>No clips published in this time range.</p>
      </div>
    );
  }

  const sortOptions = [
    { value: "totalViews", label: "Total Views" },
    { value: "avgEngRate", label: "Engagement Rate" },
    { value: "viralityScore", label: "Virality Score" },
  ];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16, gap: 8 }}>
        <span style={{ fontSize: 12, color: "var(--text-secondary)", alignSelf: "center" }}>Sort by:</span>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          style={{
            fontSize: 12,
            padding: "6px 10px",
            borderRadius: 8,
            border: "1px solid var(--border-default)",
            background: "var(--bg-surface)",
            color: "var(--text-primary)",
            cursor: "pointer",
          }}
        >
          {sortOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <div style={{ ...CARD_STYLE, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--bg-subtle)" }}>
              {["Clip", "Source", "Virality", "Views", "Eng. Rate", "Accounts", "Type", "Status"].map((h) => (
                <th
                  key={h}
                  style={{
                    textAlign: "left",
                    fontSize: 10,
                    fontWeight: 600,
                    color: "var(--text-tertiary)",
                    padding: "10px 12px",
                    borderBottom: "1px solid var(--border-default)",
                    whiteSpace: "nowrap",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {clips.map((clip) => (
              <React.Fragment key={clip.id}>
                <tr
                  onClick={() => setExpandedId(expandedId === clip.id ? null : clip.id)}
                  style={{
                    borderBottom: "1px solid var(--border-subtle)",
                    cursor: "pointer",
                    background: expandedId === clip.id ? "var(--bg-subtle)" : "transparent",
                    transition: "background 150ms",
                  }}
                  onMouseEnter={(e) => { if (expandedId !== clip.id) (e.currentTarget as HTMLTableRowElement).style.background = "var(--bg-hover)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = expandedId === clip.id ? "var(--bg-subtle)" : "transparent"; }}
                >
                  <td style={{ padding: "12px", fontSize: 13, fontWeight: 500, color: "var(--text-primary)", maxWidth: 220 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {expandedId === clip.id ? <ChevronUp size={12} style={{ color: "var(--text-tertiary)", flexShrink: 0 }} /> : <ChevronDown size={12} style={{ color: "var(--text-tertiary)", flexShrink: 0 }} />}
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{clip.title}</span>
                    </div>
                  </td>
                  <td style={{ padding: "12px", fontSize: 11, color: "var(--text-tertiary)", maxWidth: 140 }}>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>
                      {clip.sourceVideoTitle || "—"}
                    </span>
                  </td>
                  <td style={{ padding: "12px" }}>
                    <ViralityBadge score={clip.viralityScore} />
                  </td>
                  <td style={{ padding: "12px", fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                    {fmt(clip.totalViews)}
                  </td>
                  <td style={{ padding: "12px", fontSize: 13, color: "var(--text-secondary)" }}>
                    {fmtPct(clip.avgEngRate)}
                  </td>
                  <td style={{ padding: "12px" }}>
                    <div style={{ display: "flex", gap: 4 }}>
                      {clip.accountsPostedTo.tiktok > 0 && <PlatformBadge platform="tiktok" />}
                      {clip.accountsPostedTo.instagram > 0 && <PlatformBadge platform="instagram" />}
                    </div>
                  </td>
                  <td style={{ padding: "12px" }}>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        color: "#06B6D4",
                        background: "rgba(6,182,212,0.08)",
                        borderRadius: 99,
                        padding: "2px 7px",
                        textTransform: "capitalize",
                      }}
                    >
                      {clip.clipType || "clip"}
                    </span>
                  </td>
                  <td style={{ padding: "12px" }}>
                    <StatusBadge status={clip.status} />
                  </td>
                </tr>

                {expandedId === clip.id && clip.perAccountBreakdown.length > 0 && (
                  <tr>
                    <td colSpan={8} style={{ background: "var(--bg-subtle)", padding: "0 12px 16px 36px" }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", margin: "12px 0 8px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                        Per-Account Breakdown
                      </div>
                      <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                          <tr>
                            {["Account", "Platform", "Views", "Likes", "Comments", "Shares", "Saves", "Eng. Rate", "Posted"].map((h) => (
                              <th key={h} style={{ textAlign: "left", fontSize: 10, fontWeight: 600, color: "var(--text-tertiary)", padding: "4px 8px 6px 0", borderBottom: "1px solid var(--border-default)", whiteSpace: "nowrap" }}>
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {clip.perAccountBreakdown.map((row) => (
                            <tr key={row.accountId} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                              <td style={{ padding: "8px 8px 8px 0", fontSize: 12, color: "var(--text-primary)", fontWeight: 500 }}>@{row.handle}</td>
                              <td style={{ padding: "8px 8px 8px 0" }}><PlatformBadge platform={row.platform} /></td>
                              <td style={{ padding: "8px 8px 8px 0", fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>{fmt(row.views)}</td>
                              <td style={{ padding: "8px 8px 8px 0", fontSize: 12, color: "var(--text-secondary)" }}>{fmt(row.likes)}</td>
                              <td style={{ padding: "8px 8px 8px 0", fontSize: 12, color: "var(--text-secondary)" }}>{fmt(row.comments)}</td>
                              <td style={{ padding: "8px 8px 8px 0", fontSize: 12, color: "var(--text-secondary)" }}>{fmt(row.shares)}</td>
                              <td style={{ padding: "8px 8px 8px 0", fontSize: 12, color: "var(--text-secondary)" }}>{fmt(row.saves)}</td>
                              <td style={{ padding: "8px 8px 8px 0", fontSize: 12, color: "var(--text-secondary)" }}>{fmtPct(row.engRate)}</td>
                              <td style={{ padding: "8px 0 8px 0", fontSize: 11, color: "var(--text-tertiary)", whiteSpace: "nowrap" }}>{fmtDate(row.postedAt)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


// ─── TAB 4: Leads ────────────────────────────────────────────────────────────

function LeadsTab({ workspaceId, timeRange }: { workspaceId: string; timeRange: string }) {
  const [data, setData] = useState<LeadsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadLeads = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/analytics/leads?workspaceId=${workspaceId}&timeRange=${timeRange}`);
      if (!res.ok) throw new Error("Failed to load leads");
      const d = await res.json();
      setData(d);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load leads");
    } finally {
      setLoading(false);
    }
  }, [workspaceId, timeRange]);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} style={{ ...CARD_STYLE, padding: 20 }}>
              <SkeletonBlock height={28} width="70%" />
              <SkeletonBlock height={11} width="50%" />
            </div>
          ))}
        </div>
        <div style={{ ...CARD_STYLE, padding: 24 }}>
          <SkeletonBlock height={200} />
        </div>
      </div>
    );
  }

  if (error) {
    return <SectionError message={error} onRetry={loadLeads} />;
  }

  if (!data) return null;

  const { stats, leadsOverTime, leadsByFunnel, leadsBySource, statusPipeline, recentLeads } = data;

  const statCards = [
    { label: "Total Leads", value: fmt(stats.totalLeads), icon: Users, color: "#3B82F6", orb: "rgba(59,130,246,0.08)" },
    { label: "Leads Per Day", value: stats.leadsPerDay.toFixed(1), icon: TrendingUp, color: "#10B981", orb: "rgba(16,185,129,0.08)" },
    { label: "Top Source", value: stats.topSource || "—", icon: Zap, color: "#F59E0B", orb: "rgba(245,158,11,0.08)" },
    { label: "Lead-to-Sale Rate", value: fmtPct(stats.leadToSaleRate), icon: DollarSign, color: "#A855F7", orb: "rgba(168,85,247,0.08)" },
  ];

  const sourceData = [
    { name: "Direct", value: leadsBySource.direct, color: PIE_COLORS[0] },
    { name: "TikTok", value: leadsBySource.tiktok, color: PIE_COLORS[1] },
    { name: "Instagram", value: leadsBySource.instagram, color: PIE_COLORS[2] },
    { name: "Other", value: leadsBySource.other, color: PIE_COLORS[3] },
  ].filter((d) => d.value > 0);

  const pipelineSteps = [
    { label: "New", value: statusPipeline.new, color: "#3B82F6" },
    { label: "Contacted", value: statusPipeline.contacted, color: "#F59E0B" },
    { label: "Qualified", value: statusPipeline.qualified, color: "#A855F7" },
    { label: "Converted", value: statusPipeline.converted, color: "#10B981" },
    { label: "Lost", value: statusPipeline.lost, color: "#F43F5E" },
  ];

  const totalPipeline = pipelineSteps.reduce((sum, s) => sum + s.value, 0);

  const lineData = leadsOverTime.map((d) => ({ ...d, date: fmtDate(d.date) }));
  const funnelMaxCount = leadsByFunnel.length > 0 ? Math.max(...leadsByFunnel.map((f) => f.count), 1) : 1;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        {statCards.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} style={{ ...CARD_STYLE, padding: 20 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: s.orb,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 12,
                }}
              >
                <Icon size={16} style={{ color: s.color }} />
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: 4 }}>
                {s.value}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 500 }}>{s.label}</div>
            </div>
          );
        })}
      </div>

      {/* Status Pipeline */}
      <div style={{ ...CARD_STYLE, padding: 24 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 16 }}>Lead Status Pipeline</div>
        <div style={{ display: "flex", gap: 4, alignItems: "stretch" }}>
          {pipelineSteps.map((step, i) => (
            <React.Fragment key={step.label}>
              <div style={{ flex: 1, textAlign: "center" }}>
                <div
                  style={{
                    background: `${step.color}15`,
                    border: `1px solid ${step.color}33`,
                    borderRadius: 8,
                    padding: "12px 8px",
                  }}
                >
                  <div style={{ fontSize: 20, fontWeight: 800, color: step.color }}>{fmt(step.value)}</div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: step.color, textTransform: "uppercase", letterSpacing: "0.04em", marginTop: 3 }}>
                    {step.label}
                  </div>
                  {totalPipeline > 0 && (
                    <div style={{ fontSize: 10, color: "var(--text-tertiary)", marginTop: 4 }}>
                      {((step.value / totalPipeline) * 100).toFixed(0)}%
                    </div>
                  )}
                </div>
              </div>
              {i < pipelineSteps.length - 1 && (
                <div style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
                  <ChevronRight size={14} style={{ color: "var(--text-tertiary)" }} />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Charts row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Leads over time */}
        <div style={{ ...CARD_STYLE, padding: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 16 }}>Leads Over Time</div>
          {lineData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={lineData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="leadsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.leads} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={COLORS.leads} stopOpacity={0} />
                  </linearGradient>
                </defs>
                {CHART_GRID}
                <XAxis dataKey="date" stroke="#A1A1AA" tick={{ fontSize: 10, fill: "#71717A" }} />
                <YAxis stroke="#A1A1AA" tick={{ fontSize: 10, fill: "#71717A" }} allowDecimals={false} />
                <Tooltip {...TOOLTIP_STYLE} />
                <Line
                  type="monotone"
                  dataKey="count"
                  name="Leads"
                  stroke={COLORS.leads}
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-tertiary)", fontSize: 13 }}>
              No lead data in this period
            </div>
          )}
        </div>

        {/* Leads by Source Donut */}
        <div style={{ ...CARD_STYLE, padding: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 16 }}>Lead Sources</div>
          {sourceData.length > 0 ? (
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <ResponsiveContainer width="55%" height={180}>
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
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip {...TOOLTIP_STYLE} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                {sourceData.map((s) => {
                  const total = sourceData.reduce((sum, x) => sum + x.value, 0);
                  return (
                    <div key={s.name} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: s.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: "var(--text-secondary)", flex: 1 }}>{s.name}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>{fmt(s.value)}</span>
                      <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                        {total > 0 ? ((s.value / total) * 100).toFixed(0) + "%" : "0%"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div style={{ height: 180, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-tertiary)", fontSize: 13 }}>
              No source data available
            </div>
          )}
        </div>
      </div>

      {/* Leads by Funnel */}
      {leadsByFunnel.length > 0 && (
        <div style={{ ...CARD_STYLE, padding: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 16 }}>Leads by Funnel</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {leadsByFunnel.map((f) => (
              <div key={f.funnelId} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 12, color: "var(--text-secondary)", width: 140, flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {f.funnelName}
                </span>
                <div style={{ flex: 1, height: 20, background: "var(--bg-subtle)", borderRadius: 4, overflow: "hidden" }}>
                  <div
                    style={{
                      height: "100%",
                      width: `${(f.count / funnelMaxCount) * 100}%`,
                      background: "linear-gradient(90deg, #3B82F6, #6366F1)",
                      borderRadius: 4,
                      transition: "width 600ms ease",
                    }}
                  />
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)", width: 40, textAlign: "right", flexShrink: 0 }}>
                  {fmt(f.count)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Leads Table */}
      {recentLeads.length > 0 && (
        <div style={{ ...CARD_STYLE, padding: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 16 }}>Recent Leads</div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Name", "Email", "Funnel", "Source", "Status", "Days Since"].map((h) => (
                    <th key={h} style={{ textAlign: "left", fontSize: 10, fontWeight: 600, color: "var(--text-tertiary)", padding: "0 12px 10px 0", borderBottom: "1px solid var(--border-default)", whiteSpace: "nowrap", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentLeads.map((lead) => {
                  const isStale = lead.daysSince > 2 && lead.status.toLowerCase() === "new";
                  return (
                    <tr key={lead.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                      <td style={{ padding: "11px 12px 11px 0", fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>{lead.name}</td>
                      <td style={{ padding: "11px 12px 11px 0", fontSize: 12, color: "var(--text-secondary)" }}>{lead.email}</td>
                      <td style={{ padding: "11px 12px 11px 0", fontSize: 12, color: "var(--text-secondary)", maxWidth: 150 }}>
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>{lead.funnel}</span>
                      </td>
                      <td style={{ padding: "11px 12px 11px 0", fontSize: 12, color: "var(--text-secondary)", textTransform: "capitalize" }}>{lead.source}</td>
                      <td style={{ padding: "11px 12px 11px 0" }}><StatusBadge status={lead.status} /></td>
                      <td style={{ padding: "11px 0 11px 0" }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: isStale ? "#F43F5E" : "var(--text-secondary)" }}>
                          {lead.daysSince}d
                          {isStale && " ⚠"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}


// ─── TAB 5: Revenue ──────────────────────────────────────────────────────────

function RevenueTab({ workspaceId, timeRange }: { workspaceId: string; timeRange: string }) {
  const [data, setData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [challengePrice, setChallengePrice] = useState("");
  const [coachingPrice, setCoachingPrice] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);

  const loadRevenue = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/analytics/revenue?workspaceId=${workspaceId}&timeRange=${timeRange}`);
      if (!res.ok) throw new Error("Failed to load revenue");
      const d: RevenueData = await res.json();
      setData(d);
      setChallengePrice(d.challengePrice?.toString() ?? "");
      setCoachingPrice(d.coachingPrice?.toString() ?? "");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load revenue");
    } finally {
      setLoading(false);
    }
  }, [workspaceId, timeRange]);

  useEffect(() => {
    loadRevenue();
  }, [loadRevenue]);

  const saveSettings = async () => {
    setSavingSettings(true);
    setSettingsSaved(false);
    try {
      await fetch(`/api/workspaces/${workspaceId}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challengeTicketPrice: parseFloat(challengePrice) || 0,
          coachingProgramPrice: parseFloat(coachingPrice) || 0,
        }),
      });
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 3000);
      loadRevenue();
    } catch {
      // silently fail
    } finally {
      setSavingSettings(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ ...CARD_STYLE, padding: 24 }}><SkeletonBlock height={80} /></div>
        <div style={{ ...CARD_STYLE, padding: 24 }}><SkeletonBlock height={220} /></div>
      </div>
    );
  }

  if (error) {
    return <SectionError message={error} onRetry={loadRevenue} />;
  }

  if (!data) return null;

  const RevenueSettingsCard = ({ collapsible }: { collapsible?: boolean }) => (
    <div style={{ ...CARD_STYLE, padding: 24, marginBottom: collapsible ? 0 : 20 }}>
      {collapsible && (
        <button
          onClick={() => setSettingsOpen(!settingsOpen)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
            width: "100%",
            marginBottom: settingsOpen ? 16 : 0,
          }}
        >
          <DollarSign size={14} style={{ color: "#10B981" }} />
          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", flex: 1, textAlign: "left" }}>Revenue Settings</span>
          {settingsOpen ? <ChevronUp size={14} style={{ color: "var(--text-tertiary)" }} /> : <ChevronDown size={14} style={{ color: "var(--text-tertiary)" }} />}
        </button>
      )}
      {(!collapsible || settingsOpen) && (
        <div>
          {!collapsible && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <DollarSign size={14} style={{ color: "#10B981" }} />
              <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>Revenue Settings</span>
            </div>
          )}
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 180 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Challenge Ticket Price ($)
              </label>
              <input
                type="number"
                value={challengePrice}
                onChange={(e) => setChallengePrice(e.target.value)}
                placeholder="e.g. 997"
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "1px solid var(--border-default)",
                  background: "var(--bg-surface)",
                  fontSize: 13,
                  color: "var(--text-primary)",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div style={{ flex: 1, minWidth: 180 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Coaching Program Price ($)
              </label>
              <input
                type="number"
                value={coachingPrice}
                onChange={(e) => setCoachingPrice(e.target.value)}
                placeholder="e.g. 3000"
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "1px solid var(--border-default)",
                  background: "var(--bg-surface)",
                  fontSize: 13,
                  color: "var(--text-primary)",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div style={{ display: "flex", alignItems: "flex-end" }}>
              <button
                onClick={saveSettings}
                disabled={savingSettings}
                style={{
                  padding: "8px 20px",
                  borderRadius: 8,
                  background: settingsSaved ? "#10B981" : "#3B82F6",
                  color: "#fff",
                  border: "none",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: savingSettings ? "not-allowed" : "pointer",
                  opacity: savingSettings ? 0.7 : 1,
                  transition: "background 300ms",
                  whiteSpace: "nowrap",
                }}
              >
                {savingSettings ? "Saving…" : settingsSaved ? "Saved ✓" : "Save Prices"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (!data.hasData) {
    return (
      <div>
        <div
          style={{
            ...CARD_STYLE,
            padding: 48,
            textAlign: "center",
            marginBottom: 24,
          }}
        >
          <DollarSign size={40} style={{ color: "#10B981", margin: "0 auto 16px", opacity: 0.6 }} />
          <h3 style={{ fontSize: 20, fontWeight: 800, color: "var(--text-primary)", marginBottom: 8, letterSpacing: "-0.02em" }}>
            Revenue Analytics Awaiting Data
          </h3>
          <p style={{ fontSize: 14, color: "var(--text-secondary)", maxWidth: 420, margin: "0 auto 24px", lineHeight: 1.6 }}>
            Mark leads as <strong>Converted</strong> to start seeing revenue analytics, projections, and funnel attribution here.
          </p>
          <a
            href="/dashboard/leads"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "10px 20px",
              background: "#10B981",
              color: "#fff",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Go to Leads <ChevronRight size={14} />
          </a>
        </div>
        <RevenueSettingsCard collapsible={false} />
      </div>
    );
  }

  const revenueChartData = data.revenueOverTime.map((d) => ({
    ...d,
    month: new Date(d.month + "-01").toLocaleDateString("en-US", { month: "short" }),
  }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Revenue settings collapsible */}
      <RevenueSettingsCard collapsible={true} />

      {/* Hero revenue number */}
      <div style={{ ...CARD_STYLE, padding: 28 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
              Total Revenue
            </div>
            <div style={{ fontSize: 44, fontWeight: 900, color: "#10B981", letterSpacing: "-0.04em", lineHeight: 1 }}>
              {fmtCurrency(data.totalRevenue)}
            </div>
          </div>
          <div style={{ display: "flex", gap: 20 }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 }}>Challenge</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: COLORS.challenge, letterSpacing: "-0.02em" }}>
                {fmtCurrency(data.revenueByProduct.challenge)}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 }}>Coaching</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: COLORS.coaching, letterSpacing: "-0.02em" }}>
                {fmtCurrency(data.revenueByProduct.coaching)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue over time chart */}
      {revenueChartData.length > 0 && (
        <div style={{ ...CARD_STYLE, padding: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 16 }}>Revenue Over Time</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={revenueChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              {CHART_GRID}
              <XAxis dataKey="month" stroke="#A1A1AA" tick={{ fontSize: 11, fill: "#71717A" }} />
              <YAxis stroke="#A1A1AA" tick={{ fontSize: 11, fill: "#71717A" }} tickFormatter={(v) => fmtCurrency(v)} />
              <Tooltip {...TOOLTIP_STYLE} formatter={(v) => fmtCurrency(Number(v ?? 0))} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="challengeRevenue" name="Challenge" fill={COLORS.challenge} radius={[4, 4, 0, 0]} isAnimationActive={false} />
              <Bar dataKey="coachingRevenue" name="Coaching" fill={COLORS.coaching} radius={[4, 4, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Revenue by Funnel */}
      {data.revenueByFunnel.length > 0 && (
        <div style={{ ...CARD_STYLE, padding: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 16 }}>Revenue by Funnel</div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Funnel", "Type", "Leads", "Conversions", "Conv. Rate", "Revenue"].map((h) => (
                    <th key={h} style={{ textAlign: "left", fontSize: 10, fontWeight: 600, color: "var(--text-tertiary)", padding: "0 12px 10px 0", borderBottom: "1px solid var(--border-default)", whiteSpace: "nowrap", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.revenueByFunnel.map((f) => (
                  <tr key={f.funnelId} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                    <td style={{ padding: "11px 12px 11px 0", fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>{f.name}</td>
                    <td style={{ padding: "11px 12px 11px 0" }}>
                      <span style={{ fontSize: 10, fontWeight: 600, color: "#06B6D4", background: "rgba(6,182,212,0.08)", borderRadius: 99, padding: "2px 7px", textTransform: "capitalize" }}>
                        {f.type}
                      </span>
                    </td>
                    <td style={{ padding: "11px 12px 11px 0", fontSize: 13, color: "var(--text-primary)", fontWeight: 600 }}>{fmt(f.leads)}</td>
                    <td style={{ padding: "11px 12px 11px 0", fontSize: 13, color: "var(--text-secondary)" }}>{fmt(f.conversions)}</td>
                    <td style={{ padding: "11px 12px 11px 0", fontSize: 13, color: "var(--text-secondary)" }}>{fmtPct(f.convRate)}</td>
                    <td style={{ padding: "11px 0 11px 0", fontSize: 13, fontWeight: 700, color: "#10B981" }}>{fmtCurrency(f.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Clip Attribution */}
      {data.clipAttribution.length > 0 && (
        <div style={{ ...CARD_STYLE, padding: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 16 }}>Clip Revenue Attribution</div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Clip", "Views", "Leads", "Conversions", "Revenue"].map((h) => (
                    <th key={h} style={{ textAlign: "left", fontSize: 10, fontWeight: 600, color: "var(--text-tertiary)", padding: "0 12px 10px 0", borderBottom: "1px solid var(--border-default)", whiteSpace: "nowrap", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.clipAttribution.map((c) => (
                  <tr key={c.clipId} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                    <td style={{ padding: "11px 12px 11px 0", fontSize: 13, fontWeight: 500, color: "var(--text-primary)", maxWidth: 220 }}>
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>{c.title}</span>
                    </td>
                    <td style={{ padding: "11px 12px 11px 0", fontSize: 13, color: "var(--text-secondary)" }}>{fmt(c.views)}</td>
                    <td style={{ padding: "11px 12px 11px 0", fontSize: 13, color: "var(--text-secondary)" }}>{fmt(c.leadsGenerated)}</td>
                    <td style={{ padding: "11px 12px 11px 0", fontSize: 13, color: "var(--text-secondary)" }}>{fmt(c.conversions)}</td>
                    <td style={{ padding: "11px 0 11px 0", fontSize: 13, fontWeight: 700, color: "#10B981" }}>{fmtCurrency(c.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Projection card */}
      {data.projection && (
        <div
          style={{
            ...CARD_STYLE,
            padding: 24,
            background: "linear-gradient(135deg, rgba(16,185,129,0.04), rgba(16,185,129,0.08))",
            borderColor: "rgba(16,185,129,0.2)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <TrendingUp size={16} style={{ color: "#10B981" }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>Revenue Projection</span>
          </div>
          <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.7 }}>
            At your current rate of{" "}
            <strong style={{ color: "var(--text-primary)" }}>{data.projection.monthlyLeads} leads/month</strong>{" "}
            with a{" "}
            <strong style={{ color: "var(--text-primary)" }}>{fmtPct(data.projection.convRate)}</strong>{" "}
            conversion rate, you&apos;re projected to earn{" "}
            <strong style={{ color: "#10B981", fontSize: 16 }}>{fmtCurrency(data.projection.projectedMonthly)}</strong>{" "}
            this month.
          </p>
        </div>
      )}
    </div>
  );
}


// ─── Main Page Component ─────────────────────────────────────────────────────

type Tab = "overview" | "accounts" | "clips" | "leads" | "revenue";
type TimeRange = "7d" | "14d" | "30d" | "90d";
type Platform = "all" | "tiktok" | "instagram";

export default function AnalyticsPage() {
  const { workspace, isLoading: workspaceLoading } = useWorkspace();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");
  const [platform, setPlatform] = useState<Platform>("all");
  const [syncing, setSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [compareOn, setCompareOn] = useState(false);
  const [showStaleWarning, setShowStaleWarning] = useState(false);
  const [accountsList, setAccountsList] = useState<AccountData[]>([]);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [accountFilterOpen, setAccountFilterOpen] = useState(false);

  // Initial activity check — determines whether to show onboarding empty state
  const [activityChecked, setActivityChecked] = useState(false);
  const [hasActivity, setHasActivity] = useState(false);

  // Overview data state
  const [overviewData, setOverviewData] = useState<OverviewData | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewError, setOverviewError] = useState<string | null>(null);

  const loadOverview = useCallback(async () => {
    if (!workspace?.id) return;
    setOverviewLoading(true);
    setOverviewError(null);
    try {
      const res = await fetch(
        `/api/analytics/overview?workspaceId=${workspace.id}&timeRange=${timeRange}`
      );
      if (!res.ok) throw new Error("Failed to load overview");
      const data: OverviewData = await res.json();
      setOverviewData(data);
    } catch (e: unknown) {
      setOverviewError(e instanceof Error ? e.message : "Failed to load overview data");
    } finally {
      setOverviewLoading(false);
    }
  }, [workspace?.id, timeRange]);

  useEffect(() => {
    if (activeTab === "overview") {
      loadOverview();
    }
  }, [activeTab, loadOverview]);

  // Load accounts list for the account filter dropdown
  useEffect(() => {
    if (!workspace?.id) return;
    fetch(`/api/analytics/accounts?workspaceId=${workspace.id}`)
      .then((r) => r.ok ? r.json() : { accounts: [] })
      .then((d) => setAccountsList(d.accounts ?? []))
      .catch(() => {});
  }, [workspace?.id]);

  // Check whether this workspace has any connected accounts or published clips.
  // The cancelled flag prevents stale updates when the workspace changes mid-flight,
  // but setActivityChecked ALWAYS runs so the skeleton never gets permanently stuck.
  useEffect(() => {
    if (!workspace?.id) return;
    let cancelled = false;
    async function checkActivity() {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 8000); // 8s timeout
        const [acctRes, overviewRes] = await Promise.all([
          fetch(`/api/analytics/accounts?workspaceId=${workspace!.id}`, { signal: controller.signal }),
          fetch(`/api/analytics/overview?workspaceId=${workspace!.id}&timeRange=all`, { signal: controller.signal }),
        ]).finally(() => clearTimeout(timer));
        if (!cancelled) {
          const acctJson = acctRes.ok ? await acctRes.json() : { accounts: [] };
          const ovJson = overviewRes.ok ? await overviewRes.json() : { totalClipsPosted: 0 };
          const active = (acctJson.accounts ?? []).length > 0 || (ovJson.totalClipsPosted ?? 0) > 0;
          setHasActivity(active);
        }
      } catch {
        // On any error (network, timeout, auth) — show dashboard rather than empty state
        // Don't set hasActivity if cancelled (workspace changed) — new effect will run
        if (!cancelled) setHasActivity(true);
      } finally {
        // ALWAYS unblock the skeleton, regardless of cancelled state.
        // If cancelled (workspace changed mid-flight), the new effect will override.
        setActivityChecked(true);
      }
    }
    checkActivity();
    return () => { cancelled = true; };
  }, [workspace?.id]);

  const handleSync = async () => {
    if (!workspace?.id || syncing) return;
    setSyncing(true);
    try {
      await fetch("/api/analytics/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId: workspace.id }),
      });
      setLastSynced(new Date());
      setShowStaleWarning(false);
      // Reload current tab data after sync
      if (activeTab === "overview") loadOverview();
    } catch {
      // silently fail
    } finally {
      setSyncing(false);
    }
  };

  // Check for stale data (> 24h since last sync)
  useEffect(() => {
    if (!lastSynced) return;
    const stale = Date.now() - lastSynced.getTime() > 24 * 60 * 60 * 1000;
    setShowStaleWarning(stale);
  }, [lastSynced]);

  const TABS: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "accounts", label: "Accounts" },
    { id: "clips", label: "Clips" },
    { id: "leads", label: "Leads" },
    { id: "revenue", label: "Revenue" },
  ];

  const TIME_RANGES: { value: TimeRange; label: string }[] = [
    { value: "7d", label: "7D" },
    { value: "14d", label: "14D" },
    { value: "30d", label: "30D" },
    { value: "90d", label: "90D" },
  ];

  const PLATFORMS: { value: Platform; label: string }[] = [
    { value: "all", label: "All" },
    { value: "tiktok", label: "TikTok" },
    { value: "instagram", label: "Instagram" },
  ];

  const pillBase: React.CSSProperties = {
    padding: "6px 14px",
    borderRadius: 999,
    fontSize: 13,
    fontWeight: 600,
    border: "none",
    cursor: "pointer",
    transition: "all 150ms",
  };

  const activeTabPill: React.CSSProperties = {
    ...pillBase,
    background: "#3B82F6",
    color: "#fff",
  };

  const inactiveTabPill: React.CSSProperties = {
    ...pillBase,
    background: "transparent",
    color: "var(--text-secondary)",
  };

  const activeFilterPill: React.CSSProperties = {
    ...pillBase,
    padding: "5px 12px",
    fontSize: 12,
    background: "#3B82F6",
    color: "#fff",
  };

  const inactiveFilterPill: React.CSSProperties = {
    ...pillBase,
    padding: "5px 12px",
    fontSize: 12,
    background: "transparent",
    color: "var(--text-secondary)",
  };

  // Still waiting for workspace context to resolve
  if (workspaceLoading && !workspace) {
    return (
      <div className="flex flex-col h-full overflow-auto" style={{ background: "var(--bg-page)" }}>
        <Topbar title="Analytics" />
        <div style={{ padding: "40px", display: "flex", flexDirection: "column", gap: 16 }}>
          <SkeletonBlock height={40} width="30%" />
          <SkeletonBlock height={200} />
          <SkeletonBlock height={200} />
        </div>
      </div>
    );
  }

  // Workspace loaded but user has none — prompt to create one
  if (!workspace) {
    return (
      <div className="flex flex-col h-full overflow-auto" style={{ background: "var(--bg-page)" }}>
        <Topbar title="Analytics" />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "50vh" }}>
          <div style={{ textAlign: "center", padding: 40 }}>
            <BarChart2 size={40} style={{ color: "var(--text-tertiary)", margin: "0 auto 16px" }} />
            <p style={{ fontSize: 16, color: "var(--text-secondary)", marginBottom: 16 }}>
              No workspace found. Set one up to start tracking analytics.
            </p>
            <a
              href="/onboarding"
              style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: 8, background: "#3B82F6", color: "#fff", fontWeight: 600, fontSize: 14, textDecoration: "none" }}
            >
              Set up workspace <ArrowRight size={14} />
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Show skeleton while checking activity
  if (!activityChecked) {
    return (
      <div className="flex flex-col h-full overflow-auto" style={{ background: "var(--bg-page)" }}>
        <Topbar title="Analytics" />
        <main style={{ maxWidth: 1280, width: "100%", margin: "0 auto", padding: "32px 40px 48px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 12 }}>
              {[...Array(6)].map((_, i) => (
                <div key={i} style={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: 12, padding: 20, display: "flex", flexDirection: "column", gap: 10 }}>
                  <SkeletonBlock height={12} width="60%" />
                  <SkeletonBlock height={28} width="45%" />
                  <SkeletonBlock height={10} width="80%" />
                </div>
              ))}
            </div>
            <SkeletonBlock height={280} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <SkeletonBlock height={220} />
              <SkeletonBlock height={220} />
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Show onboarding empty state when no accounts and no clips posted
  if (!hasActivity) {
    return (
      <div className="flex flex-col h-full overflow-auto" style={{ background: "var(--bg-page)" }}>
        <Topbar title="Analytics" />
        <main style={{ maxWidth: 1280, width: "100%", margin: "0 auto", padding: "32px 40px 48px" }}>
          <AnalyticsEmptyState />
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-auto" style={{ background: "var(--bg-page)" }}>
      <Topbar title="Analytics" />

      <main
        style={{
          maxWidth: 1280,
          width: "100%",
          margin: "0 auto",
          padding: "32px 40px",
          flex: 1,
        }}
      >
        {/* ── Controls Row ──────────────────────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
            marginBottom: 28,
          }}
        >
          {/* Tab pills */}
          <div
            style={{
              display: "flex",
              gap: 4,
              background: "var(--bg-subtle)",
              borderRadius: 999,
              padding: "4px",
            }}
          >
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={activeTab === tab.id ? activeTabPill : inactiveTabPill}
                onMouseEnter={(e) => {
                  if (activeTab !== tab.id) {
                    (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-hover)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== tab.id) {
                    (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                  }
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Right controls */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            {/* Platform filter */}
            <div
              style={{
                display: "flex",
                gap: 2,
                background: "var(--bg-subtle)",
                borderRadius: 999,
                padding: "3px",
              }}
            >
              {PLATFORMS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setPlatform(p.value)}
                  style={platform === p.value ? activeFilterPill : inactiveFilterPill}
                  onMouseEnter={(e) => {
                    if (platform !== p.value) {
                      (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-hover)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (platform !== p.value) {
                      (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                    }
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Time range filter */}
            <div
              style={{
                display: "flex",
                gap: 2,
                background: "var(--bg-subtle)",
                borderRadius: 999,
                padding: "3px",
              }}
            >
              {TIME_RANGES.map((r) => (
                <button
                  key={r.value}
                  onClick={() => setTimeRange(r.value)}
                  style={timeRange === r.value ? activeFilterPill : inactiveFilterPill}
                  onMouseEnter={(e) => {
                    if (timeRange !== r.value) {
                      (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-hover)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (timeRange !== r.value) {
                      (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                    }
                  }}
                >
                  {r.label}
                </button>
              ))}
            </div>

            {/* Account filter dropdown */}
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setAccountFilterOpen((o) => !o)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "5px 12px",
                  borderRadius: 999,
                  background: selectedAccountIds.length > 0 ? "#3B82F6" : "var(--bg-subtle)",
                  color: selectedAccountIds.length > 0 ? "#fff" : "var(--text-secondary)",
                  border: "none",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <Filter size={11} />
                {selectedAccountIds.length === 0
                  ? "All Accounts"
                  : `${selectedAccountIds.length} account${selectedAccountIds.length > 1 ? "s" : ""}`}
                <ChevronDown size={11} />
              </button>
              {accountFilterOpen && accountsList.length > 0 && (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 6px)",
                    right: 0,
                    zIndex: 50,
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border-default)",
                    borderRadius: 10,
                    boxShadow: "var(--shadow-md)",
                    minWidth: 220,
                    padding: 8,
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 8px 8px", borderBottom: "1px solid var(--border-subtle)", marginBottom: 6 }}
                  >
                    <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Filter by Account</span>
                    {selectedAccountIds.length > 0 && (
                      <button
                        onClick={() => setSelectedAccountIds([])}
                        style={{ fontSize: 11, color: "#3B82F6", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  {accountsList.map((acct) => {
                    const checked = selectedAccountIds.includes(acct.id);
                    return (
                      <button
                        key={acct.id}
                        onClick={() => {
                          setSelectedAccountIds((prev) =>
                            checked ? prev.filter((id) => id !== acct.id) : [...prev, acct.id]
                          );
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          width: "100%",
                          padding: "7px 8px",
                          borderRadius: 6,
                          background: checked ? "var(--accent-blue-light)" : "transparent",
                          border: "none",
                          cursor: "pointer",
                          textAlign: "left",
                        }}
                      >
                        <div style={{
                          width: 16, height: 16, borderRadius: 3,
                          background: checked ? "#3B82F6" : "var(--bg-subtle)",
                          border: checked ? "none" : "1px solid var(--border-default)",
                          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                        }}>
                          {checked && <Check size={10} color="#fff" />}
                        </div>
                        <div style={{ width: 24, height: 24, borderRadius: "50%", background: acct.platform === "TIKTOK" ? "rgba(59,130,246,0.15)" : "rgba(168,85,247,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: acct.platform === "TIKTOK" ? "#3B82F6" : "#A855F7", flexShrink: 0 }}>
                          {(acct.username ?? acct.displayName ?? "?")[0].toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            @{acct.username}
                          </div>
                          <div style={{ fontSize: 10, color: "var(--text-tertiary)" }}>{acct.platform === "TIKTOK" ? "TikTok" : "Instagram"}</div>
                        </div>
                      </button>
                    );
                  })}
                  <div style={{ borderTop: "1px solid var(--border-subtle)", marginTop: 6, paddingTop: 6 }}>
                    <button
                      onClick={() => setAccountFilterOpen(false)}
                      style={{ width: "100%", padding: "6px 8px", borderRadius: 6, background: "#3B82F6", color: "#fff", border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                    >
                      Apply
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Compare toggle */}
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <span style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 500 }}>Compare</span>
              <button
                onClick={() => setCompareOn((c) => !c)}
                style={{
                  width: 34,
                  height: 18,
                  borderRadius: 999,
                  background: compareOn ? "#3B82F6" : "var(--bg-subtle)",
                  border: compareOn ? "none" : "1px solid var(--border-default)",
                  cursor: "pointer",
                  position: "relative",
                  transition: "background 200ms",
                  padding: 0,
                }}
                title="Compare to previous period"
              >
                <div style={{
                  position: "absolute",
                  top: 2,
                  left: compareOn ? 16 : 2,
                  width: 14,
                  height: 14,
                  borderRadius: "50%",
                  background: "#fff",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                  transition: "left 200ms",
                }} />
              </button>
            </div>

            {/* Last synced */}
            {lastSynced && (
              <span
                style={{
                  fontSize: 11,
                  color: showStaleWarning ? "#F59E0B" : "var(--text-tertiary)",
                  whiteSpace: "nowrap",
                }}
              >
                {showStaleWarning ? "⚠ " : ""}Synced {fmtAgo(lastSynced)}
              </span>
            )}

            {/* Sync button */}
            <button
              onClick={handleSync}
              disabled={syncing}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "7px 14px",
                borderRadius: 8,
                background: syncing ? "var(--bg-subtle)" : "#3B82F6",
                color: syncing ? "var(--text-tertiary)" : "#fff",
                border: syncing ? "1px solid var(--border-default)" : "none",
                fontSize: 12,
                fontWeight: 600,
                cursor: syncing ? "not-allowed" : "pointer",
                transition: "all 150ms",
              }}
            >
              {syncing ? (
                <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} />
              ) : (
                <RefreshCw size={12} />
              )}
              {syncing ? "Syncing…" : "Sync Now"}
            </button>
          </div>
        </div>

        {/* ── Stale Data Warning ──────────────────────────────────────────────── */}
        {showStaleWarning && (
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 16px",
            borderRadius: 8,
            background: "rgba(245,158,11,0.1)",
            border: "1px solid rgba(245,158,11,0.3)",
            marginBottom: 20,
          }}>
            <AlertCircle size={15} style={{ color: "#F59E0B", flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: "#F59E0B", flex: 1 }}>
              Analytics data may be outdated. Last synced {fmtAgo(lastSynced)}.
            </span>
            <button
              onClick={handleSync}
              style={{ fontSize: 12, color: "#F59E0B", background: "none", border: "none", cursor: "pointer", fontWeight: 600, textDecoration: "underline", padding: 0 }}
            >
              Sync Now
            </button>
            <button
              onClick={() => setShowStaleWarning(false)}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "#F59E0B", display: "flex" }}
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* ── Tab Content ──────────────────────────────────────────────────── */}

        {activeTab === "overview" && (
          <div>
            {overviewError && <SectionError message={overviewError} onRetry={loadOverview} />}
            <RevenueFunnel data={overviewData} />
            <OverviewStatCards data={overviewData} loading={overviewLoading} compareOn={compareOn} />
            <ViewsOverTimeChart data={overviewData} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24, alignItems: "start" }}>
              <div><EngagementBreakdownChart data={overviewData} /></div>
              <div><PostingHeatmap data={overviewData} /></div>
            </div>
            <TopClipsTable clips={overviewData?.topClips ?? []} />
          </div>
        )}

        {activeTab === "accounts" && (
          <AccountsTab workspaceId={workspace.id} timeRange={timeRange} />
        )}

        {activeTab === "clips" && (
          <ClipsTab workspaceId={workspace.id} timeRange={timeRange} />
        )}

        {activeTab === "leads" && (
          <LeadsTab workspaceId={workspace.id} timeRange={timeRange} />
        )}

        {activeTab === "revenue" && (
          <RevenueTab workspaceId={workspace.id} timeRange={timeRange} />
        )}
      </main>
    </div>
  );
}

