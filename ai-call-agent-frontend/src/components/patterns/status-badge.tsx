import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * StatusBadge — the EaziAICall status system.
 *
 * Soft tinted pill with an optional status dot. Uses the semantic
 * status tokens (success / warning / info / destructive) so it stays
 * readable on both light and dark themes.
 *
 * Presentation-only: callers map product labels (Active, Booked, Failed,
 * Escalated, etc.) to a semantic `status` + children text. No business
 * logic lives here.
 *
 * Portable: plain React + cva, no framework dependencies.
 */
const statusBadgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
  {
    variants: {
      status: {
        success: "border-success/30 bg-success/10 text-success-strong",
        warning: "border-warning/40 bg-warning/15 text-warning-strong",
        error: "border-destructive/30 bg-destructive/10 text-destructive-strong",
        info: "border-info/30 bg-info/10 text-info-strong",
        primary: "border-primary/25 bg-primary/10 text-primary",
        neutral: "border-border bg-muted text-muted-foreground",
      },
    },
    defaultVariants: {
      status: "neutral",
    },
  },
);

export type StatusBadgeStatus = NonNullable<
  VariantProps<typeof statusBadgeVariants>["status"]
>;

export interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusBadgeVariants> {
  /** Show the colored status dot before the label. Default: true */
  showDot?: boolean;
}

function StatusBadge({
  className,
  status = "neutral",
  showDot = true,
  children,
  ...props
}: StatusBadgeProps) {
  return (
    <span className={cn(statusBadgeVariants({ status }), className)} {...props}>
      {showDot ? (
        <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-current" />
      ) : null}
      {children}
    </span>
  );
}

export { StatusBadge, statusBadgeVariants };
