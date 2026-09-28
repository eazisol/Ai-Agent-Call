"use client";

import * as React from "react";
import Link from "next/link";
import { CreditCard } from "lucide-react";

import { EmptyState } from "@/components/patterns/empty-state";
import { ErrorState } from "@/components/patterns/error-state";
import { StatusBadge } from "@/components/patterns/status-badge";
import { useOrganizationSession } from "@/components/organizations/organization-session";
import { useSubscriptionSnapshot } from "@/components/subscriptions/subscription-session";
import { Button } from "@/components/ui/button";
import {
  formatPriceCents,
} from "@/lib/subscription-messages";
import {
  subscriptionsApi,
  type AuthenticatedPlanView,
} from "@/lib/subscriptions-api";
import {
  billingApi,
  canManageBilling,
  mapBillingError,
  type BillingInterval,
} from "@/lib/billing-api";
import { useEffectTask } from "@/hooks/use-effect-task";
import { toast } from "sonner";

export default function ComparePlansPage() {
  const org = useOrganizationSession();
  const { subscription } = useSubscriptionSnapshot();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [plans, setPlans] = React.useState<AuthenticatedPlanView[]>([]);
  const [reload, setReload] = React.useState(0);
  const [checkoutPendingCode, setCheckoutPendingCode] = React.useState<string | null>(null);
  const manage = canManageBilling(org.active?.role);

  const loadPlans = React.useCallback(async () => {
    void reload;
    if (!org.active) {
      setLoading(false);
      setPlans([]);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    const result = await subscriptionsApi.listPlans();
    setLoading(false);
    if (!result.ok) {
      setError(result.message);
      setPlans([]);
      return;
    }
    setPlans(result.data.plans ?? []);
  }, [org.active, reload]);

  useEffectTask(loadPlans, [loadPlans]);

  if (org.status === "loading") {
    return <p className="text-sm text-muted-foreground">Loading...</p>;
  }

  if (!org.active) {
    return (
      <EmptyState
        icon={CreditCard}
        title="No active organization"
        description="Select a workspace before comparing plans."
      />
    );
  }

  if (loading) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Compare plans</h1>
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        title="Could not load plans"
        description={error}
        onRetry={() => setReload((n) => n + 1)}
      />
    );
  }

  const currentCode = subscription?.plan.code;

  async function startCheckout(planCode: string, interval: BillingInterval) {
    if (!manage || checkoutPendingCode) return;
    setCheckoutPendingCode(planCode);
    const result = await billingApi.createCheckout({ planCode, interval });
    setCheckoutPendingCode(null);
    if (!result.ok) {
      const mapped = mapBillingError(result.code, result.message);
      toast.error(mapped.title, { description: mapped.description });
      return;
    }
    // Redirect only — never optimistically activate subscription.
    window.location.assign(result.data.url);
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Compare plans</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Commercial plans available to your workspace. Catalog values come
            from the server — no fabricated tiers.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/settings/plan">Back to current plan</Link>
        </Button>
      </div>

      {plans.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="Commercial plans are being configured"
          description="There are no customer-selectable plans published yet. Your current subscription remains available under Plan."
          action={
            <Button asChild variant="outline">
              <Link href="/settings/plan">View current plan</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {plans.map((plan) => {
            const isCurrent =
              plan.currentPlanMatch || plan.code === currentCode;
            const monthly = formatPriceCents(
              plan.price.monthlyCents,
              plan.price.currency,
            );
            const annual = formatPriceCents(
              plan.price.annualCents,
              plan.price.currency,
            );
            return (
              <article
                key={plan.code}
                className="flex flex-col rounded-xl border bg-card p-5"
                aria-labelledby={`plan-${plan.code}`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <h2
                    id={`plan-${plan.code}`}
                    className="text-base font-semibold"
                  >
                    {plan.name}
                  </h2>
                  {plan.isRecommended ? (
                    <StatusBadge status="primary">Recommended</StatusBadge>
                  ) : null}
                  {isCurrent ? (
                    <StatusBadge status="success">Current plan</StatusBadge>
                  ) : null}
                </div>
                {plan.description ? (
                  <p className="mt-2 text-sm text-muted-foreground">
                    {plan.description}
                  </p>
                ) : null}

                <div className="mt-4 space-y-1 text-sm">
                  <p>
                    <span className="text-muted-foreground">Monthly: </span>
                    <span className="font-medium">
                      {monthly ?? "Price TBD"}
                    </span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">Annual: </span>
                    <span className="font-medium">{annual ?? "Price TBD"}</span>
                  </p>
                </div>

                {plan.comparison?.headlineFeatures?.length ? (
                  <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                    {plan.comparison.headlineFeatures.map((feature) => (
                      <li key={feature}>{feature}</li>
                    ))}
                  </ul>
                ) : null}

                {plan.comparison?.limits ? (
                  <dl className="mt-4 space-y-1 text-sm">
                    {Object.entries(plan.comparison.limits).map(
                      ([key, value]) => (
                        <div key={key} className="flex justify-between gap-2">
                          <dt className="capitalize text-muted-foreground">
                            {key}
                          </dt>
                          <dd className="font-medium tabular-nums">
                            {value === null || value === undefined
                              ? "Unlimited"
                              : value.toLocaleString()}
                          </dd>
                        </div>
                      ),
                    )}
                  </dl>
                ) : null}

                <div className="mt-auto space-y-2 pt-5">
                  {isCurrent ? (
                    <Button disabled className="w-full" variant="secondary">
                      Current plan
                    </Button>
                  ) : manage ? (
                    <>
                      {plan.price.monthlyCents != null ? (
                        <Button
                          type="button"
                          className="w-full"
                          disabled={checkoutPendingCode === plan.code}
                          aria-busy={checkoutPendingCode === plan.code}
                          onClick={() => void startCheckout(plan.code, "month")}
                        >
                          {checkoutPendingCode === plan.code
                            ? "Starting checkout…"
                            : "Checkout monthly"}
                        </Button>
                      ) : null}
                      {plan.price.annualCents != null ? (
                        <Button
                          type="button"
                          className="w-full"
                          variant="outline"
                          disabled={checkoutPendingCode === plan.code}
                          aria-busy={checkoutPendingCode === plan.code}
                          onClick={() => void startCheckout(plan.code, "year")}
                        >
                          {checkoutPendingCode === plan.code
                            ? "Starting checkout…"
                            : "Checkout annually"}
                        </Button>
                      ) : null}
                      {plan.price.monthlyCents == null &&
                      plan.price.annualCents == null ? (
                        <Button disabled className="w-full" variant="outline">
                          Price not published yet
                        </Button>
                      ) : null}
                      <p className="text-xs text-muted-foreground">
                        Checkout uses server price mapping. No plan-change or
                        proration is applied from this page.
                      </p>
                    </>
                  ) : (
                    <Button disabled className="w-full" variant="outline">
                      Contact an owner to manage billing
                    </Button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
