import assert from "node:assert/strict";
import test from "node:test";
import { buildApiUrl } from "../src/lib/api-url.mjs";

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
