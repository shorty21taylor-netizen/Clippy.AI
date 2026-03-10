"use client";

import React from "react";
import { UserButton } from "@clerk/nextjs";
import { Bell } from "lucide-react";

interface TopbarProps {
  title?: string;
}

export function Topbar({ title }: TopbarProps) {
  return (
    <header
      className="h-14 flex items-center justify-between px-8 bg-[--bg-surface] shrink-0"
      style={{ borderBottom: "1px solid var(--border)" }}
    >
      {title && (
        <h1 className="text-[22px] font-bold text-[--text-primary] tracking-[-0.025em]">
          {title}
        </h1>
      )}
      <div className="flex items-center gap-2 ml-auto">
        <button
          className="h-8 w-8 rounded-[var(--radius-sm)] flex items-center justify-center text-[--text-tertiary] hover:text-[--text-secondary] hover:bg-[rgba(0,0,0,0.04)] transition-all duration-150 cursor-pointer"
        >
          <Bell size={16} />
        </button>
        <UserButton
          appearance={{
            elements: {
              avatarBox: "h-7 w-7",
              userButtonPopoverCard:
                "bg-[--bg-modal] shadow-[var(--shadow-dropdown)] rounded-[var(--radius-md)]",
            },
          }}
        />
      </div>
    </header>
  );
}
