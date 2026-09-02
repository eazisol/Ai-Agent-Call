import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyFetchFailure,
  DEFAULT_CLIENT_ERROR_MESSAGE,
  DEFAULT_UNAVAILABLE_MESSAGE,
  parseApiError,
} from "../src/lib/api-client-core.mjs";

test("parseApiError reads backend envelope", () => {
  const parsed = parseApiError(
    {
      error: {
        code: "VALIDATION_ERROR",
        message: "Organization name is required.",
      },
    },
    DEFAULT_CLIENT_ERROR_MESSAGE,
  );
  assert.equal(parsed.code, "VALIDATION_ERROR");
  assert.equal(parsed.message, "Organization name is required.");
});

test("parseApiError falls back when envelope is missing", () => {
  const parsed = parseApiError(null, DEFAULT_CLIENT_ERROR_MESSAGE);
  assert.equal(parsed.message, DEFAULT_CLIENT_ERROR_MESSAGE);
});

test("classifyFetchFailure distinguishes timeout from outage", () => {
  assert.match(
    classifyFetchFailure(new DOMException("Aborted", "AbortError")),
    /timed out/i,
  );
  assert.match(
    classifyFetchFailure(Object.assign(new Error("Timeout"), { name: "TimeoutError" })),
    /timed out/i,
  );
  assert.equal(
    classifyFetchFailure(new TypeError("Failed to fetch")),
    DEFAULT_UNAVAILABLE_MESSAGE,
  );
});
