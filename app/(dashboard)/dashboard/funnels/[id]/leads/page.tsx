"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, RefreshCw } from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { Button } from "@/components/ui/button";
import { LeadsTable, type Lead } from "@/components/funnels/leads-table";
import { useWorkspace } from "@/lib/workspace-context";

export default function LeadsDashboardPage() {
  const { id } = useParams<{ id: string }>();
  const { workspace } = useWorkspace();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [funnelName, setFunnelName] = useState("Funnel");
  const [funnelSlug, setFunnelSlug] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLeads = useCallback(async (silent = false) => {
    if (!workspace) return;
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const [leadsRes, funnelRes] = await Promise.all([
        fetch(`/api/funnels/${id}/leads?workspaceId=${workspace.id}`),
        fetch(`/api/funnels/${id}?workspaceId=${workspace.id}`),
      ]);
      if (leadsRes.ok) {
        const data = await leadsRes.json();
        setLeads(data.leads ?? []);
      }
      if (funnelRes.ok) {
        const data = await funnelRes.json();
        setFunnelName(data.funnel?.name ?? "Funnel");
        setFunnelSlug(data.funnel?.slug ?? "");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [workspace, id]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const handleDelete = async (leadId: string) => {
    if (!workspace) return;
    await fetch(`/api/funnels/${id}/leads/${leadId}?workspaceId=${workspace.id}`, {
      method: "DELETE",
    });
    setLeads((l) => l.filter((x) => x.id !== leadId));
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar title="Leads" />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[1100px] w-full mx-auto p-6 space-y-5">

          {/* Header */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <Link
                href={`/dashboard/funnels/${id}`}
                className="flex items-center gap-1.5 text-[--text-secondary] hover:text-[--text-primary] transition-colors text-sm"
              >
                <ArrowLeft size={14} />
                {funnelName}
              </Link>
              <span className="text-[--text-tertiary]">/</span>
              <h2 className="text-xl font-bold text-[--text-primary] tracking-[-0.02em]">
                Leads
              </h2>
            </div>
            <Button
              variant="secondary"
              size="md"
              onClick={() => fetchLeads(true)}
            >
              <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
              Refresh
            </Button>
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={24} className="animate-spin text-[--text-tertiary]" />
            </div>
          ) : (
            <LeadsTable
              leads={leads}
              funnelName={funnelName}
              onDelete={handleDelete}
            />
          )}
        </div>
      </div>
    </div>
  );
}
