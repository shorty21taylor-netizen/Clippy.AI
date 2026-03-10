import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, type, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-[13px] font-semibold text-[--text-secondary] block tracking-[-0.01em]"
          >
            {label}
          </label>
        )}
        <input
          id={inputId}
          type={type}
          ref={ref}
          className={cn(
            "h-[48px] w-full rounded-[var(--radius-md)] bg-[--bg-surface] px-[16px]",
            "text-[15px] text-[--text-primary]",
            "border border-[--border-default] transition-all duration-200",
            "placeholder:text-[--text-placeholder]",
            "focus:outline-none focus:border-[--accent-indigo]",
            "focus:shadow-[0_0_0_4px_rgba(99,102,241,0.12)]",
            "disabled:opacity-40 disabled:cursor-not-allowed",
            "shadow-[var(--shadow-sm)]",
            error && "border-[--status-error] focus:shadow-[0_0_0_4px_rgba(255,59,48,0.12)]",
            className
          )}
          {...props}
        />
        {error && (
          <p className="text-[12px] text-[--status-error]">{error}</p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };
