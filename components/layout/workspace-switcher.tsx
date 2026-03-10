"use client";

import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronDown, Plus, Building2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface Workspace {
  id: string;
  name: string;
  slug: string;
  role: string;
}

interface WorkspaceSwitcherProps {
  collapsed?: boolean;
}

export function WorkspaceSwitcher({ collapsed }: WorkspaceSwitcherProps) {
  const [open, setOpen] = useState(false);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [active, setActive] = useState<Workspace | null>(null);
  const router = useRouter();

  const fetchWorkspaces = useCallback(async () => {
    try {
      const res = await fetch("/api/workspaces");
      const data = await res.json();
      if (data.workspaces?.length) {
        setWorkspaces(data.workspaces);
        // Restore active workspace from localStorage or default to first
        const savedId = localStorage.getItem("activeWorkspaceId");
        const found = data.workspaces.find(
          (w: Workspace) => w.id === savedId
        );
        setActive(found ?? data.workspaces[0]);
      }
    } catch {
      // silently fail — user will see empty state
    }
  }, []);

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  const switchTo = (ws: Workspace) => {
    setActive(ws);
    localStorage.setItem("activeWorkspaceId", ws.id);
    setOpen(false);
    router.refresh();
  };

  if (collapsed) {
    return (
      <div className="flex justify-center">
        <div className="h-8 w-8 rounded-[8px] bg-[--bg-elevated] border border-[--border-subtle] flex items-center justify-center">
          <Building2 size={14} className="text-[--text-secondary]" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "w-full flex items-center gap-2.5 rounded-[--radius-md] px-3 py-2",
          "bg-[--bg-elevated] border border-[--border-subtle]",
          "hover:border-[--border-default] transition-all duration-150",
          "text-left"
        )}
      >
        <div className="h-6 w-6 rounded-[6px] bg-[--accent-muted] border border-[--accent]/20 flex items-center justify-center shrink-0">
          <span className="text-[--accent] text-[10px] font-bold uppercase">
            {active?.name?.[0] ?? "?"}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium text-[--text-primary] truncate">
            {active?.name ?? "Select workspace"}
          </p>
          <p className="text-[10px] text-[--text-tertiary] truncate capitalize">
            {active?.role?.toLowerCase() ?? ""}
          </p>
        </div>
        <ChevronDown
          size={14}
          className={cn(
            "text-[--text-tertiary] shrink-0 transition-transform duration-150",
            open && "rotate-180"
          )}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
            className="absolute top-full left-0 right-0 mt-1 z-50 rounded-[--radius-lg] bg-[--bg-modal] border border-[--border-default] shadow-[0_8px_32px_rgba(0,0,0,0.6)] overflow-hidden"
          >
            <div className="p-1">
              {workspaces.map((ws) => (
                <button
                  key={ws.id}
                  onClick={() => switchTo(ws)}
                  className="w-full flex items-center gap-2.5 rounded-[10px] px-3 py-2 hover:bg-[rgba(255,255,255,0.04)] transition-colors duration-100 text-left"
                >
                  <div className="h-6 w-6 rounded-[6px] bg-[--accent-muted] border border-[--accent]/20 flex items-center justify-center shrink-0">
                    <span className="text-[--accent] text-[10px] font-bold uppercase">
                      {ws.name[0]}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-[--text-primary] truncate">
                      {ws.name}
                    </p>
                    <p className="text-[10px] text-[--text-tertiary] truncate capitalize">
                      {ws.role.toLowerCase()}
                    </p>
                  </div>
                  {active?.id === ws.id && (
                    <Check size={13} className="text-[--accent] shrink-0" />
                  )}
                </button>
              ))}
            </div>

            <div className="border-t border-[--border-subtle] p-1">
              <button
                onClick={() => {
                  setOpen(false);
                  router.push("/onboarding");
                }}
                className="w-full flex items-center gap-2.5 rounded-[10px] px-3 py-2 hover:bg-[rgba(255,255,255,0.04)] transition-colors duration-100 text-left"
              >
                <div className="h-6 w-6 rounded-[6px] border border-dashed border-[--border-strong] flex items-center justify-center shrink-0">
                  <Plus size={12} className="text-[--text-tertiary]" />
                </div>
                <span className="text-[13px] text-[--text-secondary]">
                  New workspace
                </span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
