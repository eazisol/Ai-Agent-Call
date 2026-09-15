import assert from "node:assert/strict";
import test from "node:test";

import {
  MARKETING_FORBIDDEN_HREFS,
  MARKETING_LAUNCH_PATHS,
  MARKETING_ROBOTS_DISALLOW,
  MARKETING_SITEMAP_READY,
  collectMarketingHrefs,
  getSitemapReadyPaths,
  marketingAuthCtas,
  marketingContactStrategy,
  marketingExcludedCapabilities,
  marketingFeatures,
  marketingFooterGroups,
  marketingHero,
  marketingHowItWorks,
  marketingLegalCopyStatus,
  marketingOgImageStatus,
  marketingPublicContactEmail,
  marketingRouteMetadata,
  marketingSolutions,
} from "../src/content/marketing.ts";
import {
  PUBLIC_PLANS_REVALIDATE_SECONDS,
  fetchPublicPlans,
  publicPlansUrl,
  normalizePublicPlansApiBase,
  resolvePublicPlansApiBase,
  LOCAL_PUBLIC_PLANS_API_BASE,
  sanitizePublicPlans,
} from "../src/lib/public-plans.ts";

test("auth CTAs use real login/register routes", () => {
  assert.equal(marketingAuthCtas.login.href, "/login");
  assert.equal(marketingAuthCtas.getStarted.href, "/register");
  assert.equal(marketingHero.primaryCta.href, "/register");
  assert.equal(marketingHero.secondaryCta.href, "/contact");
});

test("canonical marketing config has no dead demo/trial CTAs", () => {
  const hrefs = collectMarketingHrefs();
  for (const forbidden of MARKETING_FORBIDDEN_HREFS) {
    assert.equal(hrefs.includes(forbidden), false, `found ${forbidden}`);
  }
  assert.equal(hrefs.includes("/book-demo"), false);
  assert.equal(hrefs.includes("/start-free-trial"), false);
});

test("feature registry excludes unavailable commercial capabilities", () => {
  assert.ok(marketingFeatures.length >= 8);
  const blob = JSON.stringify(marketingFeatures).toLowerCase();
  for (const excluded of [
    "outbound",
    "appointment booking",
    "restaurant reservation",
    "crm",
    "stripe",
    "analytics dashboard",
    "usage metering",
  ]) {
    assert.equal(blob.includes(excluded), false, excluded);
  }
  assert.ok(marketingExcludedCapabilities.includes("Outbound calls"));
  assert.ok(marketingExcludedCapabilities.includes("Stripe billing / checkout"));
});

test("how-it-works has six product-aligned steps without CRM/booking", () => {
  assert.equal(marketingHowItWorks.length, 6);
  const text = JSON.stringify(marketingHowItWorks).toLowerCase();
  assert.equal(text.includes("crm"), false);
  assert.equal(text.includes("appointment"), false);
  assert.equal(text.includes("reservation"), false);
});

test("solutions do not promise booking or payments", () => {
  const text = JSON.stringify(marketingSolutions).toLowerCase();
  assert.match(text, /restaurants/);
  assert.equal(text.includes("reservation booking"), false);
  assert.equal(text.includes("payment collection"), false);
  assert.equal(text.includes("crm sync"), false);
});

test("footer and header destinations stay within launch IA + auth", () => {
  const allowed = new Set([
    ...MARKETING_LAUNCH_PATHS,
    "/login",
    "/register",
  ]);
  for (const href of collectMarketingHrefs()) {
    assert.ok(allowed.has(href), `unexpected href ${href}`);
  }
  for (const group of marketingFooterGroups) {
    for (const link of group.links) {
      assert.ok(allowed.has(link.href), link.href);
    }
  }
});

test("SEO metadata exists for every launch route", () => {
  for (const path of MARKETING_LAUNCH_PATHS) {
    const meta = marketingRouteMetadata[path];
    assert.ok(meta, path);
    assert.ok(meta.title.length > 0);
    assert.ok(meta.description.length > 20);
    assert.equal(meta.canonicalPath, path);
  }
});

test("robots disallow list covers private app surfaces", () => {
  for (const path of [
    "/dashboard",
    "/settings",
    "/admin",
    "/calls",
    "/api/",
  ]) {
    assert.ok(
      MARKETING_ROBOTS_DISALLOW.includes(path),
      `missing disallow ${path}`,
    );
  }
});

test("sitemap registry excludes private routes and is empty until pages ship", () => {
  const ready = getSitemapReadyPaths();
  assert.equal(ready.includes("/"), true);
  assert.equal(ready.includes("/pricing"), true);
  assert.equal(ready.length, MARKETING_LAUNCH_PATHS.length);
  for (const path of MARKETING_LAUNCH_PATHS) {
    assert.equal(MARKETING_SITEMAP_READY[path], true);
  }
  const privatePaths = ["/dashboard", "/admin", "/settings", "/calls"];
  for (const path of privatePaths) {
    assert.equal(MARKETING_LAUNCH_PATHS.includes(path), false, path);
  }
});

test("public plans URL targets M25 public endpoint", () => {
  assert.equal(
    publicPlansUrl("http://127.0.0.1:3000/api/v1"),
    "http://127.0.0.1:3000/api/v1/public/plans",
  );
  assert.equal(
    publicPlansUrl("http://eaziacall-prod-alb.example.elb.amazonaws.com"),
    "http://eaziacall-prod-alb.example.elb.amazonaws.com/api/v1/public/plans",
  );
  assert.equal(PUBLIC_PLANS_REVALIDATE_SECONDS, 300);
});

