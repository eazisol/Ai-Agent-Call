#!/usr/bin/env node
/**
 * Production API performance harness.
 * Credentials from env only — never logged.
 *
 * EAZI_PROD_TEST_EMAIL
 * EAZI_PROD_TEST_PASSWORD
 * EAZI_PROD_FRONTEND_URL (default https://eazi-ai-call.vercel.app)
 * EAZI_PROD_BACKEND_URL (default https://dl1t1qnfxrdka.cloudfront.net)
 * PERF_ITERATIONS (default 10)
 */

const FRONTEND =
  process.env.EAZI_PROD_FRONTEND_URL?.replace(/\/$/, "") ??
  "https://eazi-ai-call.vercel.app";
const BACKEND =
  process.env.EAZI_PROD_BACKEND_URL?.replace(/\/$/, "") ??
  "https://dl1t1qnfxrdka.cloudfront.net";
const EMAIL = process.env.EAZI_PROD_TEST_EMAIL?.trim();
const PASSWORD = process.env.EAZI_PROD_TEST_PASSWORD;
const ITERATIONS = Math.max(
  1,
  Number.parseInt(process.env.PERF_ITERATIONS ?? "10", 10) || 10,
);
const TIMEOUT_MS = Number.parseInt(process.env.PERF_TIMEOUT_MS ?? "20000", 10);
const PLACEHOLDER_BUSINESS_ID = "501df018-cb8c-4731-b7d8-bcf68af0e92b";
const PLACEHOLDER_AGENT_ID = "15784e32-ce59-41e3-91f5-b6f3b3042091";

/** @type {Map<string, string>} */
const jar = new Map();

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const idx = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((p / 100) * sorted.length) - 1),
  );
  return sorted[idx];
}

function stats(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return {
    n: sorted.length,
    min: sorted[0] ?? 0,
    p50: percentile(sorted, 50),
    p95: percentile(sorted, 95),
    max: sorted[sorted.length - 1] ?? 0,
  };
}

function storeSetCookies(response) {
  const cookies =
    typeof response.headers.getSetCookie === "function"
      ? response.headers.getSetCookie()
      : [];
  for (const raw of cookies) {
    const [pair] = raw.split(";");
    const eq = pair.indexOf("=");
    if (eq <= 0) continue;
    const name = pair.slice(0, eq).trim();
    const value = pair.slice(eq + 1).trim();
    if (!value) jar.delete(name);
    else jar.set(name, value);
  }
}

