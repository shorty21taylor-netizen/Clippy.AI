import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] px-2.5 py-[3px] text-[11px] font-semibold tracking-[0.01em] transition-colors",
  {
    variants: {
      variant: {
        default:     "bg-[--bg-subtle] text-[--text-secondary] border border-[--border-default]",
        success:     "bg-[rgba(16,185,129,0.10)] text-[#059669] border border-[rgba(16,185,129,0.20)]",
        warning:     "bg-[rgba(245,158,11,0.10)] text-[#D97706] border border-[rgba(245,158,11,0.20)]",
        error:       "bg-[rgba(255,59,48,0.10)] text-[--status-error] border border-[rgba(255,59,48,0.20)]",
        pending:     "bg-[rgba(99,102,241,0.10)] text-[--accent-indigo] border border-[rgba(99,102,241,0.20)]",
        accent:      "bg-[rgba(99,102,241,0.10)] text-[--accent-indigo] border border-[rgba(99,102,241,0.20)]",
        blue:        "bg-[--accent-blue-light] text-[--accent-blue] border border-[--accent-blue-border]",
        violet:      "bg-[--accent-violet-light] text-[--accent-violet] border border-[--accent-violet-border]",
        emerald:     "bg-[--accent-emerald-light] text-[--accent-emerald] border border-[--accent-emerald-border]",
        amber:       "bg-[--accent-amber-light] text-[--accent-amber] border border-[--accent-amber-border]",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

function Badge({ className, variant, dot, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && (
        <span
          className="inline-block h-[6px] w-[6px] rounded-full shrink-0"
          style={{
            background:
              variant === "success"
                ? "#10B981"
                : variant === "warning"
                ? "#F59E0B"
                : variant === "error"
                ? "var(--status-error)"
                : "currentColor",
          }}
        />
      )}
      {children}
    </span>
  );
}

export { Badge, badgeVariants };
