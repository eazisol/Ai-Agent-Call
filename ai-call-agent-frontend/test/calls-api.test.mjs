import assert from "node:assert/strict";
import test from "node:test";

function callStatusBadge(status) {
  if (status === "completed") return "success";
  if (status === "failed") return "error";
  if (status === "in_progress") return "info";
  if (status === "started") return "warning";
  return "neutral";
}

function formatFailureCode(code) {
  const labels = {
    UNKNOWN_NUMBER: "Unknown number",
    UNASSIGNED_NUMBER: "Line not assigned",
    HANDOFF_FAILED: "Could not connect call",
  };
  if (!code) return null;
  return labels[code] ?? code.replaceAll("_", " ").toLowerCase();
}

function canViewCallProviderLinks(role) {
  return role === "owner" || role === "admin" || role === "manager";
}

function formatCallApiError(code, message) {
  if (code === "ACTIVE_BUSINESS_REQUIRED") {
    return "Select an active business to view call history.";
  }
  if (code === "CALL_NOT_FOUND") {
    return "This call was not found in your active business.";
  }
  return message;
}

test("call status badge mapping matches portal semantics", () => {
  assert.equal(callStatusBadge("completed"), "success");
  assert.equal(callStatusBadge("failed"), "error");
  assert.equal(callStatusBadge("in_progress"), "info");
  assert.equal(callStatusBadge("started"), "warning");
});

test("failure code labels stay customer-safe", () => {
  assert.equal(formatFailureCode("UNASSIGNED_NUMBER"), "Line not assigned");
  assert.equal(formatFailureCode("HANDOFF_FAILED"), "Could not connect call");
  assert.equal(formatFailureCode(null), null);
});

test("provider link visibility matches backend RBAC", () => {
  assert.equal(canViewCallProviderLinks("owner"), true);
  assert.equal(canViewCallProviderLinks("manager"), true);
  assert.equal(canViewCallProviderLinks("viewer"), false);
});

test("call API errors map to actionable portal copy", () => {
  assert.equal(
    formatCallApiError("ACTIVE_BUSINESS_REQUIRED", "Select an active business."),
    "Select an active business to view call history.",
  );
  assert.equal(
    formatCallApiError("CALL_NOT_FOUND", "Call not found."),
    "This call was not found in your active business.",
  );
});
