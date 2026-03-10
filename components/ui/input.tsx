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
            className="text-xs font-medium text-[--text-secondary] uppercase tracking-wide"
          >
            {label}
          </label>
        )}
        <input
          id={inputId}
          type={type}
          ref={ref}
          className={cn(
            "h-10 w-full rounded-[--radius-md] bg-[--bg-input] px-3.5 text-sm text-[--text-primary]",
            "border border-[--border-subtle] transition-colors duration-150",
            "placeholder:text-[--text-placeholder]",
            "focus:outline-none focus:border-[--accent]",
            "disabled:opacity-40 disabled:cursor-not-allowed",
            error && "border-[--status-error]",
            className
          )}
          {...props}
        />
        {error && (
          <p className="text-xs text-[--status-error]">{error}</p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };
