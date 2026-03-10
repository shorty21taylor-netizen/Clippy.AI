"use client";

import React from "react";
import { UserButton } from "@clerk/nextjs";
import { Bell } from "lucide-react";

interface TopbarProps {
  title?: string;
}

export function Topbar({ title }: TopbarProps) {
  return (
    <header className="h-12 flex items-center justify-between px-6 border-b border-[--border-subtle] bg-[--bg-card] shrink-0">
      {title && (
        <h1 className="text-[17px] font-semibold text-[--text-primary] tracking-[-0.02em]">
          {title}
        </h1>
      )}
      <div className="flex items-center gap-2 ml-auto">
        <button className="h-8 w-8 rounded-[var(--radius-md)] flex items-center justify-center text-[--text-tertiary] hover:text-[--text-secondary] hover:bg-[rgba(0,0,0,0.05)] transition-all duration-150">
          <Bell size={16} />
        </button>
        <UserButton
          appearance={{
            elements: {
              avatarBox: "h-7 w-7",
              userButtonPopoverCard:
                "bg-[--bg-modal] border border-[--border-subtle] shadow-[var(--shadow-dropdown)]",
            },
          }}
        />
      </div>
    </header>
  );
}
