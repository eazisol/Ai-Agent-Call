#!/usr/bin/env node
/**
 * Authenticated production portal QA harness.
 * Credentials from environment only — never logged.
 *
 * EAZI_PROD_TEST_EMAIL
 * EAZI_PROD_TEST_PASSWORD
 * EAZI_PROD_FRONTEND_URL
 * EAZI_PROD_BACKEND_URL
 * EAZI_PROD_ORG_ID (optional, default D14 org)
 * EAZI_PROD_BUSINESS_ID (optional, default D14 business)
 */

const FRONTEND =
  process.env.EAZI_PROD_FRONTEND_URL?.replace(/\/$/, "") ??
  "https://eazi-ai-call.vercel.app";
const BACKEND =
  process.env.EAZI_PROD_BACKEND_URL?.replace(/\/$/, "") ??
  "http://eaziacall-prod-alb-2044075500.us-east-1.elb.amazonaws.com";
const EMAIL = process.env.EAZI_PROD_TEST_EMAIL?.trim();
const PASSWORD = process.env.EAZI_PROD_TEST_PASSWORD;
const DEFAULT_ORG_ID =
  process.env.EAZI_PROD_ORG_ID ?? "91cef079-51a2-47c7-92aa-98527523ad2b";
const DEFAULT_BUSINESS_ID =
  process.env.EAZI_PROD_BUSINESS_ID ?? "501df018-cb8c-4731-b7d8-bcf68af0e92b";
const DEFAULT_AGENT_ID =
  process.env.EAZI_PROD_AGENT_ID ?? "15784e32-ce59-41e3-91f5-b6f3b3042091";
const TIMEOUT_MS = 20_000;

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

function cookieNames() {
  return [...jar.keys()];
}

function hasCookie(name) {
  return jar.has(name);
}

/**
 * @param {"proxy"|"direct"} mode
 */
async function request(mode, method, route, body) {
  const base =
    mode === "proxy" ? `${FRONTEND}/api/backend` : `${BACKEND}/api/v1`;
  const url = `${base}/${route.replace(/^\//, "")}`;
  const headers = {
    Accept: "application/json",
    "Accept-Encoding": "gzip, deflate, br",
  };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const cookie = cookieHeader();
  if (cookie) headers.Cookie = cookie;

  const started = performance.now();
  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const text = await response.text();
    const ms = Math.round(performance.now() - started);

    if (mode === "proxy") storeSetCookies(response);

    let json = null;
    let parseError = null;
    if (text) {
      try {
        json = JSON.parse(text);
      } catch (error) {
        parseError = error instanceof Error ? error.message : "parse_error";
      }
    }

    const encoding = response.headers.get("content-encoding");
    const length = response.headers.get("content-length");
    const contentType = response.headers.get("content-type");

    return {
      mode,
      method,
      route,
      ms,
      status: response.status,
      code: json?.error?.code ?? null,
      json,
      jsonOk: parseError === null,
      parseError,
      staleEncoding: encoding === "gzip" || encoding === "br" || encoding === "deflate",
      staleLength: length !== null && length !== "",
      contentType,
      bytes: text.length,
    };
  } catch (error) {
    return {
      mode,
      method,
      route,
      ms: Math.round(performance.now() - started),
      status: 0,
      code: error instanceof Error ? error.name : "Error",
      jsonOk: false,
      parseError: error instanceof Error ? error.name : "Error",
      staleEncoding: false,
      staleLength: false,
      contentType: null,
      bytes: 0,
    };
  }
}

function expectOk(result, label) {
  const failures = [];
  if (result.status < 200 || result.status >= 300) {
    failures.push(`status=${result.status} code=${result.code ?? "-"}`);
  }
  if (!result.jsonOk && result.status !== 204) {
    failures.push(`json_parse=${result.parseError ?? "failed"}`);
  }
  if (result.staleEncoding && !result.jsonOk) {
    failures.push("stale_content_encoding");
  }
  if (result.staleLength && !result.jsonOk) {
    failures.push("stale_content_length");
  }
  if (result.status === 0) failures.push("network_or_timeout");
  if (result.status >= 500) failures.push("server_error");
  return { label, pass: failures.length === 0, ms: result.ms, failures, result };
}

async function requestJson(mode, method, route, body) {
  return request(mode, method, route, body);
}

function firstOrganizationId(json) {
  const list = json?.organizations ?? json?.data ?? [];
  return Array.isArray(list) && list.length > 0 ? list[0].id : null;
}

