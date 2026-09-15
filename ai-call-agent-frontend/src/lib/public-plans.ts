/**
 * Server-side public plans helper for marketing pricing (M25).
 * Resolves to GET {apiV1Base}/public/plans — never expose secrets to the browser.
 * Empty [] is a legitimate success (empty) state — not an error.
 */

export type PublicPlanPrice = {
  currency: string;
  monthlyCents: number | null;
  annualCents: number | null;
};

export type PublicPlanComparison = {
  headlineFeatures?: string[];
  limits?: {
    businesses?: number | null;
    agents?: number | null;
    phoneNumbers?: number | null;
    monthlyMinutes?: number | null;
  };
  ctaLabel?: string | null;
} | null;

/** Mirrors M25 PublicPlanView — public DTO fields only. */
export type PublicPlan = {
  code: string;
  name: string;
  description: string | null;
  sortOrder: number;
  isRecommended: boolean;
  trialEligible: boolean;
  trialDays: number | null;
  price: PublicPlanPrice;
  comparison: PublicPlanComparison;
  ctaLabel: string | null;
};

export type PublicPlansResult =
  | { status: "success"; plans: PublicPlan[] }
  | { status: "empty"; plans: [] }
  | { status: "error"; plans: []; message: string };

export const PUBLIC_PLANS_REVALIDATE_SECONDS = 300;

/** Prefer IPv4 loopback — Windows `localhost` often resolves to ::1 first. */
export const LOCAL_PUBLIC_PLANS_API_BASE = "http://127.0.0.1:3000/api/v1";

const LEGACY_PRODUCTION_CODE = "legacy_production";

/**
 * Normalize a configured base so it ends at `/api/v1` (no trailing slash).
 * Accepts either `http://host/api/v1` or origin-only `http://host`.
 */
export function normalizePublicPlansApiBase(baseUrl: string): string {
  let base = baseUrl.trim().replace(/\/+$/, "");
  if (!/\/api\/v1$/i.test(base)) {
    base = `${base}/api/v1`;
  }
  return base;
}

export function publicPlansUrl(baseUrl: string): string {
  return `${normalizePublicPlansApiBase(baseUrl)}/public/plans`;
}

/**
 * Resolve server-only API v1 base for public plans.
 * Order: INTERNAL_API_BASE_URL → INTERNAL_BACKEND_ORIGIN/BACKEND_PROXY_ORIGIN → local loopback.
 */
export function resolvePublicPlansApiBase(
  env: NodeJS.ProcessEnv = process.env,
): string {
  const internal = env.INTERNAL_API_BASE_URL?.trim();
  if (internal) {
    return normalizePublicPlansApiBase(internal);
  }

  const origin = (
    env.INTERNAL_BACKEND_ORIGIN ??
    env.BACKEND_PROXY_ORIGIN ??
    ""
  ).trim();
  if (origin) {
    return normalizePublicPlansApiBase(origin);
  }

  return LOCAL_PUBLIC_PLANS_API_BASE;
}

export function sanitizePublicPlans(raw: unknown): PublicPlan[] {
  if (!raw || typeof raw !== "object") {
    return [];
  }
  const plans = (raw as { plans?: unknown }).plans;
  if (!Array.isArray(plans)) {
    return [];
  }

  const out: PublicPlan[] = [];
  for (const item of plans) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const code = typeof row.code === "string" ? row.code : "";
    if (!code || code === LEGACY_PRODUCTION_CODE) {
      continue;
    }
    if (typeof row.name !== "string") continue;

    const priceRaw = row.price;
    const priceObj =
      priceRaw && typeof priceRaw === "object"
        ? (priceRaw as Record<string, unknown>)
        : {};

    out.push({
      code,
      name: row.name,
      description: typeof row.description === "string" ? row.description : null,
      sortOrder: typeof row.sortOrder === "number" ? row.sortOrder : 0,
      isRecommended: row.isRecommended === true,
      trialEligible: row.trialEligible === true,
      trialDays: typeof row.trialDays === "number" ? row.trialDays : null,
      price: {
        currency:
          typeof priceObj.currency === "string" ? priceObj.currency : "USD",
        monthlyCents:
          typeof priceObj.monthlyCents === "number"
            ? priceObj.monthlyCents
            : null,
        annualCents:
          typeof priceObj.annualCents === "number"
            ? priceObj.annualCents
            : null,
      },
      comparison: (row.comparison as PublicPlanComparison) ?? null,
      ctaLabel: typeof row.ctaLabel === "string" ? row.ctaLabel : null,
    });
  }
  return out;
}

/**
 * Fetch public commercial plans for marketing (server-only).
 * Does not throw for upstream failures — returns status: "error".
 * HTTP 200 + [] → empty (not error).
 */
export async function fetchPublicPlans(
  fetchImpl: typeof fetch = fetch,
  env: NodeJS.ProcessEnv = process.env,
): Promise<PublicPlansResult> {
  const base = resolvePublicPlansApiBase(env);
  const url = `${base}/public/plans`;

  try {
    const response = await fetchImpl(url, {
      method: "GET",
      headers: { accept: "application/json" },
      next: { revalidate: PUBLIC_PLANS_REVALIDATE_SECONDS },
    } as RequestInit);

    if (!response.ok) {
      return {
        status: "error",
        plans: [],
        message: "Pricing is temporarily unavailable.",
      };
    }

    let json: unknown;
    try {
      json = await response.json();
    } catch {
      return {
        status: "error",
        plans: [],
        message: "Pricing is temporarily unavailable.",
      };
    }

    // Malformed envelope (missing plans array) → error, not empty.
    if (
      !json ||
      typeof json !== "object" ||
      !Array.isArray((json as { plans?: unknown }).plans)
    ) {
      return {
        status: "error",
        plans: [],
        message: "Pricing is temporarily unavailable.",
      };
    }

    const plans = sanitizePublicPlans(json);
    if (plans.length === 0) {
      return { status: "empty", plans: [] };
    }
    return { status: "success", plans };
  } catch {
    return {
      status: "error",
      plans: [],
      message: "Pricing is temporarily unavailable.",
    };
  }
}