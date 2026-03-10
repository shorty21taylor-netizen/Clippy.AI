"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  // Base styles
  "inline-flex items-center justify-center gap-2 font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--accent] disabled:pointer-events-none disabled:opacity-40 active:scale-[0.97] select-none cursor-pointer",
  {
    variants: {
      variant: {
        primary:
          "bg-[--accent] text-white hover:bg-[--accent-hover] shadow-sm",
        secondary:
          "bg-[--bg-elevated] text-[--text-primary] border border-[--border-default] hover:bg-[--bg-modal]",
        ghost:
          "text-[--text-secondary] hover:text-[--text-primary] hover:bg-[rgba(255,255,255,0.04)]",
        destructive:
          "bg-[rgba(255,69,58,0.12)] text-[--status-error] border border-[rgba(255,69,58,0.2)] hover:bg-[rgba(255,69,58,0.2)]",
        link: "text-[--accent] underline-offset-4 hover:underline p-0 h-auto",
      },
      size: {
        sm: "h-8 px-3 text-xs rounded-[--radius-sm]",
        md: "h-10 px-4 text-sm rounded-[--radius-md]",
        lg: "h-11 px-6 text-[15px] rounded-[--radius-md]",
        icon: "h-9 w-9 rounded-[--radius-sm]",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      >
        {loading && (
          <span className="h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
