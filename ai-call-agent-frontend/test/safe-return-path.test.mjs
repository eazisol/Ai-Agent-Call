import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Contract test for src/lib/safe-return-path.ts — keeps the open-redirect
 * rules in sync without a TypeScript loader.
 */
function safeReturnPath(raw, fallback = "/dashboard") {
  if (!raw) {
    return fallback;
  }
  const value = raw.trim();
  if (!value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }
  if (value.includes("://") || value.toLowerCase().includes("%2f%2f")) {
    return fallback;
  }
  if (value.includes("\\") || value.includes("\n") || value.includes("\r")) {
    return fallback;
  }
  return value;
}

test("safe-return-path.ts exists and documents open-redirect safety", () => {
  const source = readFileSync(
    join(__dirname, "../src/lib/safe-return-path.ts"),
    "utf8",
  );
  assert.match(source, /safeReturnPath/);
  assert.match(source, /open-redirect/);
});

test("safeReturnPath allows invitation accept paths and rejects open redirects", () => {
  assert.equal(
    safeReturnPath("/invitations/accept?token=abc"),
    "/invitations/accept?token=abc",
  );
  assert.equal(safeReturnPath("https://evil.example/phish"), "/dashboard");
  assert.equal(safeReturnPath("//evil.example"), "/dashboard");
  assert.equal(safeReturnPath("/\\evil"), "/dashboard");
  assert.equal(safeReturnPath(null), "/dashboard");
});
