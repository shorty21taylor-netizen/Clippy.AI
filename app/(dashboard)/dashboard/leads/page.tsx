"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import {
  Search,
  Download,
  Filter,
  ChevronDown,
  X,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Users,
  Inbox,
  Check,
  Plus,
  Trash2,
  Copy,
  ExternalLink,
  Clock,
  Tag,
} from "lucide-react";
import { useWorkspace } from "@/lib/workspace-context";
import { Topbar } from "@/components/layout/topbar";

// ─── Types ────────────────────────────────────────────────────────────────────

type LeadStatus = "NEW" | "CONTACTED" | "QUALIFIED" | "CONVERTED" | "LOST";

interface FunnelRef {
  id: string;
  title: string;
  slug: string;
}

interface LeadEvent {
  id: string;
  leadId: string;
  type: string;
  description: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

interface Lead {
  id: string;
  workspaceId: string;
  funnelId: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  status: LeadStatus;
  tags: string[];
  notes: string | null;
  notesUpdatedAt: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
  referrer: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  pageUrl: string | null;
  submittedAt: string;
  funnel: FunnelRef | null;
  events?: LeadEvent[];
}

interface Stats {
  total: number;
  thisMonth: number;
  lastMonth: number;
  thisWeek: number;
  lastWeek: number;
  conversionRate: number;
  dailyTrend: number[];
  monthlyChange: number;
  weeklyChange: number;
}

interface Filters {
  search: string;
  funnelId: string;
  statuses: LeadStatus[];
  dateRange: string;
  tags: string[];
}

interface SortState {
  sortBy: "submittedAt" | "name" | "email" | "status";
  sortOrder: "asc" | "desc";
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ALL_STATUSES: LeadStatus[] = ["NEW", "CONTACTED", "QUALIFIED", "CONVERTED", "LOST"];

const STATUS_CONFIG: Record<LeadStatus, { label: string; color: string; bg: string; dot: string }> = {
  NEW: { label: "New", color: "#3b82f6", bg: "rgba(59,130,246,0.12)", dot: "#3b82f6" },
  CONTACTED: { label: "Contacted", color: "#eab308", bg: "rgba(234,179,8,0.12)", dot: "#eab308" },
  QUALIFIED: { label: "Qualified", color: "#a855f7", bg: "rgba(168,85,247,0.12)", dot: "#a855f7" },
  CONVERTED: { label: "Converted", color: "#22c55e", bg: "rgba(34,197,94,0.12)", dot: "#22c55e" },
  LOST: { label: "Lost", color: "#71717a", bg: "rgba(113,113,122,0.12)", dot: "#71717a" },
};

const DATE_RANGE_OPTIONS = [
  { value: "all", label: "All Time" },
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "30d", label: "Last 30 Days" },
  { value: "90d", label: "Last 90 Days" },
];

// ─── Sparkline Component ──────────────────────────────────────────────────────

function Sparkline({ data, color = "#3b82f6" }: { data: number[]; color?: string }) {
  const width = 60;
  const height = 32;
  const padding = 2;

  const points = useMemo(() => {
    if (!data || data.length === 0) return "";
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const step = (width - padding * 2) / Math.max(data.length - 1, 1);

    return data
      .map((val, i) => {
        const x = padding + i * step;
        const y = height - padding - ((val - min) / range) * (height - padding * 2);
        return `${x},${y}`;
      })
      .join(" ");
  }, [data, width, height, padding]);

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} fill="none">
      {points && (
        <polyline
          points={points}
          stroke={color}
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: LeadStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "2px 8px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.02em",
        color: cfg.color,
        backgroundColor: cfg.bg,
        whiteSpace: "nowrap",
      }}
    >
      <span
        style={{
          width: 5,
          height: 5,
          borderRadius: "50%",
          backgroundColor: cfg.dot,
          flexShrink: 0,
        }}
      />
      {cfg.label}
    </span>
  );
}

// ─── Date Range to API params ─────────────────────────────────────────────────

function dateRangeToParams(range: string): { dateFrom?: string; dateTo?: string } {
  const now = new Date();
  if (range === "all" || !range) return {};

  if (range === "today") {
    const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    return { dateFrom: from.toISOString() };
  }
  if (range === "week") {
    const dayOfWeek = now.getUTCDay();
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const from = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysFromMonday)
    );
    return { dateFrom: from.toISOString() };
  }
  if (range === "month") {
    const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    return { dateFrom: from.toISOString() };
  }
  if (range === "30d") {
    const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return { dateFrom: from.toISOString() };
  }
  if (range === "90d") {
    const from = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    return { dateFrom: from.toISOString() };
  }
  return {};
}

// ─── Format Date ──────────────────────────────────────────────────────────────

function formatDate(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatDateTime(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// ─── Copy to clipboard ────────────────────────────────────────────────────────

function useCopyText() {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = useCallback((text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    });
  }, []);
  return { copied, copy };
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ w, h, r = 6 }: { w: number | string; h: number; r?: number }) {
  return (
    <div
      className="animate-pulse"
      style={{
        width: w,
        height: h,
        borderRadius: r,
        backgroundColor: "var(--bg-elevated)",
      }}
    />
  );
}

// ─── Main Page Component ──────────────────────────────────────────────────────

