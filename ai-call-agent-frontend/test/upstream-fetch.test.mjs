import assert from "node:assert/strict";
import test from "node:test";
import {
  UPSTREAM_FETCH_TIMEOUT_MS,
  upstreamFetchDispatcher,
} from "../src/lib/upstream-fetch.mjs";

test("upstream fetch uses keep-alive dispatcher", () => {
  assert.ok(upstreamFetchDispatcher);
  assert.equal(typeof upstreamFetchDispatcher.dispatch, "function");
});

test("upstream fetch timeout is below one minute", () => {
  assert.equal(UPSTREAM_FETCH_TIMEOUT_MS, 25_000);
});
