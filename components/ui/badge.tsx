import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors",
  {
    variants: {
      variant: {
        default:
          "bg-[--bg-elevated] text-[--text-secondary] border border-[--border-subtle]",
        success:
          "bg-[--status-success-muted] text-[--status-success]",
        warning:
          "bg-[--status-warning-muted] text-[--status-warning]",
        error:
          "bg-[--status-error-muted] text-[--status-error]",
        pending:
          "bg-[--status-pending-muted] text-[--status-pending]",
        accent:
          "bg-[--accent-muted] text-[--accent]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
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