export default function LeadsPage() {
  const { workspace } = useWorkspace();

  // Data state
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState<Stats | null>(null);
  const [funnelsList, setFunnelsList] = useState<FunnelRef[]>([]);

  // Loading state
  const [isLoading, setIsLoading] = useState(true);
  const [isStatsLoading, setIsStatsLoading] = useState(true);

  // Filters & sort
  const [filters, setFilters] = useState<Filters>({
    search: "",
    funnelId: "",
    statuses: [],
    dateRange: "all",
    tags: [],
  });
  const [sort, setSort] = useState<SortState>({ sortBy: "submittedAt", sortOrder: "desc" });
  const [limit, setLimit] = useState(25);

  // Selection
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);

  // Detail panel
  const [detailLead, setDetailLead] = useState<Lead | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  // UI toggles
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [bulkDropdownOpen, setBulkDropdownOpen] = useState(false);
  const [funnelDropdownOpen, setFunnelDropdownOpen] = useState(false);
  const [sourceExpanded, setSourceExpanded] = useState(false);

  // Notes debounce ref
  const notesSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [notesValue, setNotesValue] = useState("");
  const [notesSaving, setNotesSaving] = useState(false);

  // Tag input
  const [tagInput, setTagInput] = useState("");

  // Search debounce
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // ─── Fetch Stats ────────────────────────────────────────────────────────────

  const fetchStats = useCallback(async () => {
    if (!workspace) return;
    setIsStatsLoading(true);
    try {
      const res = await fetch(`/api/leads/stats?workspaceId=${workspace.id}`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } finally {
      setIsStatsLoading(false);
    }
  }, [workspace]);

  // ─── Fetch Funnels ──────────────────────────────────────────────────────────

  const fetchFunnels = useCallback(async () => {
    if (!workspace) return;
    try {
      const res = await fetch(`/api/funnels?workspaceId=${workspace.id}`);
      if (res.ok) {
        const data = await res.json();
        setFunnelsList(data.funnels ?? []);
      }
    } catch {
      // silently fail
    }
  }, [workspace]);

  // ─── Fetch Leads ────────────────────────────────────────────────────────────

  const fetchLeads = useCallback(async () => {
    if (!workspace) return;
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("workspaceId", workspace.id);
      params.set("page", String(page));
      params.set("limit", String(limit));
      params.set("sortBy", sort.sortBy);
      params.set("sortOrder", sort.sortOrder);

      if (debouncedSearch) params.set("search", debouncedSearch);
      if (filters.funnelId) params.set("funnelId", filters.funnelId);
      if (filters.statuses.length > 0) params.set("status", filters.statuses.join(","));
      if (filters.tags.length > 0) params.set("tags", filters.tags.join(","));

      const dateParams = dateRangeToParams(filters.dateRange);
      if (dateParams.dateFrom) params.set("dateFrom", dateParams.dateFrom);
      if (dateParams.dateTo) params.set("dateTo", dateParams.dateTo);

      const res = await fetch(`/api/leads?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLeads(data.leads ?? []);
        setTotal(data.total ?? 0);
        setTotalPages(data.totalPages ?? 1);
      }
    } finally {
      setIsLoading(false);
    }
  }, [workspace, page, limit, sort, debouncedSearch, filters]);

  // ─── Effects ────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (workspace) {
      fetchStats();
      fetchFunnels();
    }
  }, [workspace, fetchStats, fetchFunnels]);

  useEffect(() => {
    if (workspace) {
      fetchLeads();
    }
  }, [workspace, fetchLeads]);

  // Search debounce
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setDebouncedSearch(filters.search);
      setPage(1);
    }, 300);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [filters.search]);

  // Reset page when filters/sort change (but not page itself)
  useEffect(() => {
    setPage(1);
  }, [filters.funnelId, filters.statuses, filters.dateRange, filters.tags, sort, limit]);

  // ─── Fetch Detail Lead ──────────────────────────────────────────────────────

  const fetchDetailLead = useCallback(
    async (id: string) => {
      if (!workspace) return;
      setIsDetailLoading(true);
      try {
        const res = await fetch(`/api/leads/${id}?workspaceId=${workspace.id}`);
        if (res.ok) {
          const data = await res.json();
          setDetailLead(data.lead);
          setNotesValue(data.lead.notes ?? "");
        }
      } finally {
        setIsDetailLoading(false);
      }
    },
    [workspace]
  );

  const openDetail = useCallback(
    (lead: Lead) => {
      setSelectedLeadId(lead.id);
      fetchDetailLead(lead.id);
    },
    [fetchDetailLead]
  );

  const closeDetail = useCallback(() => {
    setSelectedLeadId(null);
    setDetailLead(null);
    setTagInput("");
    setSourceExpanded(false);
  }, []);

  // ─── PATCH lead ─────────────────────────────────────────────────────────────

  const patchLead = useCallback(
    async (id: string, updates: { status?: string; tags?: string[]; notes?: string }) => {
      if (!workspace) return;
      const res = await fetch(`/api/leads/${id}?workspaceId=${workspace.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const data = await res.json();
        setDetailLead(data.lead);
        // Update in list
        setLeads((prev) =>
          prev.map((l) =>
            l.id === id ? { ...l, ...updates, status: (updates.status as LeadStatus) ?? l.status } : l
          )
        );
      }
    },
    [workspace]
  );

  // ─── Notes auto-save ────────────────────────────────────────────────────────

  const handleNotesChange = useCallback(
    (value: string) => {
      setNotesValue(value);
      if (notesSaveTimerRef.current) clearTimeout(notesSaveTimerRef.current);
      notesSaveTimerRef.current = setTimeout(async () => {
        if (!detailLead) return;
        setNotesSaving(true);
        await patchLead(detailLead.id, { notes: value });
        setNotesSaving(false);
      }, 1000);
    },
    [detailLead, patchLead]
  );

  // ─── Tags ────────────────────────────────────────────────────────────────────

  const addTag = useCallback(async () => {
    if (!detailLead || !tagInput.trim()) return;
    const newTag = tagInput.trim();
    if (detailLead.tags.includes(newTag)) {
      setTagInput("");
      return;
    }
    const newTags = [...detailLead.tags, newTag];
    await patchLead(detailLead.id, { tags: newTags });
    setTagInput("");
  }, [detailLead, tagInput, patchLead]);

  const removeTag = useCallback(
    async (tag: string) => {
      if (!detailLead) return;
      const newTags = detailLead.tags.filter((t) => t !== tag);
      await patchLead(detailLead.id, { tags: newTags });
    },
    [detailLead, patchLead]
  );

  // ─── Delete Lead ─────────────────────────────────────────────────────────────

  const deleteLead = useCallback(
    async (id: string) => {
      if (!workspace) return;
      if (!confirm("Delete this lead? This cannot be undone.")) return;
      const res = await fetch(`/api/leads/${id}?workspaceId=${workspace.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setLeads((prev) => prev.filter((l) => l.id !== id));
        setTotal((t) => t - 1);
        if (selectedLeadId === id) closeDetail();
        fetchStats();
      }
    },
    [workspace, selectedLeadId, closeDetail, fetchStats]
  );

  // ─── Bulk Actions ────────────────────────────────────────────────────────────

  const handleBulkAction = useCallback(
    async (action: "status" | "tag" | "delete", value?: string) => {
      if (!workspace || selectedLeadIds.length === 0) return;
      if (action === "delete" && !confirm(`Delete ${selectedLeadIds.length} lead(s)?`)) return;

      const res = await fetch("/api/leads/bulk-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: workspace.id,
          ids: selectedLeadIds,
          action,
          value,
        }),
      });

      if (res.ok) {
        setSelectedLeadIds([]);
        setBulkDropdownOpen(false);
        fetchLeads();
        fetchStats();
      }
    },
    [workspace, selectedLeadIds, fetchLeads, fetchStats]
  );

  // ─── Export ──────────────────────────────────────────────────────────────────

  const handleExport = useCallback(() => {
    if (!workspace) return;
    const params = new URLSearchParams();
    params.set("workspaceId", workspace.id);
    params.set("format", "csv");
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (filters.funnelId) params.set("funnelId", filters.funnelId);
    if (filters.statuses.length > 0) params.set("status", filters.statuses.join(","));
    if (filters.tags.length > 0) params.set("tags", filters.tags.join(","));
    const dateParams = dateRangeToParams(filters.dateRange);
    if (dateParams.dateFrom) params.set("dateFrom", dateParams.dateFrom);
    window.open(`/api/leads/export?${params.toString()}`);
  }, [workspace, debouncedSearch, filters]);

  // ─── Sort Toggle ─────────────────────────────────────────────────────────────

  const toggleSort = useCallback(
    (field: SortState["sortBy"]) => {
      setSort((prev) => ({
        sortBy: field,
        sortOrder: prev.sortBy === field && prev.sortOrder === "asc" ? "desc" : "asc",
      }));
    },
    []
  );

  // ─── Select All ──────────────────────────────────────────────────────────────

  const allSelected = leads.length > 0 && selectedLeadIds.length === leads.length;
  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedLeadIds([]);
    } else {
      setSelectedLeadIds(leads.map((l) => l.id));
    }
  };

  const toggleSelectLead = (id: string) => {
    setSelectedLeadIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // ─── Sort Icon ───────────────────────────────────────────────────────────────

  const SortIcon = ({ field }: { field: SortState["sortBy"] }) => {
    if (sort.sortBy !== field)
      return <ArrowUpDown size={12} style={{ color: "var(--text-muted)", marginLeft: 4 }} />;
    return sort.sortOrder === "asc" ? (
      <ArrowUp size={12} style={{ color: "var(--accent-blue)", marginLeft: 4 }} />
    ) : (
      <ArrowDown size={12} style={{ color: "var(--accent-blue)", marginLeft: 4 }} />
    );
  };

  // ─── Stats cards data ────────────────────────────────────────────────────────

  const statCards = useMemo(() => {
    if (!stats) return null;
    return [
      {
        label: "Total Leads",
        value: stats.total.toLocaleString(),
        sparkData: stats.dailyTrend,
        sparkColor: "#3b82f6",
        change: null,
        icon: <Users size={14} />,
      },
      {
        label: "This Month",
        value: stats.thisMonth.toLocaleString(),
        sparkData: stats.dailyTrend,
        sparkColor: "#a855f7",
        change: stats.monthlyChange,
        icon: <Clock size={14} />,
      },
      {
        label: "This Week",
        value: stats.thisWeek.toLocaleString(),
        sparkData: stats.dailyTrend.slice(-7),
        sparkColor: "#22c55e",
        change: stats.weeklyChange,
        icon: <Inbox size={14} />,
      },
      {
        label: "Conversion Rate",
        value: `${stats.conversionRate.toFixed(1)}%`,
        sparkData: new Array(30).fill(0),
        sparkColor: "#eab308",
        change: null,
        icon: <Check size={14} />,
      },
    ];
  }, [stats]);

  const { copy, copied } = useCopyText();

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <Topbar title="Leads" />

      <div style={{ flex: 1, overflowY: "auto" }}>
        <div
          style={{
            maxWidth: selectedLeadId ? "none" : 1280,
            width: "100%",
            margin: "0 auto",
            padding: selectedLeadId ? "24px 0 24px 24px" : "24px",
            display: "flex",
            gap: 20,
          }}
        >
          {/* Main content */}
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 20 }}>

            {/* Stats Bar */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
              {isStatsLoading || !statCards
                ? Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      style={{
                        backgroundColor: "var(--bg-surface)",
                        border: "1px solid var(--border-default)",
                        borderRadius: 12,
                        padding: 16,
                        height: 90,
                      }}
                    >
                      <Skeleton w="60%" h={12} r={4} />
                      <div style={{ marginTop: 8 }}>
                        <Skeleton w="40%" h={24} r={4} />
                      </div>
                    </div>
                  ))
                : statCards.map((card) => (
                    <div
                      key={card.label}
                      style={{
                        backgroundColor: "var(--bg-surface)",
                        border: "1px solid var(--border-default)",
                        borderRadius: 12,
                        padding: 16,
                        height: 90,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: 11,
                            color: "var(--text-muted)",
                            fontWeight: 500,
                            letterSpacing: "0.02em",
                            textTransform: "uppercase",
                            marginBottom: 4,
                            display: "flex",
                            alignItems: "center",
                            gap: 5,
                          }}
                        >
                          <span style={{ color: "var(--text-muted)" }}>{card.icon}</span>
                          {card.label}
                        </div>
                        <div
                          style={{
                            fontSize: 28,
                            fontWeight: 700,
                            color: "var(--text-primary)",
                            lineHeight: 1,
                            letterSpacing: "-0.02em",
                          }}
                        >
                          {card.value}
                        </div>
                        {card.change !== null && (
                          <div
                            style={{
                              fontSize: 11,
                              marginTop: 3,
                              color: card.change >= 0 ? "#22c55e" : "#ef4444",
                              display: "flex",
                              alignItems: "center",
                              gap: 3,
                            }}
                          >
                            {card.change >= 0 ? (
                              <ArrowUp size={10} />
                            ) : (
                              <ArrowDown size={10} />
                            )}
                            {Math.abs(card.change)}% vs last period
                          </div>
                        )}
                      </div>
                      <Sparkline data={card.sparkData} color={card.sparkColor} />
                    </div>
                  ))}
            </div>

            {/* Toolbar */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              {/* Search */}
              <div style={{ position: "relative", width: 360, flexShrink: 0 }}>
                <Search
                  size={14}
                  style={{
                    position: "absolute",
                    left: 10,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--text-muted)",
                    pointerEvents: "none",
                  }}
                />
                <input
                  value={filters.search}
                  onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                  placeholder="Search name, email, phone…"
                  style={{
                    width: "100%",
                    height: 36,
                    borderRadius: 8,
                    backgroundColor: "var(--bg-elevated)",
                    border: "1px solid var(--border-subtle)",
                    paddingLeft: 32,
                    paddingRight: 12,
                    fontSize: 13,
                    color: "var(--text-primary)",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {/* Funnel Dropdown */}
              <div style={{ position: "relative" }}>
                <button
                  onClick={() => setFunnelDropdownOpen((o) => !o)}
                  style={{
                    height: 36,
                    paddingInline: 12,
                    borderRadius: 8,
                    backgroundColor: "var(--bg-elevated)",
                    border: "1px solid var(--border-subtle)",
                    color: filters.funnelId ? "var(--text-primary)" : "var(--text-secondary)",
                    fontSize: 13,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    whiteSpace: "nowrap",
                  }}
                >
                  <Filter size={13} />
                  {filters.funnelId
                    ? funnelsList.find((f) => f.id === filters.funnelId)?.title ?? "Funnel"
                    : "All Funnels"}
                  <ChevronDown size={12} />
                </button>
                {funnelDropdownOpen && (
                  <>
                    <div
                      style={{ position: "fixed", inset: 0, zIndex: 40 }}
                      onClick={() => setFunnelDropdownOpen(false)}
                    />
                    <div
                      style={{
                        position: "absolute",
                        top: "calc(100% + 4px)",
                        left: 0,
                        zIndex: 50,
                        backgroundColor: "var(--bg-elevated)",
                        border: "1px solid var(--border-default)",
                        borderRadius: 8,
                        padding: 4,
                        minWidth: 200,
                        boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                      }}
                    >
                      {[{ id: "", title: "All Funnels" }, ...funnelsList].map((f) => (
                        <button
                          key={f.id}
                          onClick={() => {
                            setFilters((prev) => ({ ...prev, funnelId: f.id }));
                            setFunnelDropdownOpen(false);
                          }}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            width: "100%",
                            padding: "7px 10px",
                            borderRadius: 6,
                            backgroundColor:
                              filters.funnelId === f.id ? "rgba(255,255,255,0.06)" : "transparent",
                            border: "none",
                            color:
                              filters.funnelId === f.id ? "var(--text-primary)" : "var(--text-secondary)",
                            fontSize: 13,
                            cursor: "pointer",
                            textAlign: "left",
                          }}
                        >
                          {filters.funnelId === f.id && <Check size={12} style={{ color: "var(--accent-blue)" }} />}
                          <span style={{ marginLeft: filters.funnelId === f.id ? 0 : 20 }}>{f.title}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Status Multi-select */}
              <div style={{ position: "relative" }}>
                <button
                  onClick={() => setStatusDropdownOpen((o) => !o)}
                  style={{
                    height: 36,
                    paddingInline: 12,
                    borderRadius: 8,
                    backgroundColor:
                      filters.statuses.length > 0 ? "rgba(59,130,246,0.1)" : "var(--bg-elevated)",
                    border: `1px solid ${filters.statuses.length > 0 ? "rgba(59,130,246,0.4)" : "var(--border-subtle)"}`,
                    color: filters.statuses.length > 0 ? "var(--accent-blue)" : "var(--text-secondary)",
                    fontSize: 13,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    whiteSpace: "nowrap",
                  }}
                >
                  {filters.statuses.length > 0 ? `Status: ${filters.statuses.length}` : "Status"}
                  <ChevronDown size={12} />
                </button>
                {statusDropdownOpen && (
                  <>
                    <div
                      style={{ position: "fixed", inset: 0, zIndex: 40 }}
                      onClick={() => setStatusDropdownOpen(false)}
                    />
                    <div
                      style={{
                        position: "absolute",
                        top: "calc(100% + 4px)",
                        left: 0,
                        zIndex: 50,
                        backgroundColor: "var(--bg-elevated)",
                        border: "1px solid var(--border-default)",
                        borderRadius: 8,
                        padding: 4,
                        minWidth: 180,
                        boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                      }}
                    >
                      {ALL_STATUSES.map((s) => {
                        const cfg = STATUS_CONFIG[s];
                        const checked = filters.statuses.includes(s);
                        return (
                          <button
                            key={s}
                            onClick={() => {
                              setFilters((prev) => ({
                                ...prev,
                                statuses: checked
                                  ? prev.statuses.filter((x) => x !== s)
                                  : [...prev.statuses, s],
                              }));
                            }}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              width: "100%",
                              padding: "7px 10px",
                              borderRadius: 6,
                              backgroundColor: checked ? "rgba(255,255,255,0.06)" : "transparent",
                              border: "none",
                              color: "var(--text-primary)",
                              fontSize: 13,
                              cursor: "pointer",
                              textAlign: "left",
                            }}
                          >
                            <div
                              style={{
                                width: 14,
                                height: 14,
                                borderRadius: 3,
                                border: `1px solid ${checked ? cfg.color : "var(--border-default)"}`,
                                backgroundColor: checked ? cfg.bg : "transparent",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                              }}
                            >
                              {checked && <Check size={9} style={{ color: cfg.color }} />}
                            </div>
                            <span
                              style={{
                                width: 7,
                                height: 7,
                                borderRadius: "50%",
                                backgroundColor: cfg.dot,
                                flexShrink: 0,
                              }}
                            />
                            {cfg.label}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>

              {/* Date Range */}
              <select
                value={filters.dateRange}
                onChange={(e) => setFilters((f) => ({ ...f, dateRange: e.target.value }))}
                style={{
                  height: 36,
                  paddingInline: 10,
                  borderRadius: 8,
                  backgroundColor: "var(--bg-elevated)",
                  border: "1px solid var(--border-subtle)",
                  color: "var(--text-secondary)",
                  fontSize: 13,
                  cursor: "pointer",
                  outline: "none",
                }}
              >
                {DATE_RANGE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>

              {/* Spacer */}
              <div style={{ flex: 1 }} />

              {/* Bulk Actions */}
              {selectedLeadIds.length > 0 && (
                <div style={{ position: "relative" }}>
                  <button
                    onClick={() => setBulkDropdownOpen((o) => !o)}
                    style={{
                      height: 36,
                      paddingInline: 12,
                      borderRadius: 8,
                      backgroundColor: "rgba(59,130,246,0.15)",
                      border: "1px solid rgba(59,130,246,0.35)",
                      color: "var(--accent-blue)",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    {selectedLeadIds.length} selected
                    <ChevronDown size={12} />
                  </button>
                  {bulkDropdownOpen && (
                    <>
                      <div
                        style={{ position: "fixed", inset: 0, zIndex: 40 }}
                        onClick={() => setBulkDropdownOpen(false)}
                      />
                      <div
                        style={{
                          position: "absolute",
                          top: "calc(100% + 4px)",
                          right: 0,
                          zIndex: 50,
                          backgroundColor: "var(--bg-elevated)",
                          border: "1px solid var(--border-default)",
                          borderRadius: 8,
                          padding: 4,
                          minWidth: 200,
                          boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                        }}
                      >
                        <div
                          style={{
                            padding: "4px 10px 6px",
                            fontSize: 10,
                            fontWeight: 600,
                            color: "var(--text-muted)",
                            textTransform: "uppercase",
                            letterSpacing: "0.06em",
                          }}
                        >
                          Set Status
                        </div>
                        {ALL_STATUSES.map((s) => (
                          <button
                            key={s}
                            onClick={() => handleBulkAction("status", s)}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              width: "100%",
                              padding: "7px 10px",
                              borderRadius: 6,
                              backgroundColor: "transparent",
                              border: "none",
                              color: "var(--text-primary)",
                              fontSize: 13,
                              cursor: "pointer",
                              textAlign: "left",
                            }}
                          >
                            <span
                              style={{
                                width: 7,
                                height: 7,
                                borderRadius: "50%",
                                backgroundColor: STATUS_CONFIG[s].dot,
                              }}
                            />
                            {STATUS_CONFIG[s].label}
                          </button>
                        ))}
                        <div
                          style={{
                            height: 1,
                            backgroundColor: "var(--border-subtle)",
                            margin: "4px 0",
                          }}
                        />
                        <button
                          onClick={() => {
                            const tag = prompt("Tag to add:");
                            if (tag?.trim()) handleBulkAction("tag", tag.trim());
                          }}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            width: "100%",
                            padding: "7px 10px",
                            borderRadius: 6,
                            backgroundColor: "transparent",
                            border: "none",
                            color: "var(--text-primary)",
                            fontSize: 13,
                            cursor: "pointer",
                            textAlign: "left",
                          }}
                        >
                          <Tag size={13} style={{ color: "var(--text-muted)" }} />
                          Add Tag
                        </button>
                        <button
                          onClick={() => handleBulkAction("delete")}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            width: "100%",
                            padding: "7px 10px",
                            borderRadius: 6,
                            backgroundColor: "transparent",
                            border: "none",
                            color: "#ef4444",
                            fontSize: 13,
                            cursor: "pointer",
                            textAlign: "left",
                          }}
                        >
                          <Trash2 size={13} />
                          Delete Selected
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Export */}
              <button
                onClick={handleExport}
                style={{
                  height: 36,
                  paddingInline: 12,
                  borderRadius: 8,
                  backgroundColor: "var(--bg-elevated)",
                  border: "1px solid var(--border-subtle)",
                  color: "var(--text-secondary)",
                  fontSize: 13,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Download size={13} />
                Export CSV
              </button>
            </div>

            {/* Table */}
            <div
              style={{
                backgroundColor: "var(--bg-surface)",
                border: "1px solid var(--border-default)",
                borderRadius: 12,
                overflow: "hidden",
              }}
            >
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr
                      style={{
                        backgroundColor: "var(--bg-elevated)",
                        borderBottom: "1px solid var(--border-default)",
                      }}
                    >
                      {/* Checkbox */}
                      <th style={{ width: 44, padding: "0 0 0 16px" }}>
                        <input
                          type="checkbox"
                          checked={allSelected}
                          onChange={toggleSelectAll}
                          style={{ cursor: "pointer", accentColor: "var(--accent-blue)" }}
                        />
                      </th>
                      {[
                        { key: "name", label: "Name", sortable: true, width: "auto" },
                        { key: "email", label: "Email", sortable: true, width: 220 },
                        { key: "phone", label: "Phone", sortable: false, width: 140 },
                        { key: "funnelId", label: "Funnel", sortable: false, width: 160 },
                        { key: "status", label: "Status", sortable: true, width: 120 },
                        { key: "tags", label: "Tags", sortable: false, width: 160 },
                        { key: "submittedAt", label: "Date", sortable: true, width: 130 },
                      ].map((col) => (
                        <th
                          key={col.key}
                          style={{
                            padding: "10px 12px",
                            textAlign: "left",
                            fontSize: 11,
                            fontWeight: 600,
                            color: "var(--text-muted)",
                            textTransform: "uppercase",
                            letterSpacing: "0.06em",
                            width: col.width === "auto" ? undefined : col.width,
                            whiteSpace: "nowrap",
                            cursor: col.sortable ? "pointer" : "default",
                            userSelect: "none",
                          }}
                          onClick={() =>
                            col.sortable &&
                            toggleSort(col.key as SortState["sortBy"])
                          }
                        >
                          <span style={{ display: "inline-flex", alignItems: "center" }}>
                            {col.label}
                            {col.sortable && (
                              <SortIcon field={col.key as SortState["sortBy"]} />
                            )}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading
                      ? Array.from({ length: 8 }).map((_, i) => (
                          <tr
                            key={i}
                            style={{
                              borderBottom: "1px solid var(--border-subtle)",
                              height: 56,
                            }}
                          >
                            <td style={{ padding: "0 0 0 16px" }}>
                              <Skeleton w={14} h={14} r={3} />
                            </td>
                            <td style={{ padding: "0 12px" }}>
                              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                <Skeleton w={120} h={12} r={3} />
                                <Skeleton w={80} h={10} r={3} />
                              </div>
                            </td>
                            <td style={{ padding: "0 12px" }}>
                              <Skeleton w={160} h={12} r={3} />
                            </td>
                            <td style={{ padding: "0 12px" }}>
                              <Skeleton w={100} h={12} r={3} />
                            </td>
                            <td style={{ padding: "0 12px" }}>
                              <Skeleton w={100} h={12} r={3} />
                            </td>
                            <td style={{ padding: "0 12px" }}>
                              <Skeleton w={70} h={20} r={10} />
                            </td>
                            <td style={{ padding: "0 12px" }}>
                              <Skeleton w={80} h={20} r={10} />
                            </td>
                            <td style={{ padding: "0 12px" }}>
                              <Skeleton w={90} h={12} r={3} />
                            </td>
                          </tr>
                        ))
                      : leads.length === 0
                      ? (
                          <tr>
                            <td
                              colSpan={8}
                              style={{ textAlign: "center", padding: "64px 24px" }}
                            >
                              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                                <Inbox size={40} style={{ color: "var(--text-muted)" }} />
                                <div>
                                  <p
                                    style={{
                                      fontSize: 15,
                                      fontWeight: 600,
                                      color: "var(--text-primary)",
                                      margin: 0,
                                    }}
                                  >
                                    No leads yet
                                  </p>
                                  <p
                                    style={{
                                      fontSize: 13,
                                      color: "var(--text-muted)",
                                      margin: "4px 0 0",
                                    }}
                                  >
                                    {filters.search || filters.statuses.length > 0 || filters.funnelId
                                      ? "No leads match your current filters."
                                      : "Leads from your funnels will appear here."}
                                  </p>
                                </div>
                                {!filters.search && filters.statuses.length === 0 && !filters.funnelId && (
                                  <a
                                    href="/dashboard/funnels"
                                    style={{
                                      fontSize: 13,
                                      color: "var(--accent-blue)",
                                      textDecoration: "none",
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 5,
                                    }}
                                  >
                                    <ExternalLink size={13} />
                                    Go to Funnels
                                  </a>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      : leads.map((lead) => {
                          const isSelected = selectedLeadId === lead.id;
                          const isBulkSelected = selectedLeadIds.includes(lead.id);
                          return (
                            <tr
                              key={lead.id}
                              onClick={() => {
                                if (isSelected) {
                                  closeDetail();
                                } else {
                                  openDetail(lead);
                                }
                              }}
                              style={{
                                borderBottom: "1px solid var(--border-subtle)",
                                height: 56,
                                cursor: "pointer",
                                backgroundColor: isSelected
                                  ? "rgba(59,130,246,0.06)"
                                  : isBulkSelected
                                  ? "rgba(255,255,255,0.03)"
                                  : "transparent",
                                transition: "background-color 0.1s",
                                borderLeft: isSelected ? "3px solid var(--accent-blue)" : "3px solid transparent",
                              }}
                              onMouseEnter={(e) => {
                                if (!isSelected)
                                  (e.currentTarget as HTMLTableRowElement).style.backgroundColor =
                                    "rgba(255,255,255,0.02)";
                              }}
                              onMouseLeave={(e) => {
                                if (!isSelected)
                                  (e.currentTarget as HTMLTableRowElement).style.backgroundColor =
                                    isBulkSelected ? "rgba(255,255,255,0.03)" : "transparent";
                              }}
                            >
                              {/* Checkbox */}
                              <td
                                style={{ padding: "0 0 0 13px", width: 44 }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleSelectLead(lead.id);
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={isBulkSelected}
                                  onChange={() => toggleSelectLead(lead.id)}
                                  style={{ cursor: "pointer", accentColor: "var(--accent-blue)" }}
                                />
                              </td>

                              {/* Name */}
                              <td style={{ padding: "0 12px" }}>
                                <div>
                                  <div
                                    style={{
                                      fontSize: 13,
                                      fontWeight: 500,
                                      color: "var(--text-primary)",
                                      whiteSpace: "nowrap",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      maxWidth: 180,
                                    }}
                                  >
                                    {lead.name || (
                                      <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>
                                        Anonymous
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>

                              {/* Email */}
                              <td style={{ padding: "0 12px", maxWidth: 220 }}>
                                <span
                                  style={{
                                    fontSize: 13,
                                    color: lead.email ? "var(--text-secondary)" : "var(--text-muted)",
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    display: "block",
                                  }}
                                >
                                  {lead.email || "—"}
                                </span>
                              </td>

                              {/* Phone */}
                              <td style={{ padding: "0 12px" }}>
                                <span
                                  style={{
                                    fontSize: 13,
                                    color: lead.phone ? "var(--text-secondary)" : "var(--text-muted)",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {lead.phone || "—"}
                                </span>
                              </td>

                              {/* Funnel */}
                              <td style={{ padding: "0 12px", maxWidth: 160 }}>
                                <span
                                  style={{
                                    fontSize: 12,
                                    color: "var(--text-secondary)",
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    display: "block",
                                  }}
                                >
                                  {lead.funnel?.title || "—"}
                                </span>
                              </td>

                              {/* Status */}
                              <td style={{ padding: "0 12px" }}>
                                <StatusBadge status={lead.status} />
                              </td>

                              {/* Tags */}
                              <td style={{ padding: "0 12px", maxWidth: 160 }}>
                                <div style={{ display: "flex", gap: 4, flexWrap: "nowrap", overflow: "hidden" }}>
                                  {lead.tags.slice(0, 2).map((tag) => (
                                    <span
                                      key={tag}
                                      style={{
                                        fontSize: 11,
                                        padding: "2px 7px",
                                        borderRadius: 999,
                                        backgroundColor: "rgba(255,255,255,0.06)",
                                        color: "var(--text-secondary)",
                                        whiteSpace: "nowrap",
                                        border: "1px solid var(--border-subtle)",
                                      }}
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                  {lead.tags.length > 2 && (
                                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                                      +{lead.tags.length - 2}
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Date */}
                              <td style={{ padding: "0 12px" }}>
                                <span style={{ fontSize: 12, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                                  {formatDate(lead.submittedAt)}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {!isLoading && total > 0 && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 16px",
                    borderTop: "1px solid var(--border-subtle)",
                  }}
                >
                  <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
                    Showing {Math.min((page - 1) * limit + 1, total)}–{Math.min(page * limit, total)} of{" "}
                    {total.toLocaleString()} leads
                  </span>

                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {/* Per page */}
                    <select
                      value={limit}
                      onChange={(e) => setLimit(Number(e.target.value))}
                      style={{
                        height: 30,
                        paddingInline: 8,
                        borderRadius: 6,
                        backgroundColor: "var(--bg-elevated)",
                        border: "1px solid var(--border-subtle)",
                        color: "var(--text-secondary)",
                        fontSize: 12,
                        cursor: "pointer",
                        outline: "none",
                      }}
                    >
                      {[10, 25, 50, 100].map((n) => (
                        <option key={n} value={n}>
                          {n} / page
                        </option>
                      ))}
                    </select>

                    {/* Prev */}
                    <button
                      onClick={() => setPage((p) => Math.max(p - 1, 1))}
                      disabled={page <= 1}
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 6,
                        backgroundColor: "var(--bg-elevated)",
                        border: "1px solid var(--border-subtle)",
                        color: page <= 1 ? "var(--text-muted)" : "var(--text-secondary)",
                        cursor: page <= 1 ? "not-allowed" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        opacity: page <= 1 ? 0.5 : 1,
                      }}
                    >
                      <ChevronLeft size={14} />
                    </button>

                    {/* Page numbers */}
                    {Array.from({ length: Math.min(totalPages, 7) }).map((_, i) => {
                      let pageNum = i + 1;
                      if (totalPages > 7) {
                        if (page <= 4) {
                          pageNum = i + 1;
                        } else if (page >= totalPages - 3) {
                          pageNum = totalPages - 6 + i;
                        } else {
                          pageNum = page - 3 + i;
                        }
                      }
                      if (pageNum < 1 || pageNum > totalPages) return null;
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setPage(pageNum)}
                          style={{
                            width: 30,
                            height: 30,
                            borderRadius: 6,
                            backgroundColor:
                              page === pageNum ? "var(--accent-blue)" : "var(--bg-elevated)",
                            border: `1px solid ${page === pageNum ? "var(--accent-blue)" : "var(--border-subtle)"}`,
                            color: page === pageNum ? "#fff" : "var(--text-secondary)",
                            fontSize: 12,
                            fontWeight: page === pageNum ? 600 : 400,
                            cursor: "pointer",
                          }}
                        >
                          {pageNum}
                        </button>
                      );
                    })}

                    {/* Next */}
                    <button
                      onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                      disabled={page >= totalPages}
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 6,
                        backgroundColor: "var(--bg-elevated)",
                        border: "1px solid var(--border-subtle)",
                        color: page >= totalPages ? "var(--text-muted)" : "var(--text-secondary)",
                        cursor: page >= totalPages ? "not-allowed" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        opacity: page >= totalPages ? 0.5 : 1,
                      }}
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ─── Lead Detail Slide-Over ──────────────────────────────────────── */}
          {selectedLeadId && (
            <div
              style={{
                width: 320,
                flexShrink: 0,
                backgroundColor: "var(--bg-surface)",
                border: "1px solid var(--border-default)",
                borderRadius: 12,
                display: "flex",
                flexDirection: "column",
                height: "fit-content",
                maxHeight: "calc(100vh - 120px)",
                position: "sticky",
                top: 0,
                alignSelf: "flex-start",
                overflow: "hidden",
              }}
            >
              {isDetailLoading || !detailLead ? (
                <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <Skeleton w={140} h={16} />
                      <Skeleton w={100} h={12} />
                    </div>
                    <Skeleton w={28} h={28} r={6} />
                  </div>
                  <Skeleton w="100%" h={1} r={0} />
                  <Skeleton w="100%" h={32} r={6} />
                  <Skeleton w="100%" h={80} r={6} />
                  <Skeleton w="100%" h={60} r={6} />
                </div>
              ) : (
                <div style={{ overflowY: "auto", flex: 1 }}>
                  {/* Header */}
                  <div
                    style={{
                      padding: "16px 16px 12px",
                      borderBottom: "1px solid var(--border-subtle)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: 8,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 15,
                          fontWeight: 600,
                          color: "var(--text-primary)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {detailLead.name || "Anonymous Lead"}
                      </div>
                      {detailLead.email && (
                        <div
                          style={{
                            fontSize: 12,
                            color: "var(--text-muted)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            marginTop: 2,
                          }}
                        >
                          {detailLead.email}
                        </div>
                      )}
                      {/* Status inline select */}
                      <select
                        value={detailLead.status}
                        onChange={(e) => patchLead(detailLead.id, { status: e.target.value })}
                        style={{
                          marginTop: 8,
                          height: 28,
                          paddingInline: 8,
                          borderRadius: 6,
                          backgroundColor: STATUS_CONFIG[detailLead.status].bg,
                          border: `1px solid ${STATUS_CONFIG[detailLead.status].color}40`,
                          color: STATUS_CONFIG[detailLead.status].color,
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: "pointer",
                          outline: "none",
                        }}
                      >
                        {ALL_STATUSES.map((s) => (
                          <option key={s} value={s} style={{ backgroundColor: "var(--bg-elevated)", color: "var(--text-primary)" }}>
                            {STATUS_CONFIG[s].label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      onClick={closeDetail}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 6,
                        backgroundColor: "transparent",
                        border: "none",
                        color: "var(--text-muted)",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <X size={14} />
                    </button>
                  </div>

                  {/* Content */}
                  <div style={{ padding: "0 0 16px" }}>

                    {/* Contact Info */}
                    <DetailSection label="Contact">
                      {detailLead.email && (
                        <ContactRow
                          label="Email"
                          value={detailLead.email}
                          onCopy={() => copy(detailLead.email!, "email")}
                          copied={copied === "email"}
                        />
                      )}
                      {detailLead.phone && (
                        <ContactRow
                          label="Phone"
                          value={detailLead.phone}
                          onCopy={() => copy(detailLead.phone!, "phone")}
                          copied={copied === "phone"}
                        />
                      )}
                      {!detailLead.email && !detailLead.phone && (
                        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>No contact info</span>
                      )}
                    </DetailSection>

                    {/* Funnel */}
                    {detailLead.funnel && (
                      <DetailSection label="Funnel">
                        <a
                          href={`/dashboard/funnels/${detailLead.funnel.id}`}
                          style={{
                            fontSize: 13,
                            color: "var(--accent-blue)",
                            textDecoration: "none",
                            display: "flex",
                            alignItems: "center",
                            gap: 5,
                          }}
                        >
                          <ExternalLink size={12} />
                          {detailLead.funnel.title}
                        </a>
                      </DetailSection>
                    )}

                    {/* Source Attribution (collapsible) */}
                    <div style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                      <button
                        onClick={() => setSourceExpanded((o) => !o)}
                        style={{
                          width: "100%",
                          padding: "10px 16px",
                          backgroundColor: "transparent",
                          border: "none",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          cursor: "pointer",
                          color: "var(--text-secondary)",
                        }}
                      >
                        <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                          Source / Attribution
                        </span>
                        <ChevronDown
                          size={13}
                          style={{
                            transform: sourceExpanded ? "rotate(180deg)" : "rotate(0deg)",
                            transition: "transform 0.15s",
                          }}
                        />
                      </button>
                      {sourceExpanded && (
                        <div style={{ padding: "0 16px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
                          {[
                            { label: "UTM Source", value: detailLead.utmSource },
                            { label: "UTM Medium", value: detailLead.utmMedium },
                            { label: "UTM Campaign", value: detailLead.utmCampaign },
                            { label: "UTM Content", value: detailLead.utmContent },
                            { label: "UTM Term", value: detailLead.utmTerm },
                            { label: "Referrer", value: detailLead.referrer },
                            { label: "IP Address", value: detailLead.ipAddress },
                            { label: "Page URL", value: detailLead.pageUrl },
                          ]
                            .filter((f) => f.value)
                            .map((f) => (
                              <div key={f.label}>
                                <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 1, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                                  {f.label}
                                </div>
                                <div
                                  style={{
                                    fontSize: 12,
                                    color: "var(--text-secondary)",
                                    wordBreak: "break-all",
                                  }}
                                >
                                  {f.value}
                                </div>
                              </div>
                            ))}
                          {!detailLead.utmSource && !detailLead.referrer && !detailLead.ipAddress && (
                            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>No attribution data</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Tags */}
                    <DetailSection label="Tags">
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                        {detailLead.tags.map((tag) => (
                          <span
                            key={tag}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              fontSize: 11,
                              padding: "3px 7px",
                              borderRadius: 999,
                              backgroundColor: "rgba(255,255,255,0.06)",
                              border: "1px solid var(--border-subtle)",
                              color: "var(--text-secondary)",
                            }}
                          >
                            {tag}
                            <button
                              onClick={() => removeTag(tag)}
                              style={{
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                padding: 0,
                                color: "var(--text-muted)",
                                display: "flex",
                                alignItems: "center",
                                lineHeight: 1,
                              }}
                            >
                              <X size={10} />
                            </button>
                          </span>
                        ))}
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <input
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && addTag()}
                          placeholder="Add tag…"
                          style={{
                            flex: 1,
                            height: 28,
                            borderRadius: 6,
                            backgroundColor: "var(--bg-elevated)",
                            border: "1px solid var(--border-subtle)",
                            paddingInline: 8,
                            fontSize: 12,
                            color: "var(--text-primary)",
                            outline: "none",
                          }}
                        />
                        <button
                          onClick={addTag}
                          disabled={!tagInput.trim()}
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 6,
                            backgroundColor: tagInput.trim() ? "var(--accent-blue)" : "var(--bg-elevated)",
                            border: "none",
                            color: tagInput.trim() ? "#fff" : "var(--text-muted)",
                            cursor: tagInput.trim() ? "pointer" : "not-allowed",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Plus size={13} />
                        </button>
                      </div>
                    </DetailSection>

                    {/* Notes */}
                    <DetailSection label={notesSaving ? "Notes (saving…)" : "Notes"}>
                      <textarea
                        value={notesValue}
                        onChange={(e) => handleNotesChange(e.target.value)}
                        placeholder="Add notes about this lead…"
                        rows={4}
                        style={{
                          width: "100%",
                          borderRadius: 8,
                          backgroundColor: "var(--bg-elevated)",
                          border: "1px solid var(--border-subtle)",
                          padding: 10,
                          fontSize: 13,
                          color: "var(--text-primary)",
                          outline: "none",
                          resize: "vertical",
                          boxSizing: "border-box",
                          lineHeight: 1.5,
                          fontFamily: "inherit",
                        }}
                      />
                    </DetailSection>

                    {/* Activity Timeline */}
                    {detailLead.events && detailLead.events.length > 0 && (
                      <DetailSection label="Activity">
                        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                          {detailLead.events.map((event, i) => (
                            <div
                              key={event.id}
                              style={{
                                display: "flex",
                                gap: 10,
                                paddingBottom: i < (detailLead.events?.length ?? 0) - 1 ? 14 : 0,
                                position: "relative",
                              }}
                            >
                              {/* Timeline line */}
                              {i < (detailLead.events?.length ?? 0) - 1 && (
                                <div
                                  style={{
                                    position: "absolute",
                                    left: 7,
                                    top: 16,
                                    bottom: 0,
                                    width: 1,
                                    backgroundColor: "var(--border-subtle)",
                                  }}
                                />
                              )}
                              {/* Dot */}
                              <div
                                style={{
                                  width: 14,
                                  height: 14,
                                  borderRadius: "50%",
                                  backgroundColor:
                                    event.type === "status_changed"
                                      ? "rgba(59,130,246,0.3)"
                                      : "rgba(255,255,255,0.1)",
                                  border: `1px solid ${
                                    event.type === "status_changed"
                                      ? "var(--accent-blue)"
                                      : "var(--border-default)"
                                  }`,
                                  flexShrink: 0,
                                  marginTop: 1,
                                  zIndex: 1,
                                }}
                              />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 12, color: "var(--text-primary)" }}>
                                  {event.description}
                                </div>
                                <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>
                                  {formatDateTime(event.createdAt)}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </DetailSection>
                    )}

                    {/* Submitted At */}
                    <div style={{ padding: "8px 16px", borderTop: "1px solid var(--border-subtle)" }}>
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                        Submitted {formatDateTime(detailLead.submittedAt)}
                      </span>
                    </div>

                    {/* Delete */}
                    <div style={{ padding: "8px 16px 0" }}>
                      <button
                        onClick={() => deleteLead(detailLead.id)}
                        style={{
                          width: "100%",
                          height: 34,
                          borderRadius: 8,
                          backgroundColor: "rgba(239,68,68,0.08)",
                          border: "1px solid rgba(239,68,68,0.25)",
                          color: "#ef4444",
                          fontSize: 13,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 6,
                          fontWeight: 500,
                        }}
                      >
                        <Trash2 size={13} />
                        Delete Lead
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function DetailSection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        padding: "12px 16px",
        borderBottom: "1px solid var(--border-subtle)",
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: "var(--text-muted)",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

function ContactRow({
  label,
  value,
  onCopy,
  copied,
}: {
  label: string;
  value: string;
  onCopy: () => void;
  copied: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 6,
        gap: 8,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
          {label}
        </div>
        <div
          style={{
            fontSize: 13,
            color: "var(--text-primary)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {value}
        </div>
      </div>
      <button
        onClick={onCopy}
        title={copied ? "Copied!" : `Copy ${label}`}
        style={{
          width: 26,
          height: 26,
          borderRadius: 5,
          backgroundColor: copied ? "rgba(34,197,94,0.12)" : "var(--bg-elevated)",
          border: `1px solid ${copied ? "rgba(34,197,94,0.3)" : "var(--border-subtle)"}`,
          color: copied ? "#22c55e" : "var(--text-muted)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          transition: "all 0.15s",
        }}
      >
        {copied ? <Check size={11} /> : <Copy size={11} />}
      </button>
    </div>
  );
}
