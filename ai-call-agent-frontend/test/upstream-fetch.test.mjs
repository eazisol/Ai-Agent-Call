import assert from "node:assert/strict";
import test from "node:test";
import {
  UPSTREAM_FETCH_MAX_ATTEMPTS,
  UPSTREAM_FETCH_TIMEOUT_MS,
  fetchUpstream,
  upstreamFetchDispatcher,
} from "../src/lib/upstream-fetch.mjs";

test("upstream fetch uses keep-alive dispatcher", () => {
  assert.ok(upstreamFetchDispatcher);
  assert.equal(typeof upstreamFetchDispatcher.dispatch, "function");
});

test("upstream fetch timeout is below one minute", () => {
  assert.equal(UPSTREAM_FETCH_TIMEOUT_MS, 12_000);
});

test("upstream fetch retries once on transient failure", () => {
  assert.equal(UPSTREAM_FETCH_MAX_ATTEMPTS, 2);
});

test("fetchUpstream is exported", () => {
  assert.equal(typeof fetchUpstream, "function");
});
