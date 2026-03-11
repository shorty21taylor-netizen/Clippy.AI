"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from "lucide-react";

export type ToastType = "success" | "error" | "info" | "warning";

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  action?: { label: string; href: string };
}

interface ToastContextValue {
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue>({
  addToast: () => {},
  removeToast: () => {},
});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (toast: Omit<Toast, "id">) => {
      const id = Math.random().toString(36).slice(2);
      setToasts((prev) => [...prev, { ...toast, id }]);
      setTimeout(() => removeToast(id), 4000);
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

const ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle2 size={15} />,
  error: <AlertCircle size={15} />,
  warning: <AlertTriangle size={15} />,
  info: <Info size={15} />,
};

const COLORS: Record<ToastType, { bg: string; border: string; icon: string }> =
  {
    success: {
      bg: "#18181b",
      border: "rgba(34,197,94,0.3)",
      icon: "#22c55e",
    },
    error: {
      bg: "#18181b",
      border: "rgba(239,68,68,0.3)",
      icon: "#ef4444",
    },
    warning: {
      bg: "#18181b",
      border: "rgba(245,158,11,0.3)",
      icon: "#f59e0b",
    },
    info: {
      bg: "#18181b",
      border: "rgba(59,130,246,0.3)",
      icon: "#3b82f6",
    },
  };

function ToastItem({
  toast,
  onRemove,
}: {
  toast: Toast;
  onRemove: (id: string) => void;
}) {
  const [visible, setVisible] = useState(false);
  const colors = COLORS[toast.type];

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  return (
    <div
      style={{
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        borderRadius: "10px",
        padding: "10px 14px",
        display: "flex",
        alignItems: "center",
        gap: "10px",
        boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
        minWidth: "280px",
        maxWidth: "360px",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(8px)",
        transition: "opacity 200ms ease, transform 200ms ease",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <span style={{ color: colors.icon, flexShrink: 0 }}>
        {ICONS[toast.type]}
      </span>
      <span
        style={{
          fontSize: "13px",
          color: "#fafafa",
          flex: 1,
          lineHeight: 1.4,
        }}
      >
        {toast.message}
      </span>
      {toast.action && (
        <a
          href={toast.action.href}
          target="_blank"
          rel="noreferrer"
          style={{
            fontSize: "12px",
            color: "#3b82f6",
            textDecoration: "underline",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          {toast.action.label}
        </a>
      )}
      <button
        onClick={() => onRemove(toast.id)}
        style={{
          flexShrink: 0,
          color: "#71717a",
          cursor: "pointer",
          background: "none",
          border: "none",
          padding: "2px",
          display: "flex",
          alignItems: "center",
          transition: "color 150ms",
        }}
        onMouseEnter={(e) =>
          ((e.currentTarget as HTMLButtonElement).style.color = "#fafafa")
        }
        onMouseLeave={(e) =>
          ((e.currentTarget as HTMLButtonElement).style.color = "#71717a")
        }
        aria-label="Dismiss"
      >
        <X size={13} />
      </button>
    </div>
  );
}

function ToastContainer({
  toasts,
  onRemove,
}: {
  toasts: Toast[];
  onRemove: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: "24px",
        right: "24px",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        alignItems: "flex-end",
        pointerEvents: "none",
      }}
    >
      {toasts.map((toast) => (
        <div key={toast.id} style={{ pointerEvents: "all" }}>
          <ToastItem toast={toast} onRemove={onRemove} />
        </div>
      ))}
    </div>
  );
}
