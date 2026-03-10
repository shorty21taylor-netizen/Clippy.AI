"use client";

import React, { useState, KeyboardEvent } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  label?: string;
  className?: string;
}

export function TagInput({
  value,
  onChange,
  placeholder = "Add tag…",
  label,
  className,
}: TagInputProps) {
  const [input, setInput] = useState("");

  const addTag = () => {
    const tag = input.trim().toLowerCase();
    if (tag && !value.includes(tag)) {
      onChange([...value, tag]);
    }
    setInput("");
  };

  const removeTag = (tag: string) => {
    onChange(value.filter((t) => t !== tag));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag();
    } else if (e.key === "Backspace" && !input && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <span className="text-xs font-medium text-[--text-secondary] uppercase tracking-wide">
          {label}
        </span>
      )}
      <div
        className={cn(
          "min-h-10 w-full rounded-[--radius-md] bg-[--bg-input] px-2 py-1.5",
          "border border-[--border-subtle] transition-colors duration-150",
          "flex flex-wrap gap-1.5 focus-within:border-[--accent]"
        )}
      >
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full bg-[--accent-muted] border border-[--accent]/20 px-2.5 py-0.5 text-xs text-[--accent] font-medium"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="text-[--accent]/60 hover:text-[--accent] transition-colors"
            >
              <X size={10} />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={addTag}
          placeholder={value.length === 0 ? placeholder : ""}
          className="flex-1 min-w-[80px] bg-transparent text-sm text-[--text-primary] placeholder:text-[--text-placeholder] outline-none py-0.5 px-1.5"
        />
      </div>
      <p className="text-[11px] text-[--text-tertiary]">
        Press Enter or comma to add tags
      </p>
    </div>
  );
}