test("sanitizePublicPlans drops legacy_production and keeps public DTO shape", () => {
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
        price: { currency: "USD", monthlyCents: null, annualCents: null },
        comparison: null,
        ctaLabel: null,
      },
      {
        code: "growth",
        name: "Growth",
        description: "Public",
        sortOrder: 1,
        isRecommended: true,
        trialEligible: true,
        trialDays: 14,
        price: { currency: "USD", monthlyCents: 4900, annualCents: null },
        comparison: { headlineFeatures: ["Agents"] },
        ctaLabel: "Start",
      },
    ],
  });
  assert.equal(plans.length, 1);
  assert.equal(plans[0].code, "growth");
  assert.equal(plans[0].price.monthlyCents, 4900);
});

test("fetchPublicPlans treats empty array as empty not error", async () => {
  const prev = process.env.INTERNAL_API_BASE_URL;
  process.env.INTERNAL_API_BASE_URL = "http://example.test/api/v1";
  try {
    const result = await fetchPublicPlans(async () => {
      return new Response(JSON.stringify({ plans: [] }), { status: 200 });
    });
    assert.equal(result.status, "empty");
    assert.deepEqual(result.plans, []);
  } finally {
    if (prev === undefined) delete process.env.INTERNAL_API_BASE_URL;
    else process.env.INTERNAL_API_BASE_URL = prev;
  }
});

test("fetchPublicPlans returns safe error without fake plans", async () => {
  const prev = process.env.INTERNAL_API_BASE_URL;
  process.env.INTERNAL_API_BASE_URL = "http://example.test/api/v1";
  try {
    const result = await fetchPublicPlans(async () => {
      throw new Error("network down");
    });
    assert.equal(result.status, "error");
    assert.deepEqual(result.plans, []);
    assert.match(result.message, /temporarily unavailable/i);
  } finally {
    if (prev === undefined) delete process.env.INTERNAL_API_BASE_URL;
    else process.env.INTERNAL_API_BASE_URL = prev;
  }
});

test("contact and legal foundations do not invent details", () => {
  assert.equal(marketingPublicContactEmail, null);
  assert.equal(marketingLegalCopyStatus.privacy, "LEGAL_COPY_REQUIRED");
  assert.equal(marketingLegalCopyStatus.terms, "LEGAL_COPY_REQUIRED");
  assert.equal(marketingContactStrategy.mailto, null);
  assert.equal(marketingContactStrategy.getStartedHref, "/register");
  assert.equal(marketingOgImageStatus, "OG_IMAGE_OPTIONAL");
});

test("content truth: no fake social proof language in launch content", async () => {
  const fs = await import("node:fs/promises");
  const path = await import("node:path");
  const file = path.join(process.cwd(), "src/content/marketing.ts");
  const text = await fs.readFile(file, "utf8");
  for (const banned of [
    "#1",
    "best AI",
    "HIPAA",
    "100% accuracy",
    "zero missed",
    "guarantees leads",
    "customer logos",
    "99.9%",
  ]) {
    assert.equal(text.toLowerCase().includes(banned.toLowerCase()), false, banned);
  }
});

test("normalizePublicPlansApiBase appends /api/v1 when origin-only", () => {
  assert.equal(
    normalizePublicPlansApiBase("http://example.test"),
    "http://example.test/api/v1",
  );
  assert.equal(
    normalizePublicPlansApiBase("http://example.test/api/v1/"),
    "http://example.test/api/v1",
  );
});

test("resolvePublicPlansApiBase prefers INTERNAL_API then origin then loopback", () => {
  assert.equal(
    resolvePublicPlansApiBase({ INTERNAL_API_BASE_URL: "http://a.test/api/v1" }),
    "http://a.test/api/v1",
  );
  assert.equal(
    resolvePublicPlansApiBase({ INTERNAL_BACKEND_ORIGIN: "http://b.test" }),
    "http://b.test/api/v1",
  );
  assert.equal(resolvePublicPlansApiBase({}), LOCAL_PUBLIC_PLANS_API_BASE);
});

test("fetchPublicPlans treats malformed plans envelope as error not empty", async () => {
  const result = await fetchPublicPlans(
    async () =>
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    { INTERNAL_API_BASE_URL: "http://example.test/api/v1" },
  );
  assert.equal(result.status, "error");
  assert.deepEqual(result.plans, []);
});

test("200 with plans array renders success path for fixture plan", async () => {
  const result = await fetchPublicPlans(
    async () =>
      new Response(
        JSON.stringify({
          plans: [
            {
              code: "starter",
              name: "Starter Live",
              description: "Real",
              sortOrder: 1,
              isRecommended: true,
              trialEligible: false,
              trialDays: null,
              price: { currency: "USD", monthlyCents: 4900, annualCents: null },
              comparison: { headlineFeatures: ["1 agent"] },
              ctaLabel: "Get Started",
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    { INTERNAL_API_BASE_URL: "http://example.test/api/v1" },
  );
  assert.equal(result.status, "success");
  assert.equal(result.plans.length, 1);
  assert.equal(result.plans[0].code, "starter");
});