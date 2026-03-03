import * as React from "react";
import { cn, getStatusColor } from "@/lib/utils";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status?: string;
}

export function Badge({ className, status, children, ...props }: BadgeProps) {
  const colorClass = status ? getStatusColor(status) : "";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
        colorClass,
        className
      )}
      {...props}
    >
      {children ?? status}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  return <Badge status={status}>{status}</Badge>;
}
