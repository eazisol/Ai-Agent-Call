"use client";

import { useOptionalSubscriptionSnapshot } from "@/components/subscriptions/subscription-session";
import { useShellNavigation } from "./shell-navigation";

/**
 * Compact plan minutes summary (M25).
 * Shows included entitlement only — no fake used/limit progress until M26.
 */
export function UsageIndicator() {
  const { navigate } = useShellNavigation();
  const snapshot = useOptionalSubscriptionSnapshot();
  const href = "/settings/plan";

  const planName =
    snapshot?.status === "ready" && snapshot.subscription
      ? snapshot.subscription.plan.name
      : snapshot?.status === "error"
        ? "Plan unavailable"
        : snapshot?.status === "loading"
          ? "Loading plan…"
          : null;

  const minutesLimit =
    snapshot?.entitlements?.limits?.["minutes.monthly_included"];
  const hasMinutesKey =
    snapshot?.entitlements?.limits != null &&
    Object.prototype.hasOwnProperty.call(
      snapshot.entitlements.limits,
      "minutes.monthly_included",
    );

  let minutesLine: string;
  if (snapshot?.status === "loading" || snapshot?.status === "idle") {
    minutesLine = "Loading…";
  } else if (!hasMinutesKey) {
    minutesLine = "Usage available after metering";
  } else if (minutesLimit === null || minutesLimit === undefined) {
    minutesLine = "Unlimited included";
  } else {
    minutesLine = `${minutesLimit.toLocaleString()} included`;
  }

  return (
    <div className="mx-2 rounded-lg border bg-muted/40 p-3 group-data-[collapsible=icon]:hidden">
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">
          {planName ?? "Plan"}
        </p>
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            Monthly minutes
          </span>
          <span className="text-xs font-medium tabular-nums">{minutesLine}</span>
        </div>
      </div>
      <a
        href={href}
        onClick={(e) => {
          e.preventDefault();
          navigate(href);
        }}
        className="mt-2 inline-block text-xs font-medium text-primary hover:underline"
      >
        View plan
      </a>
    </div>
  );
}
