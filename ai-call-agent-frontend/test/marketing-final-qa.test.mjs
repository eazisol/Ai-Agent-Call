import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs/promises";
import path from "node:path";

import {
  MARKETING_FORBIDDEN_HREFS,
  MARKETING_LAUNCH_PATHS,
  collectMarketingHrefs,
  marketingExcludedCapabilities,
  marketingPublicContactEmail,
  marketingLegalCopyStatus,
  marketingRouteMetadata,
} from "../src/content/marketing.ts";
import {
  fetchPublicPlans,
  sanitizePublicPlans,
} from "../src/lib/public-plans.ts";

test("public boundary: contact email unset and legal copy not approved", () => {
  assert.equal(marketingPublicContactEmail, null);
  assert.equal(marketingLegalCopyStatus.privacy, "LEGAL_COPY_REQUIRED");
  assert.equal(marketingLegalCopyStatus.terms, "LEGAL_COPY_REQUIRED");
});

test("public pricing never surfaces legacy_production", () => {
  const plans = sanitizePublicPlans({
    plans: [
      {
        code: "legacy_production",
        name: "Legacy",
        description: null,
        sortOrder: 0,
        isRecommended: false,
        trialEligible: false,
        trialDays: null,
        price: { currency: "USD", monthlyCents: 0, annualCents: null },
        comparison: null,
        ctaLabel: null,
      },
      {
        code: "starter",
        name: "Starter Live",
        description: "Real plan",
        sortOrder: 1,
        isRecommended: true,
        trialEligible: true,
        trialDays: 14,
        price: { currency: "USD", monthlyCents: 4900, annualCents: 49000 },
        comparison: { headlineFeatures: ["1 agent"] },
        ctaLabel: "Get Started",
        stripePriceId: "price_secret",
        organizationId: "org_secret",
      },
    ],
  });
  assert.equal(plans.length, 1);
  assert.equal(plans[0].code, "starter");
  assert.equal("stripePriceId" in plans[0], false);
  assert.equal("organizationId" in plans[0], false);
});

test("pricing error path stays safe without fake catalog", async () => {
  const prev = process.env.INTERNAL_API_BASE_URL;
  process.env.INTERNAL_API_BASE_URL = "http://127.0.0.1:9";
  try {
    const result = await fetchPublicPlans(async () => {
      throw new Error("ECONNREFUSED internal detail");
    });
    assert.equal(result.status, "error");
    assert.deepEqual(result.plans, []);
    assert.equal(JSON.stringify(result).includes("ECONNREFUSED"), false);
    assert.equal(JSON.stringify(result).includes("Starter"), false);
  } finally {
    if (prev === undefined) delete process.env.INTERNAL_API_BASE_URL;
    else process.env.INTERNAL_API_BASE_URL = prev;
  }
});

test("canonical marketing hrefs have no dead CTAs or hash nav", () => {
  const hrefs = collectMarketingHrefs();
  for (const href of hrefs) {
    assert.notEqual(href, "#");
    assert.equal(href.startsWith("javascript:"), false);
    assert.equal(MARKETING_FORBIDDEN_HREFS.includes(href), false);
  }
});

test("metadata titles are unique across launch routes", () => {
  const titles = MARKETING_LAUNCH_PATHS.map((p) => marketingRouteMetadata[p].title);
  assert.equal(new Set(titles).size, titles.length);
});

test("marketing sources do not include trackers", async () => {
  const roots = [
    path.join(process.cwd(), "src/app/(marketing)"),
    path.join(process.cwd(), "src/components/marketing"),
    path.join(process.cwd(), "src/content"),
  ];
  const banned = ["gtag(", "googletagmanager", "facebook.net", "hotjar", "clarity.ms", "tiktok"];
  async function walk(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
        continue;
      }
      if (!/\.(tsx?|jsx?|mjs|css)$/.test(entry.name)) continue;
      const text = (await fs.readFile(full, "utf8")).toLowerCase();
      for (const token of banned) {
        assert.equal(text.includes(token), false, `${full} :: ${token}`);
      }
    }
  }
  for (const root of roots) await walk(root);
});

test("excluded capabilities are documented and not in marketable feature titles", async () => {
  assert.ok(marketingExcludedCapabilities.length >= 5);
  const mod = await import("../src/content/marketing.ts");
  const titles = JSON.stringify(mod.marketingFeatures.map((f) => f.title)).toLowerCase();
  for (const word of ["outbound", "crm", "analytics", "stripe"]) {
    assert.equal(titles.includes(word), false, word);
  }
});