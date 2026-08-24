"use client";

import { Progress } from "@/components/ui/progress";
import { usageSummary, type UsageSummary } from "@/mocks/portal-shell";
import { useShellNavigation } from "./shell-navigation";

/**
 * UsageIndicator — quiet plan-usage summary pinned above the sidebar footer.
 * Hidden in the collapsed icon rail. Chrome-only mock data in Phase 3.
 */
export function UsageIndicator({ usage = usageSummary }: { usage?: UsageSummary }) {
  const { navigate } = useShellNavigation();
  const pct = Math.min(100, Math.round((usage.used / usage.limit) * 100));

  return (
    <div className="mx-2 rounded-lg border bg-muted/40 p-3 group-data-[collapsible=icon]:hidden">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">{usage.label}</span>
        <span className="text-xs font-medium tabular-nums">
          {usage.used.toLocaleString()} / {usage.limit.toLocaleString()}
        </span>
      </div>
      <Progress value={pct} className="mt-2 h-1.5" aria-label={`${usage.label}: ${pct}% used`} />
      <a
        href={usage.href}
        onClick={(e) => {
          e.preventDefault();
          navigate(usage.href);
        }}
        className="mt-2 inline-block text-xs font-medium text-primary hover:underline"
      >
        View usage
      </a>
    </div>
  );
}
