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
            className="text-[13px] font-medium text-[--text-secondary] block"
          >
            {label}
          </label>
        )}
        <input
          id={inputId}
          type={type}
          ref={ref}
          className={cn(
            "h-[48px] w-full rounded-[var(--radius-md)] bg-[--bg-input] px-[16px]",
            "text-[15px] text-[--text-primary]",
            "border border-[--border-medium] transition-all duration-200",
            "placeholder:text-[--text-placeholder]",
            "focus:outline-none focus:border-[--accent]",
            "focus:shadow-[0_0_0_4px_rgba(0,113,227,0.12)]",
            "disabled:opacity-40 disabled:cursor-not-allowed",
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
