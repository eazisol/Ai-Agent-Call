/**
 * Customer-safe commercial entitlement / limit messaging (M25).
 * Presentation helpers only — backend remains authoritative.
 */

export const ENTITLEMENT_LABELS: Record<string, string> = {
  "businesses.max": "Businesses",
  "agents.max": "AI Agents",
  "phone_numbers.max": "Phone numbers",
  "minutes.monthly_included": "Monthly minutes (included)",
  "voice_cloning.enabled": "Voice cloning",
  "analytics.enabled": "Analytics",
  "automations.enabled": "Automations",
};

export type CommercialErrorCode =
  | "FEATURE_NOT_INCLUDED"
  | "PLAN_LIMIT_REACHED"
  | "SUBSCRIPTION_INACTIVE"
  | "TRIAL_EXPIRED";

export type CommercialErrorDetails = {
  featureKey?: string;
  limit?: number;
  current?: number;
  planCode?: string;
  required_plan_action?: string;
  trialEnd?: string;
  status?: string;
};

export type CommercialErrorMessage = {
  title: string;
  description: string;
  ctaLabel: string | null;
  ctaHref: string | null;
};

export function isCommercialErrorCode(
  code: string | undefined,
): code is CommercialErrorCode {
  return (
    code === "FEATURE_NOT_INCLUDED" ||
    code === "PLAN_LIMIT_REACHED" ||
    code === "SUBSCRIPTION_INACTIVE" ||
    code === "TRIAL_EXPIRED"
  );
}

export function formatEntitlementLabel(key: string): string {
  return ENTITLEMENT_LABELS[key] ?? key.replaceAll(".", " · ");
}

/** Format an integer limit for display. `null` = unlimited. */
export function formatLimitValue(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "Unlimited";
  }
  return value.toLocaleString();
}

export function formatFeatureValue(enabled: boolean | undefined): string {
  if (enabled === true) {
    return "Included";
  }
  return "Not included";
}

export function formatPriceCents(
  cents: number | null | undefined,
  currency = "USD",
): string | null {
  if (cents === null || cents === undefined) {
    return null;
  }
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(0)} ${currency}`;
  }
}

export function mapCommercialError(
  code: string | undefined,
  fallbackMessage: string,
  details?: CommercialErrorDetails,
): CommercialErrorMessage {
  const compareHref = "/settings/plan/compare";

  switch (code) {
    case "FEATURE_NOT_INCLUDED": {
      const feature = details?.featureKey
        ? formatEntitlementLabel(details.featureKey)
        : "This feature";
      return {
        title: "Not included in your plan",
        description: `${feature} is not available on your current plan.`,
        ctaLabel: "Compare plans",
        ctaHref: compareHref,
      };
    }
    case "PLAN_LIMIT_REACHED": {
      const feature = details?.featureKey
        ? formatEntitlementLabel(details.featureKey)
        : "This resource";
      const limitPart =
        typeof details?.limit === "number" &&
        typeof details?.current === "number"
          ? ` You are using ${details.current.toLocaleString()} of ${details.limit.toLocaleString()}.`
          : "";
      return {
        title: "Plan limit reached",
        description: `${feature} has reached the limit for your current plan.${limitPart}`,
        ctaLabel: "Compare plans",
        ctaHref: compareHref,
      };
    }
    case "SUBSCRIPTION_INACTIVE":
      return {
        title: "Subscription inactive",
        description:
          fallbackMessage ||
          "Your subscription is not active. Some actions are unavailable.",
        ctaLabel: "View plan",
        ctaHref: "/settings/plan",
      };
    case "TRIAL_EXPIRED":
      return {
        title: "Trial expired",
        description:
          fallbackMessage ||
          "Your trial has ended. Choose a plan to continue using paid features.",
        ctaLabel: "Compare plans",
        ctaHref: compareHref,
      };
    default:
      return {
        title: "Request failed",
        description: fallbackMessage || "Something went wrong. Please try again.",
        ctaLabel: null,
        ctaHref: null,
      };
  }
}

export type SubscriptionStatusBadge =
  | "success"
  | "warning"
  | "error"
  | "info"
  | "neutral";

export function subscriptionStatusBadge(
  status: string,
): SubscriptionStatusBadge {
  switch (status) {
    case "active":
      return "success";
    case "trialing":
      return "info";
    case "past_due":
    case "grace_period":
    case "canceled":
      return "warning";
    case "expired":
    case "suspended":
      return "error";
    default:
      return "neutral";
  }
}

export function formatSubscriptionStatus(status: string): string {
  switch (status) {
    case "trialing":
      return "Trial";
    case "active":
      return "Active";
    case "past_due":
      return "Past due";
    case "grace_period":
      return "Grace period";
    case "canceled":
      return "Canceled";
    case "expired":
      return "Expired";
    case "suspended":
      return "Suspended";
    default:
      return status;
  }
}
