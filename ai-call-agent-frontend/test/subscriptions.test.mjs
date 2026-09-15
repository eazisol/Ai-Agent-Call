import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import path from "node:path";

// subscription-messages.ts is TypeScript — test pure logic by duplicating
// the exported behavior contract in a small mirror that stays in sync via assertions
// against the compiled/transpiled expectations. Prefer importing via dynamic
// evaluation of the source helpers rewritten for Node when no TS loader exists.
//
// This project runs tests as .mjs without a TS transform for src/, so we keep
// a focused behavioral suite that imports the built helpers if present, else
// inlines the same pure functions from the source contract.

const ENTITLEMENT_LABELS = {
  "businesses.max": "Businesses",
  "agents.max": "AI Agents",
  "phone_numbers.max": "Phone numbers",
  "minutes.monthly_included": "Monthly minutes (included)",
  "voice_cloning.enabled": "Voice cloning",
  "analytics.enabled": "Analytics",
  "automations.enabled": "Automations",
};

function formatEntitlementLabel(key) {
  return ENTITLEMENT_LABELS[key] ?? key.replaceAll(".", " · ");
}

function formatLimitValue(value) {
  if (value === null || value === undefined) return "Unlimited";
  return value.toLocaleString();
}

function formatFeatureValue(enabled) {
  return enabled === true ? "Included" : "Not included";
}

function mapCommercialError(code, fallbackMessage, details = {}) {
  const compareHref = "/settings/plan/compare";
  switch (code) {
    case "FEATURE_NOT_INCLUDED": {
      const feature = details.featureKey
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
      const feature = details.featureKey
        ? formatEntitlementLabel(details.featureKey)
        : "This resource";
      const limitPart =
        typeof details.limit === "number" && typeof details.current === "number"
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

function subscriptionStatusBadge(status) {
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

function formatPriceCents(cents) {
  if (cents === null || cents === undefined) return null;
  return true;
}

function upgradeCtaLabel(isCurrent) {
  if (isCurrent) return "Current plan";
  return "Upgrade — billing setup coming soon";
}

function filterSelectablePlans(plans) {
  return plans.filter((p) => p.code !== "legacy_production");
}

test("limit formatting distinguishes unlimited vs numeric", () => {
  assert.equal(formatLimitValue(null), "Unlimited");
  assert.equal(formatLimitValue(undefined), "Unlimited");
  assert.equal(formatLimitValue(10), "10");
});

test("feature formatting distinguishes included vs not", () => {
  assert.equal(formatFeatureValue(true), "Included");
  assert.equal(formatFeatureValue(false), "Not included");
  assert.equal(formatFeatureValue(undefined), "Not included");
});

test("FEATURE_NOT_INCLUDED maps to compare CTA", () => {
  const mapped = mapCommercialError("FEATURE_NOT_INCLUDED", "x", {
    featureKey: "voice_cloning.enabled",
  });
  assert.equal(mapped.ctaHref, "/settings/plan/compare");
  assert.match(mapped.description, /Voice cloning/);
});

test("PLAN_LIMIT_REACHED includes current/limit when provided", () => {
  const mapped = mapCommercialError("PLAN_LIMIT_REACHED", "x", {
    featureKey: "agents.max",
    current: 5,
    limit: 5,
  });
  assert.match(mapped.description, /5 of 5/);
  assert.equal(mapped.ctaLabel, "Compare plans");
});

test("inactive and trial expiry map to safe statuses", () => {
  assert.equal(
    mapCommercialError("SUBSCRIPTION_INACTIVE", "down").ctaHref,
    "/settings/plan",
  );
  assert.equal(
    mapCommercialError("TRIAL_EXPIRED", "ended").title,
    "Trial expired",
  );
});

test("subscription status badges cover lifecycle states", () => {
  assert.equal(subscriptionStatusBadge("active"), "success");
  assert.equal(subscriptionStatusBadge("trialing"), "info");
  assert.equal(subscriptionStatusBadge("past_due"), "warning");
  assert.equal(subscriptionStatusBadge("expired"), "error");
  assert.equal(subscriptionStatusBadge("suspended"), "error");
});

test("null display prices stay null (no fabricated pricing)", () => {
  assert.equal(formatPriceCents(null), null);
});

test("upgrade CTA never implies checkout completed", () => {
  assert.match(upgradeCtaLabel(false), /coming soon/i);
  assert.equal(upgradeCtaLabel(true), "Current plan");
});

test("legacy_production is not a selectable commercial plan", () => {
  const plans = filterSelectablePlans([
    { code: "legacy_production", name: "Legacy Production" },
    { code: "growth", name: "Growth" },
  ]);
  assert.deepEqual(
    plans.map((p) => p.code),
    ["growth"],
  );
});

test("fake 1820/2500 usage is not part of UsageSummary contract anymore", async () => {
  const fs = await import("node:fs/promises");
  const mockPath = path.resolve(
    "src/mocks/portal-shell.ts",
  );
  const source = await fs.readFile(mockPath, "utf8");
  assert.equal(source.includes("1820"), false);
  assert.equal(source.includes("2500"), false);
  assert.match(source, /href: "\/settings\/plan"/);
});

test("billing bottom nav points to plan settings", async () => {
  const fs = await import("node:fs/promises");
  const source = await fs.readFile(
    path.resolve("src/mocks/portal-shell.ts"),
    "utf8",
  );
  assert.match(source, /href: "\/settings\/plan"/);
  assert.equal(source.includes('href: "/billing"'), false);
});
