"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PlatformIcon } from "@/components/social-accounts/platform-icon";
import { PostStatusBadge, type PostStatus } from "./status-badge";
import type { PublishLog } from "./queue-table";
import { cn } from "@/lib/utils";

interface CalendarViewProps {
  logs: PublishLog[];
  onSelectLog: (log: PublishLog) => void;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function CalendarView({ logs, onSelectLog }: CalendarViewProps) {
  const today = new Date();
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  // Build grid: 6 rows × 7 cols
  const cells: Array<{ date: Date | null; isCurrentMonth: boolean }> = [];
  // Fill leading days from prev month
  for (let i = firstDay - 1; i >= 0; i--) {
    cells.push({
      date: new Date(year, month - 1, daysInPrevMonth - i),
      isCurrentMonth: false,
    });
  }
  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: new Date(year, month, d), isCurrentMonth: true });
  }
  // Fill trailing days
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) {
    cells.push({ date: new Date(year, month + 1, d), isCurrentMonth: false });
  }

  // Index logs by date string YYYY-MM-DD
  const logsByDate: Record<string, PublishLog[]> = {};
  for (const log of logs) {
    if (!log.scheduledAt) continue;
    const key = log.scheduledAt.slice(0, 10); // "YYYY-MM-DD"
    if (!logsByDate[key]) logsByDate[key] = [];
    logsByDate[key].push(log);
  }

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  const todayStr = toDateKey(today);

  return (
    <div className="flex flex-col gap-4">
      {/* Month navigation */}
      <div className="flex items-center gap-3">
        <button
          onClick={prevMonth}
          className="h-8 w-8 rounded-[--radius-sm] flex items-center justify-center text-[--text-tertiary] hover:text-[--text-secondary] hover:bg-[rgba(255,255,255,0.05)] transition-all"
        >
          <ChevronLeft size={16} />
        </button>
        <h3 className="text-base font-semibold text-[--text-primary] min-w-[160px] text-center">
          {MONTHS[month]} {year}
        </h3>
        <button
          onClick={nextMonth}
          className="h-8 w-8 rounded-[--radius-sm] flex items-center justify-center text-[--text-tertiary] hover:text-[--text-secondary] hover:bg-[rgba(255,255,255,0.05)] transition-all"
        >
          <ChevronRight size={16} />
        </button>
        <button
          onClick={() => setViewDate(new Date(today.getFullYear(), today.getMonth(), 1))}
          className="ml-2 px-3 h-7 rounded-full text-xs font-medium text-[--text-secondary] hover:text-[--text-primary] hover:bg-[rgba(255,255,255,0.05)] transition-all border border-[--border-subtle]"
        >
          Today
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-px">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="py-2 text-center text-[11px] font-medium text-[--text-tertiary] uppercase tracking-wide"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-px bg-[--border-subtle] rounded-[--radius-lg] overflow-hidden border border-[--border-subtle]">
        {cells.map(({ date, isCurrentMonth }, idx) => {
          if (!date) return <div key={idx} className="bg-[--bg-card] min-h-[100px]" />;
          const key = toDateKey(date);
          const dayLogs = logsByDate[key] ?? [];
          const isToday = key === todayStr;
          const isPast = date < today && key !== todayStr;

          return (
            <div
              key={idx}
              className={cn(
                "bg-[--bg-card] min-h-[100px] p-2 flex flex-col gap-1",
                !isCurrentMonth && "opacity-40",
                isToday && "bg-[--accent-muted]"
              )}
            >
              {/* Day number */}
              <span
                className={cn(
                  "text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full",
                  isToday
                    ? "bg-[--accent] text-white"
                    : isPast && isCurrentMonth
                      ? "text-[--text-tertiary]"
                      : "text-[--text-secondary]"
                )}
              >
                {date.getDate()}
              </span>

              {/* Posts for this day */}
              <div className="flex flex-col gap-0.5 overflow-hidden">
                {dayLogs.slice(0, 3).map((log) => (
                  <motion.button
                    key={log.id}
                    whileHover={{ scale: 1.02 }}
                    onClick={() => onSelectLog(log)}
                    className="flex items-center gap-1 rounded px-1 py-0.5 bg-[--bg-elevated] border border-[--border-subtle] hover:border-[--accent]/30 hover:bg-[--accent-muted] transition-all text-left w-full overflow-hidden"
                  >
                    <PlatformIcon platform={log.socialAccount.platform} size={10} />
                    <span className="text-[10px] text-[--text-secondary] truncate flex-1">
                      @{log.socialAccount.username}
                    </span>
                    <span
                      className={cn(
                        "h-1.5 w-1.5 rounded-full shrink-0",
                        log.status === "SUCCESS"
                          ? "bg-[--status-success]"
                          : log.status === "FAILED"
                            ? "bg-[--status-error]"
                            : log.status === "IN_PROGRESS"
                              ? "bg-[--accent] animate-pulse"
                              : "bg-[--status-warning]"
                      )}
                    />
                  </motion.button>
                ))}
                {dayLogs.length > 3 && (
                  <span className="text-[10px] text-[--text-tertiary] pl-1">
                    +{dayLogs.length - 3} more
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 flex-wrap text-[11px] text-[--text-tertiary]">
        {[
          { color: "bg-[--status-warning]", label: "Scheduled" },
          { color: "bg-[--accent] animate-pulse", label: "Publishing" },
          { color: "bg-[--status-success]", label: "Posted" },
          { color: "bg-[--status-error]", label: "Failed" },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${color}`} />
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
