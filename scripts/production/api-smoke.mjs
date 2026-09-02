#!/usr/bin/env node
/**
 * Production API smoke tool.
 * Credentials only from environment — never hardcoded, never logged.
 *
 * EAZI_PROD_TEST_EMAIL
 * EAZI_PROD_TEST_PASSWORD
 * EAZI_PROD_FRONTEND_URL (default https://eazi-ai-call.vercel.app)
 * EAZI_PROD_BACKEND_URL (default https://dl1t1qnfxrdka.cloudfront.net)
 */

const FRONTEND =
  process.env.EAZI_PROD_FRONTEND_URL?.replace(/\/$/, "") ??
  "https://eazi-ai-call.vercel.app";
const BACKEND =
  process.env.EAZI_PROD_BACKEND_URL?.replace(/\/$/, "") ??
  "https://dl1t1qnfxrdka.cloudfront.net";

const EMAIL = process.env.EAZI_PROD_TEST_EMAIL?.trim();
const PASSWORD = process.env.EAZI_PROD_TEST_PASSWORD;

/** @type {Map<string, string>} */
const jar = new Map();

function storeSetCookies(response, label) {
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
    if (!value) {
      jar.delete(name);
    } else {
      jar.set(name, value);
    }
  }
  return cookies.map((raw) => raw.split(";")[0].split("=")[0]);
}

function cookieHeader() {
  if (jar.size === 0) return undefined;
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

/**
 * @param {"proxy"|"direct"} mode
 */
async function call(mode, method, route, body) {
  const base =
    mode === "proxy"
      ? `${FRONTEND}/api/backend`
      : `${BACKEND}/api/v1`;
  const url = `${base}/${route.replace(/^\//, "")}`;
  const headers = { Accept: "application/json" };
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  const cookie = cookieHeader();
  if (cookie) headers.Cookie = cookie;

  const started = Date.now();
  let response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    });
  } catch (error) {
    return {
      mode,
      method,
      route,
      ms: Date.now() - started,
      category: "NETWORK",
      status: 0,
      code: error instanceof Error ? error.name : "Error",
    };
  }

  const text = await response.text();
  let code;
  try {
    code = JSON.parse(text)?.error?.code;
  } catch {
    code = undefined;
  }

  if (mode === "proxy") {
    storeSetCookies(response);
  }

  let category = "OK";
  if (response.status >= 500) category = "SERVER";
  else if (response.status >= 400) category = "CLIENT";
  else if (response.status >= 200 && response.status < 300) category = "OK";

  return {
    mode,
    method,
    route,
    ms: Date.now() - started,
    category,
    status: response.status,
    code: code ?? null,
    cookies: mode === "proxy" ? [...jar.keys()] : undefined,
  };
}

function printRow(result) {
  const cookieNames = result.cookies?.length
    ? ` cookies=[${result.cookies.join(",")}]`
    : "";
  console.log(
    `${result.mode.padEnd(6)} ${result.method.padEnd(6)} ${result.route.padEnd(28)} ${String(result.status).padEnd(4)} ${result.category.padEnd(7)} ${result.code ?? "-"}${cookieNames}`,
  );
}

async function main() {
  console.log(`frontend=${FRONTEND}`);
  console.log(`backend=${BACKEND}`);
  console.log(`credentials=${EMAIL && PASSWORD ? "provided" : "missing"}`);
  console.log("mode   method route                        stat cat     code");
  console.log("-".repeat(90));

  const cases = [
    ["GET", "auth/me", undefined],
    ["POST", "auth/login", { email: "invalid@example.com", password: "dummy-not-real" }],
    ["GET", "organizations", undefined],
    ["POST", "organizations", { name: "QA Smoke Org" }],
    ["GET", "businesses", undefined],
    [
      "POST",
      "businesses",
      {
        name: "QA Smoke Biz",
        industry: "other",
        email: "qa-smoke@example.com",
        timezone: "UTC",
        defaultLanguage: "en",
        languages: ["en"],
      },
    ],
    ["GET", "agents", undefined],
    ["GET", "calls?direction=inbound", undefined],
    ["GET", "knowledge", undefined],
    ["GET", "voices", undefined],
    ["GET", "phone-numbers", undefined],
    ["GET", "telephony/provider-status", undefined],
  ];

  for (const [method, route, body] of cases) {
    for (const mode of ["proxy", "direct"]) {
      printRow(await call(mode, method, route, body));
    }
  }

  if (EMAIL && PASSWORD) {
    console.log("-".repeat(90));
    console.log("authenticated session");
    const login = await call("proxy", "POST", "auth/login", {
      email: EMAIL,
      password: PASSWORD,
    });
    printRow(login);
    if (login.status >= 200 && login.status < 300) {
      for (const route of [
        "auth/me",
        "organizations",
        "organizations/active",
        "businesses",
        "businesses/active",
        "agents",
        "calls?direction=inbound",
        "knowledge",
        "voices",
        "phone-numbers",
        "telephony/provider-status",
      ]) {
        printRow(await call("proxy", "GET", route, undefined));
      }
      printRow(await call("proxy", "POST", "auth/logout", {}));
      printRow(await call("proxy", "GET", "auth/me", undefined));
    }
  } else {
    console.log("-".repeat(90));
    console.log(
      "Set EAZI_PROD_TEST_EMAIL and EAZI_PROD_TEST_PASSWORD for authenticated smoke.",
    );
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
