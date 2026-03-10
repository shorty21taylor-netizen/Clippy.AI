"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  // Base — pill shape, Apple weight, smooth transitions
  "inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--accent] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-40 active:scale-[0.97] select-none cursor-pointer",
  {
    variants: {
      variant: {
        // Primary CTA — Apple blue pill
        primary:
          "bg-[--accent] text-white hover:bg-[--accent-hover] rounded-[var(--radius-pill)] shadow-none",
        // Secondary — outlined blue pill (Apple ghost style)
        secondary:
          "bg-transparent text-[--accent] border border-[--border-strong] hover:bg-[rgba(0,0,0,0.04)] rounded-[var(--radius-pill)]",
        // Ghost — subtle, for icon buttons and toolbar actions
        ghost:
          "text-[--text-secondary] hover:text-[--text-primary] hover:bg-[rgba(0,0,0,0.05)] rounded-[var(--radius-md)]",
        // Destructive — red tint
        destructive:
          "bg-[var(--color-error-bg)] text-[--status-error] border border-[rgba(255,59,48,0.20)] hover:bg-[rgba(255,59,48,0.18)] rounded-[var(--radius-pill)]",
        // Text link — Apple "Learn more" style
        link: "text-[--accent] underline-offset-4 hover:underline p-0 h-auto rounded-none",
      },
      size: {
        sm:   "h-8 px-4 text-[13px] rounded-[var(--radius-pill)]",
        md:   "h-[46px] px-6 text-[17px] rounded-[var(--radius-pill)]",
        lg:   "h-[52px] px-8 text-[17px] rounded-[var(--radius-pill)]",
        icon: "h-9 w-9 rounded-[var(--radius-md)]",
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
