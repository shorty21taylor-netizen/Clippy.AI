"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from "recharts";
import {
  TrendingUp, TrendingDown, RefreshCw, Eye, Heart,
  Users, DollarSign, BarChart2, Link, Zap, AlertCircle,
  ChevronDown, ChevronUp, ExternalLink, Clock, Target
} from "lucide-react";
import { useWorkspace } from "@/lib/workspace-context";
import { Topbar } from "@/components/layout/topbar";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toString();
}

function fmtCurrency(n: number): string {
  if (n >= 1_000_000) return "$" + (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return "$" + (n / 1_000).toFixed(0) + "K";
  return "$" + Math.round(n).toLocaleString();
}

function fmtDate(s: string): string {
  return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ─── Chart theme ─────────────────────────────────────────────────────────────

const CHART_GRID = { strokeDasharray: "3 3", stroke: "rgba(0,0,0,0.06)" };
const CHART_AXIS = { stroke: "#A1A1AA", tick: { fontSize: 11, fill: "#71717A" } };
const CHART_TOOLTIP = {
  contentStyle: {
    background: "#FFFFFF",
    border: "1px solid #E4E4E7",
    borderRadius: 8,
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
    fontSize: 13,
    color: "#09090B",
  },
};

const COLORS = {
  tiktok: "#3B82F6",
  instagram: "#A855F7",
  likes: "#3B82F6",
  comments: "#22C55E",
  shares: "#F59E0B",
  saves: "#A855F7",
  coaching: "#10B981",
  challenge: "#3B82F6",
};

const PIE_COLORS = ["#3B82F6", "#A855F7", "#F59E0B", "#10B981"];

// ─── Card shell ──────────────────────────────────────────────────────────────

const CARD: React.CSSProperties = {
  background: "var(--bg-surface)",
  border: "1px solid var(--border-default)",
  borderRadius: "var(--radius-md)",
  boxShadow: "var(--shadow-sm)",
  padding: "20px",
};

// ─── Skeleton ────────────────────────────────────────────────────────────────

function Skel({ h = 20, w = "100%", r = 8 }: { h?: number; w?: number | string; r?: number }) {
  return (
    <div
      className="skeleton"
      style={{ height: h, width: w, borderRadius: r, minWidth: 0 }}
    />
  );
}

// ─── Stat card ───────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string;
  trend?: number | null;
  loading?: boolean;
  orbColor?: string;
  icon?: React.ReactNode;
  valueColor?: string;
}

function StatCard({ label, value, trend, loading, orbColor, icon, valueColor }: StatCardProps) {
  return (
    <div
      className="stat-card"
      style={{ ...CARD, "--card-orb-color": orbColor } as React.CSSProperties}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)" }}>{label}</span>
        {icon && <span style={{ color: "var(--text-tertiary)" }}>{icon}</span>}
      </div>
      {loading ? (
        <Skel h={28} w="60%" />
      ) : (
        <div style={{ fontSize: 24, fontWeight: 700, color: valueColor || "var(--text-primary)", lineHeight: 1.2 }}>
          {value}
        </div>
      )}
      {trend != null && !loading && (
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 6, fontSize: 12 }}>
          {trend >= 0 ? (
            <TrendingUp size={13} style={{ color: "#10B981" }} />
          ) : (
            <TrendingDown size={13} style={{ color: "#F43F5E" }} />
          )}
          <span style={{ color: trend >= 0 ? "#10B981" : "#F43F5E", fontWeight: 600 }}>
            {trend >= 0 ? "+" : ""}{trend}%
          </span>
          <span style={{ color: "var(--text-tertiary)" }}>vs prev period</span>
        </div>
      )}
    </div>
  );
}

// ─── Empty state ─────────────────────────────────────────────────────────────

