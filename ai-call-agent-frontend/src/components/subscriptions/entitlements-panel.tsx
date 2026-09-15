"use client";

import * as React from "react";

import {
  formatEntitlementLabel,
  formatFeatureValue,
  formatLimitValue,
} from "@/lib/subscription-messages";
import type { EntitlementsView } from "@/lib/subscriptions-api";

const LIMIT_KEYS = [
  "businesses.max",
  "agents.max",
  "phone_numbers.max",
  "minutes.monthly_included",
] as const;

const FEATURE_KEYS = [
  "voice_cloning.enabled",
  "analytics.enabled",
  "automations.enabled",
] as const;

type Props = {
  entitlements: EntitlementsView | null;
};

export function EntitlementsPanel({ entitlements }: Props) {
  if (!entitlements) {
    return (
      <p className="text-sm text-muted-foreground">
        Entitlements are unavailable for this workspace.
      </p>
    );
  }

  const limitEntries: { key: string; label: string; value: string }[] =
    LIMIT_KEYS.filter((key) => key in entitlements.limits).map((key) => ({
      key,
      label: formatEntitlementLabel(key),
      value: formatLimitValue(entitlements.limits[key]),
    }));

  const featureEntries: {
    key: string;
    label: string;
    value: string;
    included: boolean;
  }[] = FEATURE_KEYS.filter((key) => key in entitlements.features).map(
    (key) => ({
      key,
      label: formatEntitlementLabel(key),
      value: formatFeatureValue(entitlements.features[key]),
      included: entitlements.features[key] === true,
    }),
  );

  // Also surface any unexpected keys returned by the API.
  for (const [key, value] of Object.entries(entitlements.limits)) {
    if ((LIMIT_KEYS as readonly string[]).includes(key)) continue;
    limitEntries.push({
      key,
      label: formatEntitlementLabel(key),
      value: formatLimitValue(value),
    });
  }
  for (const [key, value] of Object.entries(entitlements.features)) {
    if ((FEATURE_KEYS as readonly string[]).includes(key)) continue;
    featureEntries.push({
      key,
      label: formatEntitlementLabel(key),
      value: formatFeatureValue(value),
      included: value === true,
    });
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <section aria-labelledby="plan-limits-heading" className="space-y-3">
        <h3
          id="plan-limits-heading"
          className="text-sm font-semibold text-foreground"
        >
          Included limits
        </h3>
        {limitEntries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No limit data returned.</p>
        ) : (
          <ul className="divide-y rounded-xl border bg-card">
            {limitEntries.map((item) => (
              <li
                key={item.key}
                className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
              >
                <span className="text-muted-foreground">{item.label}</span>
                <span className="font-medium tabular-nums text-foreground">
                  {item.value}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="plan-features-heading" className="space-y-3">
        <h3
          id="plan-features-heading"
          className="text-sm font-semibold text-foreground"
        >
          Features
        </h3>
        {featureEntries.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No feature flags returned.
          </p>
        ) : (
          <ul className="divide-y rounded-xl border bg-card">
            {featureEntries.map((item) => (
              <li
                key={item.key}
                className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
              >
                <span className="text-muted-foreground">{item.label}</span>
                <span
                  className={
                    item.included
                      ? "font-medium text-foreground"
                      : "font-medium text-muted-foreground"
                  }
                >
                  {item.value}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
