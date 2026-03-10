"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const SIZE_MAP = {
  sm: "max-w-sm",
  md: "max-w-[560px]",
  lg: "max-w-2xl",
};

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  className,
  size = "md",
}: ModalProps) {
  // Close on Escape
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // Prevent body scroll when open
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop — Apple-style blur */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[8px]"
          />

          {/* Modal — fade + slide up */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
            className="fixed inset-x-0 bottom-0 sm:inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6"
          >
            <div
              className={cn(
                "relative w-full rounded-t-[28px] sm:rounded-[24px]",
                "bg-[--bg-modal] border border-[--border-subtle]",
                "shadow-[var(--shadow-modal)]",
                "max-h-[90vh] overflow-y-auto",
                SIZE_MAP[size],
                className
              )}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drag handle (mobile only) */}
              <div className="flex justify-center pt-3 pb-1 sm:hidden">
                <div className="h-1 w-10 rounded-full bg-[rgba(0,0,0,0.12)]" />
              </div>

              {/* Header */}
              {(title || description) && (
                <div className="flex items-start justify-between gap-4 px-8 pt-7 pb-5 border-b border-[--border-subtle]">
                  <div>
                    {title && (
                      <h2 className="text-[19px] font-semibold text-[--text-primary] tracking-[-0.02em]">
                        {title}
                      </h2>
                    )}
                    {description && (
                      <p className="mt-1 text-[15px] text-[--text-secondary]">
                        {description}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={onClose}
                    className="shrink-0 h-7 w-7 rounded-full bg-[rgba(0,0,0,0.06)] flex items-center justify-center text-[--text-secondary] hover:bg-[rgba(0,0,0,0.10)] transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              {/* Body */}
              <div className="p-8">{children}</div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
