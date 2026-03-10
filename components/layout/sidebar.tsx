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
  Scissors,
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
  { label: "Clip Finder",     href: "/dashboard/clips",           icon: Scissors },
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
      animate={{ width: expanded ? 240 : 64 }}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
      className="relative flex h-screen flex-col bg-[--bg-surface] overflow-hidden shrink-0 z-40"
      style={{ borderRight: "1px solid var(--border-subtle)" }}
    >
      {/* Logo / Brand */}
      <div
        className="flex h-14 items-center px-4 shrink-0"
        style={{ borderBottom: "1px solid var(--border-subtle)" }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Gradient logo mark */}
          <div
            className="h-8 w-8 rounded-[10px] flex items-center justify-center shrink-0"
            style={{ background: "var(--gradient-primary)" }}
          >
            <span className="text-white font-bold text-sm tracking-tight select-none">C</span>
          </div>
          <AnimatePresence>
            {expanded && (
              <motion.span
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.15 }}
                className="font-bold text-[15px] text-[--text-primary] tracking-[-0.025em] whitespace-nowrap"
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
      <nav className="flex-1 overflow-y-auto px-[10px] py-3">
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex items-center gap-[10px] rounded-[var(--radius-md)] px-[10px] py-2 mb-[1px]",
                "text-[14px] transition-all duration-200 cursor-pointer select-none",
                isActive
                  ? "font-medium text-[#4F46E5]"
                  : "font-normal text-[--text-secondary] hover:text-[--text-primary] hover:bg-[--bg-subtle]"
              )}
              style={isActive ? {
                background: "linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(59,130,246,0.08) 100%)",
                border: "1px solid rgba(99,102,241,0.15)",
              } : {}}
            >
              {/* Gradient left accent bar on active */}
              {isActive && (
                <span
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full"
                  style={{ background: "var(--gradient-primary)" }}
                />
              )}

              <item.icon
                size={17}
                className={cn(
                  "shrink-0 transition-all duration-150",
                  isActive ? "opacity-100" : "opacity-60"
                )}
                style={{ color: isActive ? "#4F46E5" : undefined }}
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
      <div
        className="px-[10px] py-3 space-y-[1px]"
        style={{ borderTop: "1px solid var(--border-subtle)" }}
      >
        <Link
          href="/dashboard/settings"
          className="flex items-center gap-[10px] rounded-[var(--radius-md)] px-[10px] py-2 text-[14px] font-normal text-[--text-secondary] hover:text-[--text-primary] hover:bg-[--bg-subtle] transition-all duration-150 cursor-pointer"
        >
          <Settings size={17} className="opacity-60 shrink-0" />
          <AnimatePresence>
            {expanded && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="whitespace-nowrap">
                Settings
              </motion.span>
            )}
          </AnimatePresence>
        </Link>

        <button
          onClick={() => signOut({ redirectUrl: "/sign-in" })}
          className="w-full flex items-center gap-[10px] rounded-[var(--radius-md)] px-[10px] py-2 text-[14px] font-normal text-[--text-secondary] hover:text-[--accent-rose] hover:bg-[--accent-rose-light] transition-all duration-150 cursor-pointer"
        >
          <LogOut size={17} className="opacity-60 shrink-0" />
          <AnimatePresence>
            {expanded && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="whitespace-nowrap">
                Sign out
              </motion.span>
            )}
          </AnimatePresence>
        </button>

        <button
          onClick={() => setExpanded((v) => !v)}
          className="w-full flex items-center gap-[10px] rounded-[var(--radius-md)] px-[10px] py-2 text-[14px] text-[--text-tertiary] hover:text-[--text-secondary] hover:bg-[--bg-subtle] transition-all duration-150 cursor-pointer"
        >
          {expanded ? <ChevronsLeft size={15} className="shrink-0" /> : <ChevronsRight size={15} className="shrink-0" />}
          <AnimatePresence>
            {expanded && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="whitespace-nowrap text-[12px]">
                Collapse
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </motion.aside>
  );
}
