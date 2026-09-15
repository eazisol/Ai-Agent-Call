"use client";

import Link from "next/link";
import { CreditCard } from "lucide-react";

import { EmptyState } from "@/components/patterns/empty-state";
import { ErrorState } from "@/components/patterns/error-state";
import { StatusBadge } from "@/components/patterns/status-badge";
import { EntitlementsPanel } from "@/components/subscriptions/entitlements-panel";
import { useSubscriptionSnapshot } from "@/components/subscriptions/subscription-session";
import { useOrganizationSession } from "@/components/organizations/organization-session";
import { Button } from "@/components/ui/button";
import {
  formatSubscriptionStatus,
  subscriptionStatusBadge,
} from "@/lib/subscription-messages";

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

export default function PlanSettingsPage() {
  const org = useOrganizationSession();
  const { status, subscription, entitlements, error, refresh } =
    useSubscriptionSnapshot();

  if (org.status === "loading" || status === "loading" || status === "idle") {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Plan</h1>
        <p className="text-sm text-muted-foreground">Loading subscription…</p>
      </div>
    );
  }

  if (!org.active) {
    return (
      <EmptyState
        icon={CreditCard}
        title="No active organization"
        description="Select or create a workspace to view its subscription plan."
        action={
          <Button asChild>
            <Link href="/onboarding/organization">Create organization</Link>
          </Button>
        }
      />
    );
  }

  if (status === "error" || !subscription) {
    return (
      <ErrorState
        title="Could not load subscription"
        description={error ?? "Plan unavailable"}
        onRetry={() => void refresh()}
      />
    );
  }

  const restricted =
    subscription.status === "expired" ||
    subscription.status === "suspended";

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1.5">
          <h1 className="text-2xl font-semibold tracking-tight">Plan</h1>
          <p className="text-sm text-muted-foreground">
            Current subscription for {org.active.name}.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/settings/plan/compare">Compare plans</Link>
        </Button>
      </div>

      <section
        aria-labelledby="current-plan-heading"
        className="space-y-4 rounded-xl border bg-card p-5"
      >
        <div className="flex flex-wrap items-center gap-2">
          <h2
            id="current-plan-heading"
            className="text-lg font-semibold text-foreground"
          >
            {subscription.plan.name}
          </h2>
          <StatusBadge status={subscriptionStatusBadge(subscription.status)}>
            {formatSubscriptionStatus(subscription.status)}
          </StatusBadge>
        </div>

        {restricted ? (
          <p className="text-sm text-muted-foreground" role="status">
            This subscription is not active. You can still view existing data;
            creating new resources may be restricted once enforcement is enabled.
          </p>
        ) : null}

        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Plan code</dt>
            <dd className="font-medium">{subscription.plan.code}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Cancel at period end</dt>
            <dd className="font-medium">
              {subscription.cancelAtPeriodEnd ? "Yes" : "No"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Trial start</dt>
            <dd className="font-medium">{formatDate(subscription.trial.start)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Trial end</dt>
            <dd className="font-medium">{formatDate(subscription.trial.end)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Period start</dt>
            <dd className="font-medium">
              {formatDate(subscription.period.start)}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Period end</dt>
            <dd className="font-medium">{formatDate(subscription.period.end)}</dd>
          </div>
        </dl>

        <div className="rounded-lg border border-dashed bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          Payment methods and checkout are not available yet. Use Compare plans
          to review commercial options when they are published.
        </div>
      </section>

      <EntitlementsPanel entitlements={entitlements} />
    </div>
  );
}
