"use client";

import React, { useState } from "react";
import { Download, Trash2, Mail, Phone, User, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface Lead {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  submittedAt: string;
}

interface LeadsTableProps {
  leads: Lead[];
  funnelName: string;
  onDelete: (id: string) => void;
}

function exportCSV(leads: Lead[], name: string) {
  const rows = [
    ["Name", "Email", "Phone", "Submitted At"],
    ...leads.map((l) => [
      l.name ?? "",
      l.email ?? "",
      l.phone ?? "",
      new Date(l.submittedAt).toISOString(),
    ]),
  ];
  const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name.toLowerCase().replace(/\s+/g, "-")}-leads.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function LeadsTable({ leads, funnelName, onDelete }: LeadsTableProps) {
  const [confirmId, setConfirmId] = useState<string | null>(null);

  if (leads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="text-4xl mb-3">📭</div>
        <p className="text-[--text-primary] font-semibold">No leads yet</p>
        <p className="text-sm text-[--text-secondary] mt-1">
          Publish your funnel and share the link to start capturing leads.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-[--text-secondary]">
          {leads.length} lead{leads.length !== 1 ? "s" : ""}
        </p>
        <Button variant="secondary" size="sm" onClick={() => exportCSV(leads, funnelName)}>
          <Download size={13} />
          Export CSV
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-[--radius-xl] bg-[--bg-card] border border-[--border-subtle] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[--border-subtle] bg-[--bg-elevated]">
              <th className="px-4 py-3 text-left text-[11px] font-semibold text-[--text-tertiary] uppercase tracking-wide">
                <User size={11} className="inline mr-1" />Name
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold text-[--text-tertiary] uppercase tracking-wide">
                <Mail size={11} className="inline mr-1" />Email
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold text-[--text-tertiary] uppercase tracking-wide hidden md:table-cell">
                <Phone size={11} className="inline mr-1" />Phone
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold text-[--text-tertiary] uppercase tracking-wide hidden sm:table-cell">
                <Clock size={11} className="inline mr-1" />Submitted
              </th>
              <th className="px-4 py-3 w-10" />
            </tr>
          </thead>
          <tbody>
            {leads.map((lead, i) => (
              <tr
                key={lead.id}
                className={`border-b border-[--border-subtle] last:border-0 hover:bg-[rgba(255,255,255,0.02)] transition-colors ${
                  i % 2 === 0 ? "" : "bg-[rgba(255,255,255,0.01)]"
                }`}
              >
                <td className="px-4 py-3 text-[--text-primary] font-medium">
                  {lead.name ?? <span className="text-[--text-tertiary] italic">—</span>}
                </td>
                <td className="px-4 py-3 text-[--text-secondary]">
                  {lead.email ? (
                    <a href={`mailto:${lead.email}`} className="hover:text-[--accent] transition-colors">
                      {lead.email}
                    </a>
                  ) : (
                    <span className="text-[--text-tertiary] italic">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-[--text-secondary] hidden md:table-cell">
                  {lead.phone ?? <span className="text-[--text-tertiary] italic">—</span>}
                </td>
                <td className="px-4 py-3 text-[--text-tertiary] text-xs hidden sm:table-cell">
                  {new Date(lead.submittedAt).toLocaleString("en-US", {
                    month: "short", day: "numeric", year: "numeric",
                    hour: "numeric", minute: "2-digit",
                  })}
                </td>
                <td className="px-4 py-3">
                  {confirmId === lead.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => { onDelete(lead.id); setConfirmId(null); }}
                        className="text-[10px] text-[--status-error] font-medium hover:underline"
                      >
                        Confirm
                      </button>
                      <span className="text-[--text-tertiary]">/</span>
                      <button
                        onClick={() => setConfirmId(null)}
                        className="text-[10px] text-[--text-secondary] hover:underline"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmId(lead.id)}
                      className="h-6 w-6 flex items-center justify-center rounded text-[--text-tertiary] hover:text-[--status-error] hover:bg-[--status-error-muted] transition-all"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
