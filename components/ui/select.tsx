"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  placeholder?: string;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, placeholder, children, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs font-medium text-[--text-secondary] uppercase tracking-wide"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <select
            id={inputId}
            ref={ref}
            className={cn(
              "h-10 w-full appearance-none rounded-[--radius-md] bg-[--bg-input] px-3.5 pr-9 text-sm text-[--text-primary]",
              "border border-[--border-subtle] transition-colors duration-150",
              "focus:outline-none focus:border-[--accent]",
              "disabled:opacity-40 disabled:cursor-not-allowed",
              error && "border-[--status-error]",
              className
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {children}
          </select>
          <ChevronDown
            size={14}
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[--text-tertiary]"
          />
        </div>
        {error && <p className="text-xs text-[--status-error]">{error}</p>}
      </div>
    );
  }
);
Select.displayName = "Select";

export { Select };