function cookieHeader() {
  return jar.size
    ? [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ")
    : undefined;
}

async function timedFetch(mode, method, route) {
  const base = mode === "proxy" ? `${FRONTEND}/api/backend` : `${BACKEND}/api/v1`;
  const url = `${base}/${route.replace(/^\//, "")}`;
  const headers = { Accept: "application/json" };
  const cookie = cookieHeader();
  if (cookie) headers.Cookie = cookie;

  const started = performance.now();
  try {
    const response = await fetch(url, {
      method,
      headers,
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const body = await response.text();
    const ms = performance.now() - started;
    if (mode === "proxy") storeSetCookies(response);
    return {
      ok: true,
      ms,
      status: response.status,
      bytes: body.length,
      vercelRegion: response.headers.get("x-vercel-id")?.split("::")[1] ?? null,
    };
  } catch (error) {
    return {
      ok: false,
      ms: performance.now() - started,
      status: 0,
      error: error instanceof Error ? error.name : "Error",
    };
  }
}

const ROUTES = [
  { method: "GET", route: "auth/me", auth: true },
  { method: "GET", route: "organizations", auth: true },
  { method: "GET", route: "organizations/active", auth: true },
  { method: "GET", route: "businesses?includeArchived=true", auth: true },
  {
    method: "GET",
    route: "businesses/501df018-cb8c-4731-b7d8-bcf68af0e92b",
    auth: true,
  },
  { method: "GET", route: "agents", auth: true },
  {
    method: "GET",
    route: "agents/15784e32-ce59-41e3-91f5-b6f3b3042091",
    auth: true,
  },
  { method: "GET", route: "calls?direction=inbound", auth: true },
  { method: "GET", route: "knowledge", auth: true },
  { method: "GET", route: "voices", auth: true },
  { method: "GET", route: "phone-numbers", auth: true },
  { method: "GET", route: "telephony/provider-status", auth: true },
];

async function login() {
  const response = await fetch(`${FRONTEND}/api/backend/auth/login`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  storeSetCookies(response);
  const text = await response.text();
  const status = response.status;

  let activeAgentId = process.env.EAZI_PROD_AGENT_ID ?? null;
  let activeBusinessId = process.env.EAZI_PROD_BUSINESS_ID ?? null;

  if (status >= 200 && status < 300) {
    const orgResponse = await fetch(`${FRONTEND}/api/backend/organizations`, {
      headers: { Accept: "application/json", Cookie: cookieHeader() },
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    storeSetCookies(orgResponse);
    let orgId = process.env.EAZI_PROD_ORG_ID;
    try {
      const payload = JSON.parse(await orgResponse.text());
      orgId = orgId ?? payload?.organizations?.[0]?.id;
    } catch {
      // ignore
    }
    if (orgId) {
      const setOrg = await fetch(`${FRONTEND}/api/backend/organizations/active`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Cookie: cookieHeader(),
        },
        body: JSON.stringify({ organizationId: orgId }),
        cache: "no-store",
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      storeSetCookies(setOrg);
      await setOrg.text();

      const bizResponse = await fetch(
        `${FRONTEND}/api/backend/businesses?includeArchived=true`,
        {
          headers: { Accept: "application/json", Cookie: cookieHeader() },
          cache: "no-store",
          signal: AbortSignal.timeout(TIMEOUT_MS),
        },
      );
      storeSetCookies(bizResponse);
      let businessId = process.env.EAZI_PROD_BUSINESS_ID;
      try {
        const payload = JSON.parse(await bizResponse.text());
        businessId = businessId ?? payload?.businesses?.[0]?.id;
      } catch {
        // ignore
      }
      if (businessId) {
        activeBusinessId = businessId;
        const setBiz = await fetch(`${FRONTEND}/api/backend/businesses/active`, {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Cookie: cookieHeader(),
          },
          body: JSON.stringify({ businessId }),
          cache: "no-store",
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        storeSetCookies(setBiz);
        await setBiz.text();
      }

      const agentsResponse = await fetch(`${FRONTEND}/api/backend/agents`, {
        headers: { Accept: "application/json", Cookie: cookieHeader() },
        cache: "no-store",
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      storeSetCookies(agentsResponse);
      try {
        const payload = JSON.parse(await agentsResponse.text());
        activeAgentId = activeAgentId ?? payload?.agents?.[0]?.id;
      } catch {
        // ignore
      }
    }
  }

  return { status, activeAgentId, activeBusinessId };
}

async function main() {
  console.log(
    JSON.stringify(
      {
        frontend: FRONTEND,
        backend: BACKEND,
        iterations: ITERATIONS,
        timeoutMs: TIMEOUT_MS,
        credentials: EMAIL && PASSWORD ? "provided" : "missing",
      },
      null,
      2,
    ),
  );

  if (!EMAIL || !PASSWORD) {
    console.log("\nUnauthenticated sample (auth/me only):");
    for (const mode of ["proxy", "direct"]) {
      const samples = [];
      for (let i = 0; i < ITERATIONS; i++) {
        const r = await timedFetch(mode, "GET", "auth/me");
        samples.push(r.ms);
      }
      console.log(`${mode} auth/me`, stats(samples));
    }
    console.log("\nSet EAZI_PROD_TEST_EMAIL/PASSWORD for full matrix.");
    return;
  }

  const loginStatus = await login();
  const activeAgentId = loginStatus.activeAgentId ?? PLACEHOLDER_AGENT_ID;
  const activeBusinessId =
    loginStatus.activeBusinessId ?? PLACEHOLDER_BUSINESS_ID;
  console.log(
    `login_status=${loginStatus.status} cookies=[${[...jar.keys()].join(",")}]`,
  );

  /** @type {Record<string, unknown>} */
  const report = {};

  const perfRoutes = ROUTES.map((entry) => {
    if (
      entry.route.startsWith("agents/") &&
      entry.route.includes(PLACEHOLDER_AGENT_ID)
    ) {
      return { ...entry, route: `agents/${activeAgentId}` };
    }
    if (
      entry.route.startsWith("businesses/") &&
      entry.route.includes(PLACEHOLDER_BUSINESS_ID)
    ) {
      return { ...entry, route: `businesses/${activeBusinessId}` };
    }
    return entry;
  });

  for (const { method, route } of perfRoutes) {
    for (const mode of ["proxy", "direct"]) {
      const key = `${mode}:${method}:${route}`;
      const samples = [];
      let errors = 0;
      const statuses = new Set();
      for (let i = 0; i < ITERATIONS; i++) {
        const r = await timedFetch(mode, method, route);
        samples.push(r.ms);
        if (!r.ok || r.status >= 500 || r.status === 0) errors++;
        statuses.add(r.status);
      }
      report[key] = { ...stats(samples), errors, statuses: [...statuses] };
    }
  }

  console.log("\n--- RESULTS ---");
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
