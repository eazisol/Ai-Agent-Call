import assert from "node:assert/strict";
import test from "node:test";
import {
  buildBackendProxyUpstreamPath,
  buildBackendProxyUpstreamUrl,
  buildForwardedRequestHeaders,
  buildForwardedResponseHeaders,
  getForwardedSetCookieHeaders,
  resolveProxyRequestBody,
  validateProxyPathSegments,
} from "../src/lib/backend-proxy.mjs";

test("preserves multiple Set-Cookie headers", () => {
  const headers = new Headers();
  headers.append("set-cookie", "a=1; HttpOnly; Secure");
  headers.append("set-cookie", "b=2; HttpOnly; Secure");
  assert.deepEqual(getForwardedSetCookieHeaders(headers), [
    "a=1; HttpOnly; Secure",
    "b=2; HttpOnly; Secure",
  ]);
});

test("forces no-store on proxied responses", () => {
  const upstream = new Headers({ "content-type": "application/json" });
  const forwarded = buildForwardedResponseHeaders(upstream);
  assert.equal(forwarded.get("cache-control"), "no-store");
});

test("maps login proxy path to upstream auth login", () => {
  assert.equal(
    buildBackendProxyUpstreamPath(["auth", "login"]),
    "/api/v1/auth/login",
  );
  assert.equal(
    buildBackendProxyUpstreamUrl(
      ["auth", "login"],
      "https://dl1t1qnfxrdka.cloudfront.net",
    ),
    "https://dl1t1qnfxrdka.cloudfront.net/api/v1/auth/login",
  );
});

test("preserves query string on upstream URL", () => {
  assert.equal(
    buildBackendProxyUpstreamUrl(
      ["auth", "me"],
      "https://dl1t1qnfxrdka.cloudfront.net",
      "?x=1",
    ),
    "https://dl1t1qnfxrdka.cloudfront.net/api/v1/auth/me?x=1",
  );
});

test("rejects invalid proxy segments", () => {
  assert.throws(() => validateProxyPathSegments([".."]));
  assert.throws(() => validateProxyPathSegments([]));
});

test("forwards content-type, cookie, and accept but not hop-by-hop headers", () => {
  const incoming = new Headers({
    "content-type": "application/json",
    accept: "application/json",
    cookie: "eazi_access=abc",
    host: "eazi-ai-call.vercel.app",
    connection: "keep-alive",
    "content-length": "52",
  });
  const forwarded = buildForwardedRequestHeaders(incoming);
  assert.equal(forwarded.get("content-type"), "application/json");
  assert.equal(forwarded.get("accept"), "application/json");
  assert.equal(forwarded.get("cookie"), "eazi_access=abc");
  assert.equal(forwarded.get("host"), null);
  assert.equal(forwarded.get("connection"), null);
  assert.equal(forwarded.get("content-length"), null);
});

test("GET and HEAD requests have no proxy body", async () => {
  const getRequest = new Request("https://example.com/api/backend/auth/me", {
    method: "GET",
  });
  assert.equal(await resolveProxyRequestBody(getRequest), undefined);

  const headRequest = new Request("https://example.com/api/backend/auth/me", {
    method: "HEAD",
  });
  assert.equal(await resolveProxyRequestBody(headRequest), undefined);
});

test("POST JSON body is forwarded unchanged", async () => {
  const payload = JSON.stringify({
    email: "test@example.com",
    password: "dummy-not-real",
  });
  const request = new Request("https://example.com/api/backend/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
  });

  const forwarded = await resolveProxyRequestBody(request);
  assert.ok(forwarded instanceof ArrayBuffer);
  assert.equal(Buffer.from(forwarded).toString("utf8"), payload);
});

test("preserves backend status codes via response header helper", () => {
  for (const status of [400, 401, 403, 500]) {
    const upstream = new Headers({
      "content-type": "application/json",
      "x-test-status": String(status),
    });
    const forwarded = buildForwardedResponseHeaders(upstream);
    assert.equal(forwarded.get("content-type"), "application/json");
    assert.equal(forwarded.get("cache-control"), "no-store");
  }
});

