import { apiRequest, type ApiResult } from "./api-client";

export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "grace_period"
  | "canceled"
  | "expired"
  | "suspended";

export type PlanPriceView = {
  currency: string;
  monthlyCents: number | null;
  annualCents: number | null;
};

export type PlanComparisonView = {
  headlineFeatures?: string[];
  limits?: {
    businesses?: number | null;
    agents?: number | null;
    phoneNumbers?: number | null;
    monthlyMinutes?: number | null;
  };
  ctaLabel?: string | null;
} | null;

export type PublicPlanView = {
  code: string;
  name: string;
  description: string | null;
  sortOrder: number;
  isRecommended: boolean;
  trialEligible: boolean;
  trialDays: number | null;
  price: PlanPriceView;
  comparison: PlanComparisonView;
  ctaLabel: string | null;
};

export type AuthenticatedPlanView = PublicPlanView & {
  currentPlanMatch: boolean;
};

export type SubscriptionView = {
  organizationId: string;
  plan: {
    code: string;
    name: string;
  };
  status: SubscriptionStatus;
  trial: {
    start: string | null;
    end: string | null;
  };
  period: {
    start: string | null;
    end: string | null;
  };
  cancelAtPeriodEnd: boolean;
  capabilities: {
    canUpgrade: boolean;
    canManageBilling: boolean;
  };
};

export type EntitlementsView = {
  organizationId: string;
  planCode: string;
  status: SubscriptionStatus;
  entitlements: Record<string, boolean | number>;
  features: Record<string, boolean>;
  limits: Record<string, number | null>;
};

const DEFAULT_UNAVAILABLE =
  "Subscription details could not be loaded. Check your connection and try again.";

async function subscriptionsRequest<T>(
  path: string,
  init?: Parameters<typeof apiRequest>[1],
): Promise<ApiResult<T>> {
  return apiRequest<T>(path, {
    unavailableMessage: DEFAULT_UNAVAILABLE,
    timeoutMessage:
      "The subscription request timed out. Check your connection and try again.",
    ...init,
  });
}

/** Subscription Plans client — same-origin `/api/backend/*` only. */
export const subscriptionsApi = {
  listPlans: () =>
    subscriptionsRequest<{ plans: AuthenticatedPlanView[] }>("plans"),

  getSubscription: () =>
    subscriptionsRequest<SubscriptionView>("subscription"),

  getEntitlements: () =>
    subscriptionsRequest<EntitlementsView>("subscription/entitlements"),
};
