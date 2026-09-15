import Link from "next/link";

import { Button } from "@/components/ui/button";
import { marketingAuthCtas } from "@/content/marketing";
import type { PublicPlan, PublicPlansResult } from "@/lib/public-plans";

function formatMoney(cents: number | null, currency: string): string | null {
  if (cents === null || cents === undefined) return null;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(0)} ${currency}`;
  }
}

function PlanCard({ plan }: { plan: PublicPlan }) {
  const monthly = formatMoney(plan.price.monthlyCents, plan.price.currency);
  const annual = formatMoney(plan.price.annualCents, plan.price.currency);
  const headlines = plan.comparison?.headlineFeatures ?? [];

  return (
    <article
      className={`flex flex-col rounded-2xl border bg-card p-6 shadow-xs ${
        plan.isRecommended ? "border-primary ring-1 ring-primary/30" : ""
      }`}
    >
      {plan.isRecommended ? (
        <p className="text-xs font-medium uppercase tracking-wider text-primary">Recommended</p>
      ) : null}
      <h3 className="mt-1 font-display text-2xl font-semibold tracking-tight">{plan.name}</h3>
      {plan.description ? (
        <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>
      ) : null}
      <div className="mt-6">
        {monthly ? (
          <p className="font-display text-3xl font-semibold tracking-tight">
            {monthly}
            <span className="text-base font-normal text-muted-foreground"> / month</span>
          </p>
        ) : (
          <p className="font-display text-2xl font-semibold tracking-tight">Contact for pricing</p>
        )}
        {annual ? (
          <p className="mt-1 text-sm text-muted-foreground">{annual} billed annually</p>
        ) : null}
      </div>
      {headlines.length > 0 ? (
        <ul className="mt-6 space-y-2 text-sm text-muted-foreground">
          {headlines.map((line) => (
            <li key={line}>• {line}</li>
          ))}
        </ul>
      ) : null}
      <div className="mt-auto pt-8">
        <Button className="w-full" asChild>
          <Link href="/register">{plan.ctaLabel ?? "Get Started"}</Link>
        </Button>
      </div>
    </article>
  );
}

export function PricingPlansBlock({
  result,
  compact = false,
}: {
  result: PublicPlansResult;
  compact?: boolean;
}) {
  if (result.status === "error") {
    return (
      <div className="rounded-2xl border bg-card px-6 py-10 text-center shadow-xs">
        <h3 className="font-display text-xl font-semibold tracking-tight">
          Pricing is temporarily unavailable
        </h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{result.message}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button asChild>
            <Link href={marketingAuthCtas.getStarted.href}>
              {marketingAuthCtas.getStarted.label}
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/contact">Contact</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (result.status === "empty" || result.plans.length === 0) {
    return (
      <div className="rounded-2xl border bg-card px-6 py-10 text-center shadow-xs">
        <h3 className="font-display text-xl font-semibold tracking-tight">
          Plans are being finalized
        </h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Commercial plans will appear here from the live public catalog when published. We do not
          invent placeholder tiers.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button asChild>
            <Link href={marketingAuthCtas.getStarted.href}>
              {marketingAuthCtas.getStarted.label}
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/contact">Contact</Link>
          </Button>
        </div>
      </div>
    );
  }

  const plans = compact ? result.plans.slice(0, 3) : result.plans;

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {plans.map((plan) => (
        <PlanCard key={plan.code} plan={plan} />
      ))}
    </div>
  );
}
