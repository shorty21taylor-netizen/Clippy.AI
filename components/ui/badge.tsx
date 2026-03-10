import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-[var(--radius-pill)] px-3 py-1 text-[12px] font-medium transition-colors",
  {
    variants: {
      variant: {
        default:     "bg-[rgba(0,0,0,0.06)] text-[--text-secondary]",
        success:     "bg-[--status-success-muted] text-[--status-success]",
        warning:     "bg-[--status-warning-muted] text-[--status-warning]",
        error:       "bg-[--status-error-muted] text-[--status-error]",
        pending:     "bg-[--status-pending-muted] text-[--status-pending]",
        accent:      "bg-[--accent-subtle] text-[--accent]",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