function firstBusinessId(json) {
  const list = json?.businesses ?? json?.data ?? [];
  return Array.isArray(list) && list.length > 0 ? list[0].id : null;
}

function firstAgentId(json) {
  const list = json?.agents ?? json?.data ?? [];
  return Array.isArray(list) && list.length > 0 ? list[0].id : null;
}

/** @type {Array<ReturnType<typeof expectOk>>} */
const checks = [];

async function main() {
  console.log(
    JSON.stringify(
      {
        frontend: FRONTEND,
        backend: BACKEND,
        credentials: EMAIL && PASSWORD ? "provided" : "missing",
      },
      null,
      2,
    ),
  );

  if (!EMAIL || !PASSWORD) {
    console.error("BLOCKED: EAZI_PROD_TEST_EMAIL/PASSWORD required");
    process.exit(2);
  }

  // Health (no auth)
  for (const path of ["/health/live", "/health/ready"]) {
    const started = performance.now();
    const r = await fetch(`${BACKEND}${path}`, {
      signal: AbortSignal.timeout(10_000),
    });
    console.log(
      JSON.stringify({
        health: path,
        status: r.status,
        ms: Math.round(performance.now() - started),
      }),
    );
    if (r.status !== 200) {
      console.error(`BLOCKED: ${path} not 200`);
      process.exit(1);
    }
  }

  // 1 Login
  const login = await request("proxy", "POST", "auth/login", {
    email: EMAIL,
    password: PASSWORD,
  });
  checks.push(expectOk(login, "login"));
  console.log(
    `login status=${login.status} ms=${login.ms} cookies=[${cookieNames().join(",")}]`,
  );
  if (!checks.at(-1)?.pass) {
    reportAndExit();
  }

  // 13 auth/me
  checks.push(expectOk(await request("proxy", "GET", "auth/me"), "auth/me"));

  // 2 organizations
  const orgs = await request("proxy", "GET", "organizations");
  checks.push(expectOk(orgs, "GET /organizations"));
  const organizationId = firstOrganizationId(orgs.json) ?? DEFAULT_ORG_ID;

  // 3 organization active context
  const setOrg = await request("proxy", "POST", "organizations/active", {
    organizationId,
  });
  checks.push(expectOk(setOrg, "POST /organizations/active"));
  checks.push(
    expectOk(
      await request("proxy", "GET", "organizations/active"),
      "GET /organizations/active",
    ),
  );
  if (!hasCookie("eazi_org")) {
    checks.push({
      label: "eazi_org cookie",
      pass: false,
      ms: 0,
      failures: ["missing eazi_org after organizations/active"],
      result: null,
    });
  } else {
    checks.push({
      label: "eazi_org cookie",
      pass: true,
      ms: 0,
      failures: [],
      result: null,
    });
  }

  // 4 businesses list
  const businesses = await request(
    "proxy",
    "GET",
    "businesses?includeArchived=true",
  );
  checks.push(
    expectOk(businesses, "GET /businesses?includeArchived=true"),
  );
  const businessId = firstBusinessId(businesses.json) ?? DEFAULT_BUSINESS_ID;

  // 5 business detail
  checks.push(
    expectOk(
      await request("proxy", "GET", `businesses/${businessId}`),
      "GET /businesses/:id",
    ),
  );

  // 6 business active context
  const setBiz = await request("proxy", "POST", "businesses/active", {
    businessId,
  });
  checks.push(expectOk(setBiz, "POST /businesses/active"));
  checks.push(
    expectOk(
      await request("proxy", "GET", "businesses/active"),
      "GET /businesses/active",
    ),
  );
  if (!hasCookie("eazi_biz")) {
    checks.push({
      label: "eazi_biz cookie",
      pass: false,
      ms: 0,
      failures: ["missing eazi_biz after businesses/active"],
      result: null,
    });
  } else {
    checks.push({
      label: "eazi_biz cookie",
      pass: true,
      ms: 0,
      failures: [],
      result: null,
    });
  }

  // 7–12 portal modules
  const agents = await request("proxy", "GET", "agents");
  checks.push(expectOk(agents, "GET /agents"));
  const agentId = firstAgentId(agents.json) ?? DEFAULT_AGENT_ID;

  const moduleRoutes = [
    [`agents/${agentId}`, "GET /agents/:id"],
    ["calls?direction=inbound", "GET /calls"],
    ["knowledge", "GET /knowledge"],
    ["voices", "GET /voices"],
    ["phone-numbers", "GET /phone-numbers"],
    ["telephony/provider-status", "GET /telephony/provider-status"],
  ];
  for (const [route, label] of moduleRoutes) {
    checks.push(expectOk(await request("proxy", "GET", route), label));
  }

  // Settings reads (organization settings page uses org APIs)
  checks.push(
    expectOk(await request("proxy", "GET", "organizations/active"), "settings/org context"),
  );

  // 14 refresh
  checks.push(
    expectOk(await request("proxy", "POST", "auth/refresh", {}), "POST /auth/refresh"),
  );
  checks.push(
    expectOk(await request("proxy", "GET", "auth/me", undefined), "auth/me after refresh"),
  );

  // Direct vs proxy differential (businesses list)
  const proxyBiz = await request(
    "proxy",
    "GET",
    "businesses?includeArchived=true",
  );
  const directBiz = await request(
    "direct",
    "GET",
    "businesses?includeArchived=true",
  );
  console.log(
    JSON.stringify({
      differential: {
        proxy: { status: proxyBiz.status, ms: proxyBiz.ms, jsonOk: proxyBiz.jsonOk },
        direct: { status: directBiz.status, ms: directBiz.ms, jsonOk: directBiz.jsonOk },
      },
    }),
  );

  // Stability: 60 proxy reads across modules, concurrency 3
  const stabilityRoutes = [
    "organizations",
    "businesses?includeArchived=true",
    `businesses/${businessId}`,
    "agents",
    "calls?direction=inbound",
    "knowledge",
    "voices",
    "phone-numbers",
    "auth/me",
  ];
  const stabilityTimes = [];
  let stabilityFails = 0;
  let index = 0;
  const total = 60;
  async function worker() {
    while (index < total) {
      const i = index++;
      const route = stabilityRoutes[i % stabilityRoutes.length];
      const r = await request("proxy", "GET", route);
      stabilityTimes.push(r.ms);
      if (
        r.status >= 500 ||
        r.status === 0 ||
        !r.jsonOk ||
        (r.staleEncoding && !r.jsonOk) ||
        (r.staleLength && !r.jsonOk)
      ) {
        stabilityFails++;
      }
    }
  }
  await Promise.all([worker(), worker(), worker()]);
  stabilityTimes.sort((a, b) => a - b);
  const stability = {
    total,
    concurrency: 3,
    failures: stabilityFails,
    p50: percentile(stabilityTimes, 50),
    p95: percentile(stabilityTimes, 95),
    max: stabilityTimes[stabilityTimes.length - 1] ?? 0,
  };
  console.log(JSON.stringify({ stability }));

  if (stability.p95 > 2000) {
    checks.push({
      label: "stability p95 <= 2000ms",
      pass: false,
      ms: Math.round(stability.p95),
      failures: [`p95=${Math.round(stability.p95)}ms`],
      result: null,
    });
  } else {
    checks.push({
      label: "stability p95 <= 2000ms",
      pass: true,
      ms: Math.round(stability.p95),
      failures: [],
      result: null,
    });
  }

  // 15 logout
  checks.push(
    expectOk(await request("proxy", "POST", "auth/logout", {}), "POST /auth/logout"),
  );
  const afterLogout = await request("proxy", "GET", "auth/me");
  if (afterLogout.status === 401) {
    checks.push({
      label: "auth/me after logout",
      pass: true,
      ms: afterLogout.ms,
      failures: [],
      result: afterLogout,
    });
  } else {
    checks.push({
      label: "auth/me after logout",
      pass: false,
      ms: afterLogout.ms,
      failures: [`expected 401 got ${afterLogout.status}`],
      result: afterLogout,
    });
  }

  reportAndExit(stability);
}

function reportAndExit(stability) {
  console.log("\n--- CHECKS ---");
  let failed = false;
  for (const check of checks) {
    const status = check.pass ? "PASS" : "BLOCKED";
    if (!check.pass) failed = true;
    console.log(
      `${status} ${check.label}${check.ms ? ` ${check.ms}ms` : ""}${
        check.failures.length ? ` :: ${check.failures.join(", ")}` : ""
      }`,
    );
  }

  console.log(
    `\nRESULT: ${failed ? "AUTHENTICATED PRODUCTION PORTAL QA = BLOCKED" : "AUTHENTICATED PRODUCTION PORTAL QA = PASS"}`,
  );
  process.exit(failed ? 1 : 0);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
