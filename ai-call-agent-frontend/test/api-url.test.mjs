import assert from "node:assert/strict";
import test from "node:test";
import {
  buildApiUrl,
  buildBackendProxyUpstreamPath,
  buildBackendProxyUpstreamUrl,
  resolveBackendProxyOrigin,
  validateProxyPathSegments,
} from "../src/lib/backend-proxy.mjs";

test("uses the server-only API URL when configured", () => {
  assert.equal(
    buildApiUrl(
      "calls",
      "http://backend:3000/api/v1",
      "https://public.example/api/v1",
    ),
    "http://backend:3000/api/v1/calls",
  );
});

test("falls back to the local API URL", () => {
  assert.equal(
    buildApiUrl("/calls", undefined, undefined),
    "http://localhost:3000/api/v1/calls",
  );
});

test("supports same-origin relative browser base", () => {
  assert.equal(
    buildApiUrl("auth/login", undefined, "/api/backend"),
    "/api/backend/auth/login",
  );
});

test("maps proxy path to a single /api/v1 prefix", () => {
  assert.equal(
    buildBackendProxyUpstreamPath(["auth", "login"]),
    "/api/v1/auth/login",
  );
});

test("rejects invalid proxy segments", () => {
  assert.throws(() => validateProxyPathSegments([".."]));
  assert.throws(() => validateProxyPathSegments([]));
});

test("builds fixed CloudFront upstream URL", () => {
  assert.equal(
    buildBackendProxyUpstreamUrl(
      ["auth", "me"],
      "https://dl1t1qnfxrdka.cloudfront.net",
      "?x=1",
    ),
    "https://dl1t1qnfxrdka.cloudfront.net/api/v1/auth/me?x=1",
  );
});

test("rejects non-https upstream origins", () => {
  assert.throws(() => resolveBackendProxyOrigin("http://example.com"));
});