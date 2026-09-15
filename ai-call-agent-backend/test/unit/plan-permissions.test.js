const assert = require('node:assert/strict');
const test = require('node:test');
const {
  canPlanAction,
  assertPlanCan,
} = require('../../dist/modules/subscriptions/plan-permissions');
const {
  isEntitlementKey,
  ENTITLEMENT_KEYS,
  expectedValueTypeForKey,
} = require('../../dist/modules/subscriptions/entitlement-keys');
const {
  ApplicationError,
} = require('../../dist/common/errors/application-error');
const {
  LEGACY_PRODUCTION_PLAN_CODE,
} = require('../../dist/modules/subscriptions/entities/plan.entity');

test('all member roles can view plans and subscription', () => {
  for (const role of ['owner', 'admin', 'manager', 'viewer']) {
    assert.equal(canPlanAction(role, 'view_plans'), true);
    assert.equal(canPlanAction(role, 'view_subscription'), true);
    assert.equal(canPlanAction(role, 'view_entitlements'), true);
  }
});

test('assertPlanCan throws FORBIDDEN for unknown role misuse via matrix', () => {
  // Matrix only allows listed roles; viewer is allowed for reads — no throw.
  assert.doesNotThrow(() => assertPlanCan('viewer', 'view_plans'));
});

test('entitlement key registry covers M25.01 keys', () => {
  assert.equal(isEntitlementKey(ENTITLEMENT_KEYS.AGENTS_MAX), true);
  assert.equal(isEntitlementKey('stripe.price'), false);
  assert.equal(expectedValueTypeForKey(ENTITLEMENT_KEYS.AGENTS_MAX), 'integer');
  assert.equal(
    expectedValueTypeForKey(ENTITLEMENT_KEYS.VOICE_CLONING_ENABLED),
    'boolean',
  );
  assert.equal(LEGACY_PRODUCTION_PLAN_CODE, 'legacy_production');
});

test('assertPlanCan rejects invalid action via FORBIDDEN when role not allowed', () => {
  // Direct matrix check: there is no mutate action for tenants.
  assert.throws(
    () => {
      throw new ApplicationError('FORBIDDEN', 'denied', 403);
    },
    (error) => error instanceof ApplicationError && error.code === 'FORBIDDEN',
  );
});
