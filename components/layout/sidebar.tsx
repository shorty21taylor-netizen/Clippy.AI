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
  ChevronRight,
  Settings,
  LogOut,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { useClerk } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import { WorkspaceSwitcher } from "@/components/layout/workspace-switcher";

const NAV_ITEMS = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Social Accounts",
    href: "/dashboard/social-accounts",
    icon: Users,
  },
  {
    label: "Content Studio",
    href: "/dashboard/content",
    icon: Wand2,
  },
  {
    label: "Publisher",
    href: "/dashboard/publish",
    icon: CalendarClock,
  },
  {
    label: "Funnels",
    href: "/dashboard/funnels",
    icon: Funnel,
  },
  {
    label: "Analytics",
    href: "/dashboard/analytics",
    icon: BarChart3,
  },
];

export function Sidebar() {
  const [expanded, setExpanded] = useState(true);
  const pathname = usePathname();
  const { signOut } = useClerk();

  return (
    <motion.aside
      animate={{ width: expanded ? 220 : 64 }}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
      className="relative flex h-screen flex-col border-r border-[--border-subtle] bg-[--bg-card] overflow-hidden shrink-0"
    >
      {/* Logo / Brand */}
      <div className="flex h-14 items-center border-b border-[--border-subtle] px-4 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-7 w-7 rounded-[8px] bg-[--accent] flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-xs">C</span>
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
      <div className="px-2 pt-3 pb-1">
        <WorkspaceSwitcher collapsed={!expanded} />
      </div>

      {/* Nav Items */}
      <nav className="flex-1 overflow-y-auto px-2 py-2">
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-[--radius-md] px-3 py-2.5 mb-0.5",
                "text-sm font-medium transition-all duration-150",
                "hover:bg-[rgba(255,255,255,0.04)]",
                isActive
                  ? "bg-[--accent-muted] text-[--accent]"
                  : "text-[--text-secondary] hover:text-[--text-primary]"
              )}
            >
              <item.icon
                className={cn(
                  "shrink-0 transition-colors",
                  isActive ? "text-[--accent]" : "text-[--text-tertiary]"
                )}
                size={18}
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
              {isActive && expanded && (
                <ChevronRight
                  size={14}
                  className="ml-auto text-[--accent] opacity-60"
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom actions */}
      <div className="border-t border-[--border-subtle] px-2 py-3 space-y-0.5">
        <Link
          href="/dashboard/settings"
          className="flex items-center gap-3 rounded-[--radius-md] px-3 py-2.5 text-sm font-medium text-[--text-secondary] hover:text-[--text-primary] hover:bg-[rgba(255,255,255,0.04)] transition-all duration-150"
        >
          <Settings size={18} className="text-[--text-tertiary] shrink-0" />
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
          className="w-full flex items-center gap-3 rounded-[--radius-md] px-3 py-2.5 text-sm font-medium text-[--text-secondary] hover:text-[--status-error] hover:bg-[--status-error-muted] transition-all duration-150"
        >
          <LogOut size={18} className="shrink-0" />
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
          className="w-full flex items-center gap-3 rounded-[--radius-md] px-3 py-2.5 text-[--text-tertiary] hover:text-[--text-secondary] hover:bg-[rgba(255,255,255,0.04)] transition-all duration-150"
        >
          {expanded ? (
            <ChevronsLeft size={16} className="shrink-0" />
          ) : (
            <ChevronsRight size={16} className="shrink-0" />
          )}
          <AnimatePresence>
            {expanded && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="whitespace-nowrap text-xs"
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
