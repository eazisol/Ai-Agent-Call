import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs/promises";
import path from "node:path";

import {
  MARKETING_FORBIDDEN_HREFS,
  MARKETING_LAUNCH_PATHS,
  MARKETING_SITEMAP_READY,
  collectMarketingHrefs,
  marketingAuthCtas,
  marketingExcludedCapabilities,
  marketingFeatures,
  marketingHero,
  marketingHowItWorks,
  marketingSolutions,
  marketingFooterGroups,
  marketingRouteMetadata,
} from "../src/content/marketing.ts";
import { getSitemapReadyPaths } from "../src/content/marketing.ts";

test("marketing owns launch paths and auth CTAs", () => {
  assert.equal(marketingHero.primaryCta.href, "/register");
  assert.equal(marketingHero.secondaryCta.href, "/contact");
  assert.equal(marketingAuthCtas.login.href, "/login");
  assert.equal(marketingAuthCtas.getStarted.href, "/register");
});

test("shell enables launch + auth routes and blocks dead CTAs", () => {
  const auth = ["/login", "/register"];
  function enabled(href) {
    if (MARKETING_FORBIDDEN_HREFS.includes(href)) return false;
    if (auth.includes(href)) return true;
    return MARKETING_LAUNCH_PATHS.includes(href);
  }
  assert.equal(enabled("/"), true);
  assert.equal(enabled("/pricing"), true);
  assert.equal(enabled("/login"), true);
  assert.equal(enabled("/register"), true);
  assert.equal(enabled("/book-demo"), false);
  assert.equal(enabled("/start-free-trial"), false);
  assert.equal(enabled("/dashboard"), false);
});

test("root app page no longer hard-redirects to dashboard", async () => {
  const rootPage = path.join(process.cwd(), "src/app/page.tsx");
  let exists = true;
  try {
    await fs.access(rootPage);
  } catch {
    exists = false;
  }
  assert.equal(exists, false);

  const marketingHome = await fs.readFile(
    path.join(process.cwd(), "src/app/(marketing)/page.tsx"),
    "utf8",
  );
  assert.match(marketingHome, /MarketingHomePage|fetchPublicPlans/);
  assert.equal(marketingHome.includes('redirect("/dashboard")'), false);
});

test("feature registry stays free of excluded capabilities", () => {
  const blob = JSON.stringify(marketingFeatures).toLowerCase();
  for (const word of ["outbound", "crm", "stripe", "analytics dashboard"]) {
    assert.equal(blob.includes(word), false, word);
  }
  assert.ok(marketingExcludedCapabilities.length >= 5);
});

test("how-it-works has six steps", () => {
  assert.equal(marketingHowItWorks.length, 6);
});

test("sitemap readiness includes all launch marketing routes", () => {
  assert.deepEqual(getSitemapReadyPaths(), [...MARKETING_LAUNCH_PATHS]);
  for (const pathName of MARKETING_LAUNCH_PATHS) {
    assert.equal(MARKETING_SITEMAP_READY[pathName], true);
  }
});

test("implemented marketing route files exist", async () => {
  const base = path.join(process.cwd(), "src/app/(marketing)");
  const expected = [
    "page.tsx",
    "features/page.tsx",
    "how-it-works/page.tsx",
    "solutions/page.tsx",
    "pricing/page.tsx",
    "about/page.tsx",
    "contact/page.tsx",
    "faq/page.tsx",
    "privacy/page.tsx",
    "terms/page.tsx",
  ];
  for (const rel of expected) {
    await fs.access(path.join(base, rel));
  }
});

test("canonical hrefs exclude forbidden dead CTAs", () => {
  const hrefs = collectMarketingHrefs();
  for (const forbidden of MARKETING_FORBIDDEN_HREFS) {
    assert.equal(hrefs.includes(forbidden), false);
  }
});

test("no marketing trackers in marketing sources", async () => {
  const roots = [
    path.join(process.cwd(), "src/app/(marketing)"),
    path.join(process.cwd(), "src/components/marketing"),
    path.join(process.cwd(), "src/components/public"),
  ];
  const banned = ["gtag(", "googletagmanager", "facebook.net", "hotjar", "clarity.ms"];
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
  for (const root of roots) {
    await walk(root);
  }
});

test("solutions copy avoids booking/payment/CRM claims as current product", () => {
  const blob = JSON.stringify(marketingSolutions).toLowerCase();
  for (const word of ["appointment booking", "table reservation", "crm synchronization", "payment collection", "stripe"]) {
    assert.equal(blob.includes(word), false, word);
  }
});

test("pricing plans block handles empty and error without fake tiers", async () => {
  const src = await fs.readFile(
    path.join(process.cwd(), "src/components/marketing/pricing-plans-block.tsx"),
    "utf8",
  );
  assert.match(src, /Plans are being finalized/);
  assert.match(src, /Pricing is temporarily unavailable/);
  assert.equal(src.includes("Starter"), false);
  assert.equal(src.includes("fake"), false);
  assert.equal(/\$\d{2,}/.test(src), false);
});

test("public plans helper has no hardcoded plan catalog", async () => {
  const src = await fs.readFile(path.join(process.cwd(), "src/lib/public-plans.ts"), "utf8");
  assert.match(src, /public\/plans/);
  assert.equal(src.includes("Starter"), false);
  assert.equal(src.includes("priceMonthly"), false);
});

test("FAQ page uses canonical content module", async () => {
  const src = await fs.readFile(
    path.join(process.cwd(), "src/app/(marketing)/faq/page.tsx"),
    "utf8",
  );
  assert.match(src, /marketingFaq/);
});

test("footer groups only reference launch or auth paths", () => {
  for (const group of marketingFooterGroups) {
    for (const link of group.links) {
      const ok =
        MARKETING_LAUNCH_PATHS.includes(link.href) ||
        link.href === "/login" ||
        link.href === "/register";
      assert.equal(ok, true, link.href);
    }
  }
});

test("route metadata map covers every launch path", () => {
  for (const pathName of MARKETING_LAUNCH_PATHS) {
    assert.ok(marketingRouteMetadata[pathName], pathName);
    assert.ok(marketingRouteMetadata[pathName].title);
    assert.ok(marketingRouteMetadata[pathName].description);
  }
});
