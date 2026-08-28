import assert from "node:assert/strict";
import test from "node:test";

function canSearchPhoneNumbers(role) {
  return role === "owner" || role === "admin" || role === "manager";
}

function canPurchasePhoneNumber(role) {
  return role === "owner" || role === "admin";
}

function phoneNumberStatusBadge(status) {
  if (status === "active") return "success";
  if (status === "provisioning" || status === "release_pending") return "warning";
  if (status === "failed") return "error";
  return "neutral";
}

function isValidE164(value) {
  return /^\+[1-9]\d{6,14}$/.test(value.trim());
}

test("phone number RBAC helpers match backend matrix", () => {
  assert.equal(canSearchPhoneNumbers("manager"), true);
  assert.equal(canSearchPhoneNumbers("viewer"), false);
  assert.equal(canPurchasePhoneNumber("admin"), true);
  assert.equal(canPurchasePhoneNumber("manager"), false);
  assert.equal(phoneNumberStatusBadge("failed"), "error");
  assert.equal(isValidE164("+14155550100"), true);
  assert.equal(isValidE164("4155550100"), false);
});