function EmptyState({ message, sub }: { message: string; sub?: string }) {
  return (
    <div style={{ textAlign: "center", padding: "48px 24px", color: "var(--text-secondary)" }}>
      <BarChart2 size={32} style={{ margin: "0 auto 12px", opacity: 0.3 }} />
      <div style={{ fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>{message}</div>
      {sub && <div style={{ fontSize: 13 }}>{sub}</div>}
    </div>
  );
}

// ─── Error banner ────────────────────────────────────────────────────────────

function ErrorBanner({ onRetry }: { onRetry: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "rgba(244,63,94,0.06)", border: "1px solid rgba(244,63,94,0.2)", borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
      <AlertCircle size={15} style={{ color: "#F43F5E", flexShrink: 0 }} />
      <span style={{ color: "var(--text-primary)", flex: 1 }}>Failed to load analytics data.</span>
      <button onClick={onRetry} style={{ color: "#3B82F6", fontWeight: 600, background: "none", border: "none", cursor: "pointer" }}>Retry</button>
    </div>
  );
}

// ─── API Types ────────────────────────────────────────────────────────────────

interface OverviewData {
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  totalSaves: number;
  engagementRate: number;
  totalClipsPosted: number;
  trends: { views: number; likes: number; comments: number; shares: number; engagementRate: number; clipsPosted: number };
  viewsOverTime: { date: string; tiktokViews: number; instagramViews: number }[];
  engagementBreakdown: { views: number; likes: number; comments: number; shares: number; saves: number };
  platformSplit: { tiktok: { views: number; percentage: number }; instagram: { views: number; percentage: number } };
  topClips: { clipId: string; title: string; viralityScore: number; totalViews: number; totalLikes: number; totalComments: number; engagementRate: number; platforms: string[] }[];
}

interface AccountItem {
  id: string;
  platform: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  followerCount: number;
  status: string;
  lastSyncedAt: string | null;
  publishedPostsCount: number;
  avgViews: number;
  avgEngagement: number;
  recentViews: number[];
}

interface AccountDetail {
  account: { id: string; platform: string; username: string; displayName: string | null; avatarUrl: string | null; followerCount: number; lastSyncedAt: string | null };
  totals: { views: number; likes: number; comments: number; shares: number; saves: number; posts: number };
  posts: { publishLogId: string; clip: { id: string; title: string } | null; publishedAt: string | null; metrics: { views: number; likes: number; comments: number; shares: number; saves: number; engagementRate: number } | null }[];
}

interface ClipItem {
  id: string;
  title: string;
  thumbnailPath: string | null;
  viralityScore: number;
  clipType: string;
  status: string;
  sourceVideoTitle: string;
  accountsPostedTo: { tiktok: number; instagram: number; total: number };
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  avgEngRate: number;
  perAccountBreakdown: { accountId: string; handle: string; platform: string | null; views: number; likes: number; comments: number; shares: number; engRate: number; postedAt: string | null }[];
}

interface LeadsData {
  stats: { totalLeads: number; leadsPerDay: number; topSource: string; leadToSaleRate: number };
  leadsOverTime: { date: string; count: number }[];
  leadsByFunnel: { funnelId: string; funnelName: string; count: number }[];
  leadsBySource: { direct: number; tiktok: number; instagram: number; other: number };
  statusPipeline: { new: number; contacted: number; qualified: number; converted: number; lost: number };
  recentLeads: { id: string; name: string | null; email: string | null; funnel: string; source: string; status: string; createdAt: string; daysSince: number }[];
}

interface RevenueData {
  totalRevenue: number;
  revenueByProduct: { challenge: number; coaching: number };
  challengePrice: number;
  coachingPrice: number;
  revenueOverTime: { month: string; challengeRevenue: number; coachingRevenue: number }[];
  revenueByFunnel: { funnelId: string; name: string; type: string; leads: number; conversions: number; convRate: number; revenue: number }[];
  clipAttribution: { clipId: string; title: string; views: number; leadsGenerated: number; conversions: number; revenue: number }[];
  projection: { monthlyLeads: number; convRate: number; projectedMonthly: number };
  hasData: boolean;
}


// ─── Revenue Pipeline Funnel ─────────────────────────────────────────────────

function RevenuePipeline({ data, loading }: { data: OverviewData | null; loading: boolean }) {
  const stages = data ? [
    { label: "Clips Posted", value: data.totalClipsPosted, color: "#6366F1" },
    { label: "Total Views", value: data.totalViews, color: "#3B82F6" },
    { label: "Engagements", value: data.totalLikes + data.totalComments + data.totalShares, color: "#06B6D4" },
    { label: "Landing Visits", value: Math.round(data.totalViews * 0.004), color: "#10B981" },
    { label: "New Leads", value: 0, color: "#22C55E" },
    { label: "Conversions", value: 0, color: "#16A34A" },
  ] : [];

  return (
    <div style={{ ...CARD, marginBottom: 20 }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 16 }}>
        Revenue Pipeline
      </div>
      {loading ? (
        <div style={{ display: "flex", gap: 8 }}>
          {[...Array(6)].map((_, i) => <Skel key={i} h={80} />)}
        </div>
      ) : !data || stages.every(s => s.value === 0) ? (
        <EmptyState message="No pipeline data yet" sub="Post clips to start tracking your revenue pipeline" />
      ) : (
        <>
          <div style={{ display: "flex", gap: 0, alignItems: "stretch", height: 100, borderRadius: 8, overflow: "hidden" }}>
            {stages.map((stage, i) => {
              const pct = stages[0].value > 0 ? (stage.value / stages[0].value) : 0;
              const heightPct = 40 + pct * 60;
              return (
                <div
                  key={i}
                  title={`${stage.label}: ${fmt(stage.value)}`}
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    padding: "6px 4px",
                    background: `linear-gradient(to top, ${stage.color}22, ${stage.color}08)`,
                    borderLeft: i > 0 ? "1px solid rgba(0,0,0,0.04)" : undefined,
                    cursor: "default",
                  }}
                >
                  <div
                    style={{
                      width: "80%",
                      height: `${heightPct}%`,
                      background: stage.color,
                      borderRadius: "4px 4px 0 0",
                      opacity: 0.8,
                      marginBottom: 4,
                      minHeight: 8,
                    }}
                  />
                  <div style={{ fontSize: 11, fontWeight: 700, color: stage.color }}>{fmt(stage.value)}</div>
                  <div style={{ fontSize: 10, color: "var(--text-tertiary)", textAlign: "center", lineHeight: 1.2 }}>{stage.label}</div>
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: 12, fontSize: 12, color: "var(--text-secondary)", flexWrap: "wrap" }}>
            {stages[0].value > 0 && stages[2].value > 0 && (
              <span>Views→Engagement: <strong style={{ color: "var(--text-primary)" }}>{((stages[2].value / stages[1].value) * 100).toFixed(1)}%</strong></span>
            )}
            {stages[1].value > 0 && stages[3].value > 0 && (
              <span>Views→Traffic: <strong style={{ color: "var(--text-primary)" }}>{((stages[3].value / stages[1].value) * 100).toFixed(1)}%</strong></span>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Overview Tab ────────────────────────────────────────────────────────────

function OverviewTab({ workspaceId, timeRange }: { workspaceId: string; timeRange: string }) {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(false);
    try {
      const res = await fetch(`/api/analytics/overview?workspaceId=${workspaceId}&timeRange=${timeRange}`);
      if (!res.ok) throw new Error();
      setData(await res.json());
    } catch { setError(true); }
    finally { setLoading(false); }
  }, [workspaceId, timeRange]);

  useEffect(() => { load(); }, [load]);

  const totalEngagements = data ? data.totalLikes + data.totalComments + data.totalShares + data.totalSaves : 0;

  const pieData = data ? [
    { name: "TikTok", value: data.platformSplit.tiktok.views },
    { name: "Instagram", value: data.platformSplit.instagram.views },
  ] : [];

  const engBreakdown = data ? [
    { name: "Likes", value: data.engagementBreakdown.likes },
    { name: "Comments", value: data.engagementBreakdown.comments },
    { name: "Shares", value: data.engagementBreakdown.shares },
    { name: "Saves", value: data.engagementBreakdown.saves },
  ] : [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {error && <ErrorBanner onRetry={load} />}

      {/* Revenue Pipeline */}
      <RevenuePipeline data={data} loading={loading} />

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
        <StatCard label="Total Views" value={loading ? "—" : fmt(data?.totalViews ?? 0)} trend={data?.trends.views} loading={loading} orbColor="rgba(59,130,246,0.08)" icon={<Eye size={15} />} />
        <StatCard label="Engagement Rate" value={loading ? "—" : `${data?.engagementRate ?? 0}%`} trend={data?.trends.engagementRate} loading={loading} orbColor="rgba(124,58,237,0.08)" icon={<Heart size={15} />} />
        <StatCard label="Total Engagements" value={loading ? "—" : fmt(totalEngagements)} trend={data?.trends.likes} loading={loading} orbColor="rgba(6,182,212,0.08)" icon={<Zap size={15} />} />
        <StatCard label="Clips Posted" value={loading ? "—" : String(data?.totalClipsPosted ?? 0)} trend={data?.trends.clipsPosted} loading={loading} orbColor="rgba(16,185,129,0.08)" icon={<BarChart2 size={15} />} />
        <StatCard label="TikTok Views" value={loading ? "—" : fmt(data?.platformSplit.tiktok.views ?? 0)} loading={loading} orbColor="rgba(59,130,246,0.08)" icon={<TrendingUp size={15} />} />
        <StatCard label="Instagram Views" value={loading ? "—" : fmt(data?.platformSplit.instagram.views ?? 0)} loading={loading} orbColor="rgba(168,85,247,0.08)" icon={<TrendingUp size={15} />} />
      </div>

      {/* Views over time */}
      <div style={CARD}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 16 }}>Views Over Time</div>
        {loading ? <Skel h={220} /> : !data || data.viewsOverTime.length === 0 ? (
          <EmptyState message="No views data yet" sub="Publish clips to start tracking views" />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data.viewsOverTime}>
              <defs>
                <linearGradient id="tiktokG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="igG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#A855F7" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#A855F7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid {...CHART_GRID} />
              <XAxis dataKey="date" {...CHART_AXIS} tickFormatter={fmtDate} />
              <YAxis {...CHART_AXIS} tickFormatter={fmt} />
              <Tooltip {...CHART_TOOLTIP} formatter={(v) => [fmt(Number(v ?? 0)), ""]} labelFormatter={(s) => fmtDate(String(s))} />
              <Legend />
              <Area type="monotone" dataKey="tiktokViews" name="TikTok" stroke={COLORS.tiktok} fill="url(#tiktokG)" strokeWidth={2} isAnimationActive={false} />
              <Area type="monotone" dataKey="instagramViews" name="Instagram" stroke={COLORS.instagram} fill="url(#igG)" strokeWidth={2} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Engagement breakdown + Platform split */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={CARD}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 16 }}>Engagement Breakdown</div>
          {loading ? <Skel h={200} /> : engBreakdown.every(e => e.value === 0) ? (
            <EmptyState message="No engagement data" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={engBreakdown}>
                <CartesianGrid {...CHART_GRID} />
                <XAxis dataKey="name" {...CHART_AXIS} />
                <YAxis {...CHART_AXIS} tickFormatter={fmt} />
                <Tooltip {...CHART_TOOLTIP} formatter={(v) => [fmt(Number(v ?? 0)), ""]} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                  {engBreakdown.map((_, i) => (
                    <Cell key={i} fill={[COLORS.likes, COLORS.comments, COLORS.shares, COLORS.saves][i]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div style={CARD}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 16 }}>Platform Split</div>
          {loading ? <Skel h={200} /> : pieData.every(p => p.value === 0) ? (
            <EmptyState message="No platform data" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" nameKey="name" isAnimationActive={false} label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false}>
                  <Cell fill={COLORS.tiktok} />
                  <Cell fill={COLORS.instagram} />
                </Pie>
                <Tooltip {...CHART_TOOLTIP} formatter={(v) => [fmt(Number(v ?? 0)), "Views"]} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Top clips */}
      <div style={CARD}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 16 }}>Top Clips This Period</div>
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[...Array(5)].map((_, i) => <Skel key={i} h={36} />)}
          </div>
        ) : !data || data.topClips.length === 0 ? (
          <EmptyState message="No clip data yet" sub="Publish clips to see performance rankings" />
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-default)" }}>
                {["Title", "Virality", "Views", "Likes", "Comments", "Eng Rate", "Platforms"].map(h => (
                  <th key={h} style={{ padding: "6px 8px", textAlign: "left", fontWeight: 500, color: "var(--text-secondary)", fontSize: 11 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.topClips.slice(0, 5).map(clip => (
                <tr key={clip.clipId} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <td style={{ padding: "8px", maxWidth: 200 }}>
                    <div style={{ fontWeight: 500, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{clip.title}</div>
                  </td>
                  <td style={{ padding: "8px" }}>
                    <span style={{ background: clip.viralityScore >= 8 ? "rgba(16,185,129,0.1)" : "rgba(59,130,246,0.1)", color: clip.viralityScore >= 8 ? "#10B981" : "#3B82F6", borderRadius: 6, padding: "2px 7px", fontWeight: 600, fontSize: 12 }}>{clip.viralityScore}/10</span>
                  </td>
                  <td style={{ padding: "8px", fontWeight: 600 }}>{fmt(clip.totalViews)}</td>
                  <td style={{ padding: "8px" }}>{fmt(clip.totalLikes)}</td>
                  <td style={{ padding: "8px" }}>{fmt(clip.totalComments)}</td>
                  <td style={{ padding: "8px" }}>{clip.engagementRate}%</td>
                  <td style={{ padding: "8px", fontSize: 11 }}>{clip.platforms.join(", ")}</td>
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

function AccountsTab({ workspaceId }: { workspaceId: string }) {
  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AccountDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(false);
    try {
      const res = await fetch(`/api/analytics/accounts?workspaceId=${workspaceId}`);
      if (!res.ok) throw new Error();
      const json = await res.json();
      setAccounts(json.accounts ?? []);
    } catch { setError(true); }
    finally { setLoading(false); }
  }, [workspaceId]);

  useEffect(() => { load(); }, [load]);

  const openDetail = async (id: string) => {
    if (selectedId === id) { setSelectedId(null); setDetail(null); return; }
    setSelectedId(id); setDetailLoading(true);
    try {
      const res = await fetch(`/api/analytics/accounts/${id}`);
      if (res.ok) setDetail(await res.json());
    } catch { /* ignore */ }
    finally { setDetailLoading(false); }
  };

  const platformColor = (p: string) => p === "TIKTOK" ? "#3B82F6" : "#A855F7";
  const initials = (a: AccountItem) => (a.displayName || a.username || "?").slice(0, 2).toUpperCase();

  if (error) return <ErrorBanner onRetry={load} />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px,1fr))", gap: 16 }}>
          {[...Array(6)].map((_, i) => <Skel key={i} h={180} />)}
        </div>
      ) : accounts.length === 0 ? (
        <EmptyState message="No accounts connected" sub="Connect social accounts to see analytics" />
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px,1fr))", gap: 16 }}>
            {accounts.map(acct => (
              <div
                key={acct.id}
                style={{ ...CARD, borderLeft: `3px solid ${platformColor(acct.platform)}`, cursor: "pointer", transition: "box-shadow 150ms" }}
                onClick={() => openDetail(acct.id)}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  {acct.avatarUrl ? (
                    <img src={acct.avatarUrl} alt="" style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover" }} />
                  ) : (
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: `${platformColor(acct.platform)}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: platformColor(acct.platform) }}>{initials(acct)}</div>
                  )}
                  <div>
                    <div style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: 14 }}>@{acct.username}</div>
                    <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{acct.platform}</div>
                  </div>
                  <div style={{ marginLeft: "auto" }}>
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: acct.status === "ACTIVE" ? "#10B981" : "#A1A1AA", display: "inline-block" }} />
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 12 }}>
                  <div><div style={{ color: "var(--text-tertiary)" }}>Followers</div><div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{fmt(acct.followerCount)}</div></div>
                  <div><div style={{ color: "var(--text-tertiary)" }}>Posts</div><div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{acct.publishedPostsCount}</div></div>
                  <div><div style={{ color: "var(--text-tertiary)" }}>Avg Views</div><div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{fmt(acct.avgViews)}</div></div>
                  <div><div style={{ color: "var(--text-tertiary)" }}>Avg Eng.</div><div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{acct.avgEngagement}%</div></div>
                </div>
                {acct.recentViews.length > 0 && (
                  <div style={{ marginTop: 12, display: "flex", alignItems: "flex-end", gap: 3, height: 30 }}>
                    {acct.recentViews.map((v, i) => {
                      const max = Math.max(...acct.recentViews, 1);
                      return (
                        <div key={i} style={{ flex: 1, background: `${platformColor(acct.platform)}50`, borderRadius: "2px 2px 0 0", height: `${Math.max((v / max) * 100, 8)}%` }} />
                      );
                    })}
                  </div>
                )}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", marginTop: 10, gap: 4, fontSize: 12, color: platformColor(acct.platform), fontWeight: 500 }}>
                  View Details {selectedId === acct.id ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </div>
              </div>
            ))}
          </div>

          {/* Detail panel */}
          {selectedId && (
            <div style={CARD}>
              {detailLoading ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <Skel h={24} w="40%" />
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
                    {[...Array(4)].map((_, i) => <Skel key={i} h={70} />)}
                  </div>
                  <Skel h={200} />
                </div>
              ) : detail ? (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                    <div style={{ fontWeight: 700, fontSize: 16, color: "var(--text-primary)" }}>@{detail.account.username}</div>
                    <span style={{ fontSize: 12, color: "var(--text-secondary)", background: "var(--bg-subtle)", borderRadius: 6, padding: "2px 8px" }}>{detail.account.platform}</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))", gap: 12, marginBottom: 20 }}>
                    <StatCard label="Total Views" value={fmt(detail.totals.views)} />
                    <StatCard label="Total Likes" value={fmt(detail.totals.likes)} />
                    <StatCard label="Comments" value={fmt(detail.totals.comments)} />
                    <StatCard label="Posts" value={String(detail.totals.posts)} />
                  </div>
                  {detail.posts.length > 0 && (
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 600 }}>
                        <thead>
                          <tr style={{ borderBottom: "1px solid var(--border-default)" }}>
                            {["Clip Title", "Posted", "Views", "Likes", "Comments", "Eng Rate"].map(h => (
                              <th key={h} style={{ padding: "6px 8px", textAlign: "left", fontWeight: 500, color: "var(--text-secondary)", fontSize: 11 }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {detail.posts.map(post => (
                            <tr key={post.publishLogId} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                              <td style={{ padding: "8px", maxWidth: 200 }}>
                                <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--text-primary)", fontWeight: 500 }}>{post.clip?.title ?? "—"}</div>
                              </td>
                              <td style={{ padding: "8px", color: "var(--text-secondary)" }}>{post.publishedAt ? fmtDate(post.publishedAt) : "—"}</td>
                              <td style={{ padding: "8px", fontWeight: 600 }}>{fmt(post.metrics?.views ?? 0)}</td>
                              <td style={{ padding: "8px" }}>{fmt(post.metrics?.likes ?? 0)}</td>
                              <td style={{ padding: "8px" }}>{fmt(post.metrics?.comments ?? 0)}</td>
                              <td style={{ padding: "8px" }}>{post.metrics?.engagementRate ?? 0}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              ) : null}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Clips Tab ───────────────────────────────────────────────────────────────

function ClipsTab({ workspaceId, timeRange }: { workspaceId: string; timeRange: string }) {
  const [clips, setClips] = useState<ClipItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [sortBy, setSortBy] = useState("totalViews");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(false);
    try {
      const res = await fetch(`/api/analytics/clips?workspaceId=${workspaceId}&timeRange=${timeRange}&sortBy=${sortBy}`);
      if (!res.ok) throw new Error();
      const json = await res.json();
      setClips(json.clips ?? []);
    } catch { setError(true); }
    finally { setLoading(false); }
  }, [workspaceId, timeRange, sortBy]);

  useEffect(() => { load(); }, [load]);

  const clipTypeColor = (t: string) => {
    const map: Record<string, string> = { HOT_TAKE: "#F59E0B", EMOTIONAL: "#F43F5E", QUOTABLE: "#3B82F6", STORY: "#A855F7", REVEAL: "#06B6D4", RELATABLE: "#10B981" };
    return map[t] ?? "#71717A";
  };

  if (error) return <ErrorBanner onRetry={load} />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Sort by:</span>
        {["totalViews", "engagementRate", "viralityScore"].map(s => (
          <button
            key={s}
            onClick={() => setSortBy(s)}
            style={{ padding: "4px 12px", borderRadius: 20, border: "1px solid", fontSize: 12, fontWeight: 500, cursor: "pointer", transition: "all 150ms", borderColor: sortBy === s ? "#3B82F6" : "var(--border-default)", background: sortBy === s ? "#3B82F6" : "transparent", color: sortBy === s ? "#fff" : "var(--text-secondary)" }}
          >
            {s === "totalViews" ? "Views" : s === "engagementRate" ? "Engagement" : "Virality"}
          </button>
        ))}
      </div>
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[...Array(8)].map((_, i) => <Skel key={i} h={44} />)}
        </div>
      ) : clips.length === 0 ? (
        <EmptyState message="No clips found" sub="Publish clips to see performance analytics" />
      ) : (
        <div style={{ ...CARD, padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-default)", background: "var(--bg-subtle)" }}>
                {["Title", "Source Video", "Type", "Virality", "Accounts", "Views", "Eng Rate", "Status"].map(h => (
                  <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontWeight: 500, color: "var(--text-secondary)", fontSize: 11, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {clips.map(clip => (
                <React.Fragment key={clip.id}>
                  <tr
                    style={{ borderBottom: expandedId === clip.id ? "none" : "1px solid var(--border-subtle)", cursor: "pointer", background: expandedId === clip.id ? "var(--bg-subtle)" : "transparent" }}
                    onClick={() => setExpandedId(expandedId === clip.id ? null : clip.id)}
                  >
                    <td style={{ padding: "10px 12px", maxWidth: 180 }}>
                      <div style={{ fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{clip.title}</div>
                    </td>
                    <td style={{ padding: "10px 12px", maxWidth: 140, color: "var(--text-secondary)" }}>
                      <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{clip.sourceVideoTitle}</div>
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <span style={{ background: `${clipTypeColor(clip.clipType)}15`, color: clipTypeColor(clip.clipType), borderRadius: 6, padding: "2px 7px", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap" }}>{clip.clipType.replace("_", " ")}</span>
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <span style={{ background: "rgba(59,130,246,0.1)", color: "#3B82F6", borderRadius: 6, padding: "2px 7px", fontWeight: 700, fontSize: 12 }}>{clip.viralityScore}/10</span>
                    </td>
                    <td style={{ padding: "10px 12px", color: "var(--text-secondary)", fontSize: 12 }}>
                      {clip.accountsPostedTo.tiktok > 0 && <span style={{ marginRight: 4 }}>TT:{clip.accountsPostedTo.tiktok}</span>}
                      {clip.accountsPostedTo.instagram > 0 && <span>IG:{clip.accountsPostedTo.instagram}</span>}
                      {clip.accountsPostedTo.total === 0 && "—"}
                    </td>
                    <td style={{ padding: "10px 12px", fontWeight: 600 }}>{fmt(clip.totalViews)}</td>
                    <td style={{ padding: "10px 12px" }}>{clip.avgEngRate}%</td>
                    <td style={{ padding: "10px 12px" }}>
                      <span style={{ fontSize: 11, padding: "2px 7px", borderRadius: 6, background: clip.status === "PUBLISHED" ? "rgba(16,185,129,0.1)" : "rgba(161,161,170,0.1)", color: clip.status === "PUBLISHED" ? "#10B981" : "#71717A", fontWeight: 500 }}>{clip.status}</span>
                    </td>
                  </tr>
                  {expandedId === clip.id && clip.perAccountBreakdown.length > 0 && (
                    <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                      <td colSpan={8} style={{ padding: "0 12px 12px", background: "var(--bg-subtle)" }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 8, paddingTop: 8 }}>Per-Account Breakdown</div>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                          <thead>
                            <tr style={{ borderBottom: "1px solid var(--border-default)" }}>
                              {["Account", "Platform", "Views", "Likes", "Comments", "Eng Rate", "Posted"].map(h => (
                                <th key={h} style={{ padding: "4px 8px", textAlign: "left", fontWeight: 500, color: "var(--text-tertiary)", fontSize: 11 }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {clip.perAccountBreakdown.map(row => (
                              <tr key={row.accountId} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                                <td style={{ padding: "5px 8px", fontWeight: 500 }}>@{row.handle}</td>
                                <td style={{ padding: "5px 8px", color: row.platform === "TIKTOK" ? COLORS.tiktok : COLORS.instagram, fontSize: 11 }}>{row.platform}</td>
                                <td style={{ padding: "5px 8px", fontWeight: 600 }}>{fmt(row.views)}</td>
                                <td style={{ padding: "5px 8px" }}>{fmt(row.likes)}</td>
                                <td style={{ padding: "5px 8px" }}>{fmt(row.comments)}</td>
                                <td style={{ padding: "5px 8px" }}>{row.engRate}%</td>
                                <td style={{ padding: "5px 8px", color: "var(--text-tertiary)" }}>{row.postedAt ? fmtDate(row.postedAt) : "—"}</td>
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
      )}
    </div>
  );
}


// ─── Leads Tab ───────────────────────────────────────────────────────────────

function LeadsTab({ workspaceId, timeRange }: { workspaceId: string; timeRange: string }) {
  const [data, setData] = useState<LeadsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(false);
    try {
      const res = await fetch(`/api/analytics/leads?workspaceId=${workspaceId}&timeRange=${timeRange}`);
      if (!res.ok) throw new Error();
      setData(await res.json());
    } catch { setError(true); }
    finally { setLoading(false); }
  }, [workspaceId, timeRange]);

  useEffect(() => { load(); }, [load]);

  const statusColor = (s: string) => {
    const m: Record<string, string> = { NEW: "#3B82F6", CONTACTED: "#F59E0B", QUALIFIED: "#A855F7", CONVERTED: "#10B981", LOST: "#F43F5E" };
    return m[s] ?? "#71717A";
  };

  const pipelineStages: { key: keyof LeadsData["statusPipeline"]; label: string }[] = [
    { key: "new", label: "New" },
    { key: "contacted", label: "Contacted" },
    { key: "qualified", label: "Qualified" },
    { key: "converted", label: "Converted" },
    { key: "lost", label: "Lost" },
  ];

  const sourceData = data ? [
    { name: "Direct", value: data.leadsBySource.direct },
    { name: "TikTok", value: data.leadsBySource.tiktok },
    { name: "Instagram", value: data.leadsBySource.instagram },
    { name: "Other", value: data.leadsBySource.other },
  ] : [];

  if (error) return <ErrorBanner onRetry={load} />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px,1fr))", gap: 12 }}>
        <StatCard label="Total Leads" value={loading ? "—" : String(data?.stats.totalLeads ?? 0)} loading={loading} orbColor="rgba(59,130,246,0.08)" icon={<Users size={15} />} />
        <StatCard label="Leads/Day" value={loading ? "—" : String(data?.stats.leadsPerDay ?? 0)} loading={loading} orbColor="rgba(16,185,129,0.08)" icon={<TrendingUp size={15} />} />
        <StatCard label="Top Source" value={loading ? "—" : (data?.stats.topSource ?? "—")} loading={loading} orbColor="rgba(245,158,11,0.08)" icon={<Link size={15} />} />
        <StatCard label="Lead→Sale Rate" value={loading ? "—" : `${data?.stats.leadToSaleRate ?? 0}%`} loading={loading} orbColor="rgba(16,185,129,0.08)" icon={<Target size={15} />} valueColor="#10B981" />
      </div>

      {/* Leads over time */}
      <div style={CARD}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 16 }}>Leads Over Time</div>
        {loading ? <Skel h={200} /> : !data || data.leadsOverTime.length === 0 ? (
          <EmptyState message="No leads data yet" sub="Launch a funnel to start capturing leads" />
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={data.leadsOverTime}>
              <defs>
                <linearGradient id="leadsG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid {...CHART_GRID} />
              <XAxis dataKey="date" {...CHART_AXIS} tickFormatter={fmtDate} />
              <YAxis {...CHART_AXIS} allowDecimals={false} />
              <Tooltip {...CHART_TOOLTIP} labelFormatter={(s) => fmtDate(String(s))} />
              <Area type="monotone" dataKey="count" name="Leads" stroke="#3B82F6" fill="url(#leadsG)" strokeWidth={2} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Funnel breakdown + source donut */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={CARD}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 16 }}>Leads by Funnel</div>
          {loading ? <Skel h={200} /> : !data || data.leadsByFunnel.length === 0 ? (
            <EmptyState message="No funnel data" />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {data.leadsByFunnel.slice(0, 8).map(f => {
                const max = data.leadsByFunnel[0].count;
                return (
                  <div key={f.funnelId} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ flex: 1, fontSize: 12, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 80 }}>{f.funnelName}</div>
                    <div style={{ flex: 2, height: 8, background: "var(--bg-subtle)", borderRadius: 4, overflow: "hidden" }}>
                      <div style={{ width: `${(f.count / max) * 100}%`, height: "100%", background: "#3B82F6", borderRadius: 4 }} />
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", minWidth: 28, textAlign: "right" }}>{f.count}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={CARD}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 16 }}>Lead Sources</div>
          {loading ? <Skel h={200} /> : !data || sourceData.every(s => s.value === 0) ? (
            <EmptyState message="No source data" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={sourceData.filter(s => s.value > 0)} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value" nameKey="name" isAnimationActive={false} label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                  {sourceData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip {...CHART_TOOLTIP} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Status pipeline */}
      <div style={CARD}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 16 }}>Lead Status Pipeline</div>
        {loading ? <Skel h={60} /> : !data ? null : (
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            {pipelineStages.map((stage, i) => {
              const count = data.statusPipeline[stage.key];
              const color = statusColor(stage.key.toUpperCase());
              return (
                <React.Fragment key={stage.key}>
                  <div style={{ flex: 1, background: `${color}15`, border: `1px solid ${color}30`, borderRadius: 8, padding: "12px 8px", textAlign: "center" }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color }}>{count}</div>
                    <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 2 }}>{stage.label}</div>
                  </div>
                  {i < pipelineStages.length - 1 && (
                    <span style={{ color: "var(--text-tertiary)", fontSize: 16 }}>→</span>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent leads */}
      <div style={CARD}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 16 }}>Recent Leads</div>
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[...Array(5)].map((_, i) => <Skel key={i} h={36} />)}
          </div>
        ) : !data || data.recentLeads.length === 0 ? (
          <EmptyState message="No leads yet" sub="Launch a funnel to start capturing leads" />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 600 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-default)" }}>
                  {["Name", "Email", "Funnel", "Source", "Status", "Days Since"].map(h => (
                    <th key={h} style={{ padding: "6px 8px", textAlign: "left", fontWeight: 500, color: "var(--text-secondary)", fontSize: 11 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.recentLeads.slice(0, 20).map(lead => {
                  const isUrgent = lead.status === "NEW" && lead.daysSince > 2;
                  return (
                    <tr key={lead.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                      <td style={{ padding: "8px" }}>{lead.name ?? "—"}</td>
                      <td style={{ padding: "8px", color: "var(--text-secondary)" }}>{lead.email ?? "—"}</td>
                      <td style={{ padding: "8px", maxWidth: 140 }}><div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lead.funnel}</div></td>
                      <td style={{ padding: "8px", color: "var(--text-secondary)" }}>{lead.source}</td>
                      <td style={{ padding: "8px" }}>
                        <span style={{ background: `${statusColor(lead.status)}15`, color: statusColor(lead.status), borderRadius: 6, padding: "2px 7px", fontWeight: 600, fontSize: 11 }}>{lead.status}</span>
                      </td>
                      <td style={{ padding: "8px" }}>
                        <span style={{ color: isUrgent ? "#F43F5E" : "var(--text-secondary)", fontWeight: isUrgent ? 600 : 400, display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}>
                          {isUrgent && <Clock size={12} />}
                          {lead.daysSince}d ago
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}


// ─── Revenue Tab ─────────────────────────────────────────────────────────────

function RevenueTab({ workspaceId, timeRange }: { workspaceId: string; timeRange: string }) {
  const [data, setData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [challengePrice, setChallengePrice] = useState(197);
  const [coachingPrice, setCoachingPrice] = useState(6000);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(false);
    try {
      const res = await fetch(`/api/analytics/revenue?workspaceId=${workspaceId}&timeRange=${timeRange}`);
      if (!res.ok) throw new Error();
      const json: RevenueData = await res.json();
      setData(json);
      setChallengePrice(json.challengePrice);
      setCoachingPrice(json.coachingPrice);
    } catch { setError(true); }
    finally { setLoading(false); }
  }, [workspaceId, timeRange]);

  useEffect(() => { load(); }, [load]);

  const saveSettings = async () => {
    setSavingSettings(true);
    try {
      await fetch(`/api/workspaces/${workspaceId}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeTicketPrice: challengePrice, coachingProgramPrice: coachingPrice }),
      });
      await load();
    } catch { /* ignore */ }
    finally { setSavingSettings(false); }
  };

  if (error) return <ErrorBanner onRetry={load} />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Settings card */}
      <div style={CARD}>
        <button
          onClick={() => setSettingsOpen(v => !v)}
          style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}
        >
          <DollarSign size={15} style={{ color: "#10B981" }} />
          Revenue Settings
          {settingsOpen ? <ChevronUp size={14} style={{ marginLeft: "auto" }} /> : <ChevronDown size={14} style={{ marginLeft: "auto" }} />}
        </button>
        {settingsOpen && (
          <div style={{ marginTop: 16, display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 4 }}>Challenge Ticket Price ($)</label>
              <input
                type="number"
                value={challengePrice}
                onChange={e => setChallengePrice(Number(e.target.value))}
                style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid var(--border-default)", fontSize: 13, width: 120, outline: "none" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 4 }}>Coaching Program Price ($)</label>
              <input
                type="number"
                value={coachingPrice}
                onChange={e => setCoachingPrice(Number(e.target.value))}
                style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid var(--border-default)", fontSize: 13, width: 120, outline: "none" }}
              />
            </div>
            <button
              onClick={saveSettings}
              disabled={savingSettings}
              style={{ padding: "7px 18px", borderRadius: 8, background: "#10B981", color: "#fff", border: "none", fontWeight: 600, fontSize: 13, cursor: savingSettings ? "not-allowed" : "pointer", opacity: savingSettings ? 0.7 : 1 }}
            >
              {savingSettings ? "Saving…" : "Save Settings"}
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Skel h={120} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}><Skel h={200} /><Skel h={200} /></div>
        </div>
      ) : !data?.hasData ? (
        <div style={{ ...CARD, textAlign: "center", padding: "60px 24px" }}>
          <DollarSign size={40} style={{ margin: "0 auto 16px", opacity: 0.2, display: "block" }} />
          <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>No revenue data yet</div>
          <div style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 20 }}>
            Mark leads as <strong>Converted</strong> in the Leads page to start tracking revenue.
          </div>
          <a
            href="/dashboard/leads"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 18px", borderRadius: 8, background: "#10B981", color: "#fff", fontWeight: 600, fontSize: 13, textDecoration: "none" }}
          >
            Go to Leads <ExternalLink size={13} />
          </a>
        </div>
      ) : (
        <>
          {/* Hero revenue number */}
          <div style={{ ...CARD, textAlign: "center", padding: "32px 24px" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Estimated Revenue This Period</div>
            <div style={{ fontSize: 48, fontWeight: 800, color: "#10B981", lineHeight: 1, marginBottom: 12 }}>{fmtCurrency(data.totalRevenue)}</div>
            <div style={{ display: "flex", gap: 24, justifyContent: "center", fontSize: 13, color: "var(--text-secondary)" }}>
              {data.revenueByProduct.challenge > 0 && <span>Challenge tickets: <strong style={{ color: "#3B82F6" }}>{fmtCurrency(data.revenueByProduct.challenge)}</strong></span>}
              {data.revenueByProduct.coaching > 0 && <span>Coaching: <strong style={{ color: "#10B981" }}>{fmtCurrency(data.revenueByProduct.coaching)}</strong></span>}
            </div>
          </div>

          {/* Revenue over time + by funnel */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={CARD}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 16 }}>Revenue Over Time</div>
              {data.revenueOverTime.length === 0 ? <EmptyState message="No monthly data" /> : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={data.revenueOverTime}>
                    <CartesianGrid {...CHART_GRID} />
                    <XAxis dataKey="month" {...CHART_AXIS} />
                    <YAxis {...CHART_AXIS} tickFormatter={fmtCurrency} />
                    <Tooltip {...CHART_TOOLTIP} formatter={(v) => [fmtCurrency(Number(v ?? 0)), ""]} />
                    <Legend />
                    <Bar dataKey="challengeRevenue" name="Challenge" fill={COLORS.challenge} radius={[3, 3, 0, 0]} isAnimationActive={false} />
                    <Bar dataKey="coachingRevenue" name="Coaching" fill={COLORS.coaching} radius={[3, 3, 0, 0]} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div style={CARD}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 16 }}>Revenue by Funnel</div>
              {data.revenueByFunnel.length === 0 ? <EmptyState message="No funnel revenue data" /> : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--border-default)" }}>
                        {["Funnel", "Leads", "Conv.", "Rate", "Revenue"].map(h => (
                          <th key={h} style={{ padding: "5px 8px", textAlign: "left", fontWeight: 500, color: "var(--text-secondary)", fontSize: 11 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.revenueByFunnel.slice(0, 6).map(f => (
                        <tr key={f.funnelId} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                          <td style={{ padding: "6px 8px", maxWidth: 120 }}><div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</div></td>
                          <td style={{ padding: "6px 8px" }}>{f.leads}</td>
                          <td style={{ padding: "6px 8px" }}>{f.conversions}</td>
                          <td style={{ padding: "6px 8px" }}>{f.convRate}%</td>
                          <td style={{ padding: "6px 8px", fontWeight: 600, color: "#10B981" }}>{fmtCurrency(f.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Clip attribution */}
          {data.clipAttribution.length > 0 && (
            <div style={CARD}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 16 }}>Clip Revenue Attribution</div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border-default)" }}>
                    {["Clip Title", "Views", "Leads", "Conversions", "Revenue"].map(h => (
                      <th key={h} style={{ padding: "6px 8px", textAlign: "left", fontWeight: 500, color: "var(--text-secondary)", fontSize: 11 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.clipAttribution.map(c => (
                    <tr key={c.clipId} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                      <td style={{ padding: "8px", maxWidth: 200 }}><div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 500 }}>{c.title || c.clipId}</div></td>
                      <td style={{ padding: "8px" }}>{fmt(c.views)}</td>
                      <td style={{ padding: "8px" }}>{c.leadsGenerated}</td>
                      <td style={{ padding: "8px" }}>{c.conversions}</td>
                      <td style={{ padding: "8px", fontWeight: 600, color: "#10B981" }}>{fmtCurrency(c.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Projection */}
          <div style={{ ...CARD, background: "linear-gradient(135deg, rgba(16,185,129,0.06), rgba(59,130,246,0.04))" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <TrendingUp size={16} style={{ color: "#10B981" }} />
              <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>Monthly Projection</span>
            </div>
            <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6, margin: 0 }}>
              At your current rate of <strong style={{ color: "var(--text-primary)" }}>{data.projection.monthlyLeads} leads/month</strong> with a <strong style={{ color: "var(--text-primary)" }}>{data.projection.convRate}% conversion rate</strong>, you&apos;re projected to generate{" "}
              <strong style={{ color: "#10B981", fontSize: 16 }}>{fmtCurrency(data.projection.projectedMonthly)}</strong> this month.
            </p>
          </div>
        </>
      )}
    </div>
  );
}


// ─── Main Page ────────────────────────────────────────────────────────────────

const TABS = ["Overview", "Accounts", "Clips", "Leads", "Revenue"] as const;
type Tab = (typeof TABS)[number];

const TIME_RANGES = [
  { label: "7D", value: "7d" },
  { label: "14D", value: "14d" },
  { label: "30D", value: "30d" },
  { label: "90D", value: "90d" },
] as const;

export default function AnalyticsPage() {
  const { workspace } = useWorkspace();
  const [activeTab, setActiveTab] = useState<Tab>("Overview");
  const [timeRange, setTimeRange] = useState("30d");
  const [syncing, setSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<string | null>(null);

  const handleSync = async () => {
    if (!workspace || syncing) return;
    setSyncing(true);
    try {
      await fetch("/api/analytics/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId: workspace.id }),
      });
      setLastSynced(new Date().toLocaleTimeString());
    } catch { /* ignore */ }
    finally { setSyncing(false); }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "var(--bg-page)" }}>
      <Topbar title="Analytics" />

      <main style={{ flex: 1, maxWidth: 1280, width: "100%", margin: "0 auto", padding: "24px 40px 48px" }}>

        {/* Page header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)", margin: 0, marginBottom: 4 }}>Analytics</h1>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0 }}>
            Multi-account performance tracking across TikTok &amp; Instagram — revenue analytics for your coaching business.
          </p>
        </div>

        {/* Global controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
          {/* Time range */}
          <div style={{ display: "flex", background: "var(--bg-subtle)", borderRadius: 20, padding: 3, gap: 2 }}>
            {TIME_RANGES.map(tr => (
              <button
                key={tr.value}
                onClick={() => setTimeRange(tr.value)}
                style={{ padding: "4px 14px", borderRadius: 17, border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 150ms", background: timeRange === tr.value ? "#3B82F6" : "transparent", color: timeRange === tr.value ? "#fff" : "var(--text-secondary)" }}
              >
                {tr.label}
              </button>
            ))}
          </div>

          {/* Sync */}
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
            {lastSynced && (
              <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>Last synced: {lastSynced}</span>
            )}
            <button
              onClick={handleSync}
              disabled={syncing || !workspace}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 8, border: "1px solid var(--border-default)", background: "var(--bg-surface)", fontSize: 12, fontWeight: 600, cursor: syncing || !workspace ? "not-allowed" : "pointer", color: "var(--text-primary)", opacity: syncing ? 0.6 : 1, transition: "all 150ms" }}
            >
              <RefreshCw size={13} style={{ animation: syncing ? "spin 1s linear infinite" : undefined }} />
              {syncing ? "Syncing…" : "Sync Now"}
            </button>
          </div>
        </div>

        {/* Tab nav */}
        <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: "1px solid var(--border-default)", paddingBottom: 0 }}>
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{ padding: "8px 16px", borderRadius: "8px 8px 0 0", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 150ms", background: activeTab === tab ? "#3B82F6" : "transparent", color: activeTab === tab ? "#fff" : "var(--text-secondary)", borderBottom: activeTab === tab ? "2px solid #3B82F6" : "2px solid transparent", marginBottom: -1 }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {!workspace ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 12 }}>
              {[...Array(6)].map((_, i) => <Skel key={i} h={90} />)}
            </div>
            <Skel h={250} />
          </div>
        ) : (
          <>
            {activeTab === "Overview" && <OverviewTab workspaceId={workspace.id} timeRange={timeRange} />}
            {activeTab === "Accounts" && <AccountsTab workspaceId={workspace.id} />}
            {activeTab === "Clips" && <ClipsTab workspaceId={workspace.id} timeRange={timeRange} />}
            {activeTab === "Leads" && <LeadsTab workspaceId={workspace.id} timeRange={timeRange} />}
            {activeTab === "Revenue" && <RevenueTab workspaceId={workspace.id} timeRange={timeRange} />}
          </>
        )}
      </main>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
