import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_API_TIMEOUT_MS,
  classifyFetchFailure,
} from "../src/lib/api-client-core.mjs";

test("default API timeout is 15 seconds", () => {
  assert.equal(DEFAULT_API_TIMEOUT_MS, 15_000);
});

test("classifyFetchFailure distinguishes timeout from outage", () => {
  assert.match(
    classifyFetchFailure(new DOMException("Aborted", "AbortError")),
    /timed out/i,
  );
});