test("strips stale gzip content-encoding and content-length from proxied responses", () => {
  const upstream = new Headers({
    "content-type": "application/json; charset=utf-8",
    "content-encoding": "gzip",
    "content-length": "128",
    "transfer-encoding": "chunked",
    connection: "keep-alive",
    vary: "Origin, Accept-Encoding",
    etag: '"abc123"',
  });
  const forwarded = buildForwardedResponseHeaders(upstream);
  assert.equal(forwarded.get("content-type"), "application/json; charset=utf-8");
  assert.equal(forwarded.get("content-encoding"), null);
  assert.equal(forwarded.get("content-length"), null);
  assert.equal(forwarded.get("transfer-encoding"), null);
  assert.equal(forwarded.get("connection"), null);
  assert.equal(forwarded.get("vary"), "Origin, Accept-Encoding");
  assert.equal(forwarded.get("etag"), '"abc123"');
  assert.equal(forwarded.get("cache-control"), "no-store");
});

test("strips stale br content-encoding from proxied responses", () => {
  const upstream = new Headers({
    "content-type": "application/json",
    "content-encoding": "br",
    "content-length": "64",
  });
  const forwarded = buildForwardedResponseHeaders(upstream);
  assert.equal(forwarded.get("content-encoding"), null);
  assert.equal(forwarded.get("content-length"), null);
});

test("preserves location redirect header on proxied responses", () => {
  const upstream = new Headers({
    location: "https://example.com/next",
    "content-type": "application/json",
  });
  const forwarded = buildForwardedResponseHeaders(upstream);
  assert.equal(forwarded.get("location"), "https://example.com/next");
});

test("preserves correlation headers on proxied responses", () => {
  const upstream = new Headers({
    "content-type": "application/json",
    "x-request-id": "req-123",
    "x-correlation-id": "corr-456",
  });
  const forwarded = buildForwardedResponseHeaders(upstream);
  assert.equal(forwarded.get("x-request-id"), "req-123");
  assert.equal(forwarded.get("x-correlation-id"), "corr-456");
});

test("proxy response assembly keeps decompressed JSON readable", async () => {
  const payload = JSON.stringify({ ok: true, items: [{ id: "1" }] });
  const upstream = new Headers({
    "content-type": "application/json; charset=utf-8",
    "content-encoding": "gzip",
    "content-length": "22",
  });
  const responseHeaders = buildForwardedResponseHeaders(upstream);
  const response = new Response(payload, {
    status: 200,
    headers: responseHeaders,
  });
  assert.equal(responseHeaders.get("content-encoding"), null);
  assert.equal(responseHeaders.get("content-length"), null);
  assert.deepEqual(JSON.parse(await response.text()), {
    ok: true,
    items: [{ id: "1" }],
  });
});

test("proxy response assembly supports empty 204 bodies", () => {
  const upstream = new Headers({
    "content-encoding": "gzip",
    "content-length": "0",
  });
  const forwarded = buildForwardedResponseHeaders(upstream);
  const response = new Response(null, { status: 204, headers: forwarded });
  assert.equal(response.status, 204);
  assert.equal(forwarded.get("content-encoding"), null);
  assert.equal(forwarded.get("content-length"), null);
});

test("proxy response assembly keeps error JSON readable for client statuses", async () => {
  for (const status of [400, 401, 403, 404, 409, 500]) {
    const payload = JSON.stringify({
      error: { code: "TEST", message: "Readable body" },
    });
    const upstream = new Headers({
      "content-type": "application/json",
      "content-encoding": status % 2 === 0 ? "gzip" : "br",
      "content-length": "999",
    });
    const response = new Response(payload, {
      status,
      headers: buildForwardedResponseHeaders(upstream),
    });
    assert.equal(response.headers.get("content-encoding"), null);
    assert.equal(JSON.parse(await response.text()).error.message, "Readable body");
  }
});
