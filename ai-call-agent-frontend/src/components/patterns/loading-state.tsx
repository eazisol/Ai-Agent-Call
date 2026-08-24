import * as React from "react";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading primitives — Spinner, LoadingState and skeleton compositions.
 *
 * Rule of thumb: use skeletons for content that has a known layout
 * (tables, cards) and Spinner/LoadingState for indeterminate actions
 * or full-panel loads.
 *
 * Portable: plain React.
 */
function Spinner({ className, ...props }: React.ComponentProps<typeof Loader2>) {
  return (
    <Loader2
      role="status"
      aria-label="Loading"
      className={cn("size-4 animate-spin text-muted-foreground", className)}
      {...props}
    />
  );
}

export interface LoadingStateProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: string;
}

function LoadingState({ label = "Loading…", className, ...props }: LoadingStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl border bg-card px-6 py-12",
        className,
      )}
      {...props}
    >
      <Spinner className="size-6 text-primary" />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

/** Skeleton matching the standard stat/summary card. */
function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-xl border bg-card p-6", className)}>
      <Skeleton className="h-4 w-24" />
      <Skeleton className="mt-3 h-8 w-32" />
      <Skeleton className="mt-2 h-3 w-40" />
    </div>
  );
}

/** Skeleton matching standard table rows. */
function TableSkeleton({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("rounded-xl border bg-card", className)}>
      <div className="border-b px-6 py-4">
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="divide-y">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-6 py-4">
            <Skeleton className="size-8 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-1/3" />
              <Skeleton className="h-3 w-1/4" />
            </div>
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export { Spinner, LoadingState, CardSkeleton, TableSkeleton };
