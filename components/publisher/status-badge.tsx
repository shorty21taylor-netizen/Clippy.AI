import React from "react";
import { Badge } from "@/components/ui/badge";
import { Clock, Loader2, CheckCircle2, XCircle } from "lucide-react";

export type PostStatus = "PENDING" | "IN_PROGRESS" | "SUCCESS" | "FAILED";

const STATUS_CONFIG: Record<
  PostStatus,
  { label: string; variant: "default" | "pending" | "success" | "error"; icon: React.ComponentType<{ size?: number; className?: string }> }
> = {
  PENDING: { label: "Scheduled", variant: "pending", icon: Clock },
  IN_PROGRESS: { label: "Publishing…", variant: "pending", icon: Loader2 },
  SUCCESS: { label: "Posted", variant: "success", icon: CheckCircle2 },
  FAILED: { label: "Failed", variant: "error", icon: XCircle },
};

export function PostStatusBadge({ status }: { status: PostStatus }) {
  const { label, variant, icon: Icon } = STATUS_CONFIG[status];
  return (
    <Badge variant={variant}>
      <Icon
        size={10}
        className={status === "IN_PROGRESS" ? "animate-spin" : undefined}
      />
      {label}
    </Badge>
  );
}
