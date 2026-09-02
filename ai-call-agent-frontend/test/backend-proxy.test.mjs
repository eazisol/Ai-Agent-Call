import assert from "node:assert/strict";
import test from "node:test";
import {
  buildForwardedResponseHeaders,
  getForwardedSetCookieHeaders,
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