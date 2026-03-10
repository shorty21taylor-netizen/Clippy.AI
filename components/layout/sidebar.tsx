"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  Wand2,
  CalendarClock,
  Funnel,
  BarChart3,
  Settings,
  LogOut,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { useClerk } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import { WorkspaceSwitcher } from "@/components/layout/workspace-switcher";

const NAV_ITEMS = [
  { label: "Dashboard",       href: "/dashboard",                 icon: LayoutDashboard },
  { label: "Social Accounts", href: "/dashboard/social-accounts", icon: Users },
  { label: "Content Studio",  href: "/dashboard/content",         icon: Wand2 },
  { label: "Publisher",       href: "/dashboard/publish",         icon: CalendarClock },
  { label: "Funnels",         href: "/dashboard/funnels",         icon: Funnel },
  { label: "Analytics",       href: "/dashboard/analytics",       icon: BarChart3 },
];

export function Sidebar() {
  const [expanded, setExpanded] = useState(true);
  const pathname = usePathname();
  const { signOut } = useClerk();

  return (
    <motion.aside
      animate={{ width: expanded ? 220 : 64 }}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
      className="relative flex h-screen flex-col bg-[--bg-surface] overflow-hidden shrink-0"
      style={{ borderRight: "1px solid var(--border)" }}
    >
      {/* Logo / Brand */}
      <div className="flex h-14 items-center px-4 shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-7 w-7 rounded-[8px] bg-[--accent] flex items-center justify-center shrink-0 shadow-[0_2px_8px_rgba(0,113,227,0.30)]">
            <span className="text-white font-bold text-xs tracking-tight">C</span>
          </div>
          <AnimatePresence>
            {expanded && (
              <motion.span
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.15 }}
                className="font-semibold text-[15px] text-[--text-primary] tracking-[-0.02em] whitespace-nowrap"
              >
                Clippy.AI
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Workspace Switcher */}
      <div className="px-3 pt-3 pb-1">
        <WorkspaceSwitcher collapsed={!expanded} />
      </div>

      {/* Nav Items */}
      <nav className="flex-1 overflow-y-auto py-2">
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex items-center gap-[10px] mx-2 rounded-[var(--radius-sm)] px-3 py-2 mb-[1px]",
                "text-[14px] transition-all duration-150 cursor-pointer",
                isActive
                  ? "bg-[--accent-subtle] text-[--accent] font-medium"
                  : "text-[--text-secondary] font-normal hover:text-[--text-primary] hover:bg-[rgba(0,0,0,0.04)]"
              )}
            >
              {/* Active left-edge indicator bar */}
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-full bg-[--accent]" />
              )}

              <item.icon
                className={cn(
                  "shrink-0 transition-colors",
                  isActive ? "text-[--accent]" : "text-[--text-tertiary]"
                )}
                size={17}
              />
              <AnimatePresence>
                {expanded && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.12 }}
                    className="whitespace-nowrap"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          );
        })}
      </nav>

      {/* Bottom actions */}
      <div className="px-2 py-3 space-y-[1px]" style={{ borderTop: "1px solid var(--border)" }}>
        <Link
          href="/dashboard/settings"
          className="flex items-center gap-[10px] mx-0 rounded-[var(--radius-sm)] px-3 py-2 text-[14px] font-normal text-[--text-secondary] hover:text-[--text-primary] hover:bg-[rgba(0,0,0,0.04)] transition-all duration-150"
        >
          <Settings size={17} className="text-[--text-tertiary] shrink-0" />
          <AnimatePresence>
            {expanded && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="whitespace-nowrap"
              >
                Settings
              </motion.span>
            )}
          </AnimatePresence>
        </Link>

        <button
          onClick={() => signOut({ redirectUrl: "/sign-in" })}
          className="w-full flex items-center gap-[10px] rounded-[var(--radius-sm)] px-3 py-2 text-[14px] font-normal text-[--text-tertiary] hover:text-[#FF3B30] hover:bg-[rgba(255,59,48,0.06)] transition-all duration-150"
        >
          <LogOut size={17} className="shrink-0" />
          <AnimatePresence>
            {expanded && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="whitespace-nowrap"
              >
                Sign out
              </motion.span>
            )}
          </AnimatePresence>
        </button>

        {/* Collapse toggle */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="w-full flex items-center gap-[10px] rounded-[var(--radius-sm)] px-3 py-2 text-[--text-tertiary] hover:text-[--text-secondary] hover:bg-[rgba(0,0,0,0.04)] transition-all duration-150"
        >
          {expanded ? (
            <ChevronsLeft size={15} className="shrink-0" />
          ) : (
            <ChevronsRight size={15} className="shrink-0" />
          )}
          <AnimatePresence>
            {expanded && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="whitespace-nowrap text-[12px]"
              >
                Collapse
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </motion.aside>
  );
}
