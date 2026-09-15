const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const test = require('node:test');
const {
  EntitlementsService,
} = require('../../dist/modules/subscriptions/entitlements.service');
const {
  ENTITLEMENT_KEYS,
} = require('../../dist/modules/subscriptions/entitlement-keys');
const {
  ApplicationError,
} = require('../../dist/common/errors/application-error');

function createConfig(mode = 'off') {
  return {
    get: (key) => {
      if (key === 'subscription.enforcementMode') return mode;
      return undefined;
    },
  };
}

function createHarness(options = {}) {
  const mode = options.mode ?? 'off';
  const status = options.status ?? 'active';
  const planCode = options.planCode ?? 'legacy_production';
  const entitlementsRows = options.entitlements ?? [
    {
      entitlementKey: ENTITLEMENT_KEYS.VOICE_CLONING_ENABLED,
      valueType: 'boolean',
      valueBoolean: true,
      valueInteger: null,
    },
    {
      entitlementKey: ENTITLEMENT_KEYS.ANALYTICS_ENABLED,
      valueType: 'boolean',
      valueBoolean: false,
      valueInteger: null,
    },
    {
      entitlementKey: ENTITLEMENT_KEYS.AUTOMATIONS_ENABLED,
      valueType: 'boolean',
      valueBoolean: false,
      valueInteger: null,
    },
  ];
  if (options.limits) {
    for (const [key, value] of Object.entries(options.limits)) {
      entitlementsRows.push({
        entitlementKey: key,
        valueType: 'integer',
        valueBoolean: null,
        valueInteger: value,
      });
    }
  }

  const organizationId = options.organizationId ?? randomUUID();
  const planId = randomUUID();
  const trialEnd = options.trialEnd ?? null;
  const currentPeriodEnd = options.currentPeriodEnd ?? null;

  const subscription = {
    id: randomUUID(),
    organizationId,
    planId,
    status,
    trialEnd,
    currentPeriodEnd,
    plan: { id: planId, code: planCode, name: 'Test Plan' },
  };

  const subscriptions = {
    getOrEnsureForOrganization: async () => subscription,
  };

  const plans = {
    listEntitlementsForPlan: async () => entitlementsRows,
  };

  const businesses = {
    count: async () => options.businessCount ?? 0,
  };

  const agents = {
    createQueryBuilder() {
      return {
        innerJoin() {
          return this;
        },
        where() {
          return this;
        },
        andWhere() {
          return this;
        },
        getCount: async () => options.agentCount ?? 0,
      };
    },
  };

  const phoneNumbers = {
    createQueryBuilder() {
      return {
        innerJoin() {
          return this;
        },
        where() {
          return this;
        },
        andWhere() {
          return this;
        },
        getCount: async () => options.phoneCount ?? 0,
      };
    },
  };

  const service = new EntitlementsService(
    createConfig(mode),
    subscriptions,
    plans,
    businesses,
    agents,
    phoneNumbers,
  );

  return { service, organizationId, subscription };
}

test('resolves boolean features and integer limits (missing limit = unlimited)', async () => {
  const { service, organizationId } = createHarness({
    limits: { [ENTITLEMENT_KEYS.AGENTS_MAX]: 5 },
  });
  const resolved = await service.getResolvedEntitlements(organizationId);
  assert.equal(resolved.features[ENTITLEMENT_KEYS.VOICE_CLONING_ENABLED], true);
  assert.equal(resolved.features[ENTITLEMENT_KEYS.ANALYTICS_ENABLED], false);
  assert.equal(resolved.limits[ENTITLEMENT_KEYS.AGENTS_MAX], 5);
  assert.equal(resolved.limits[ENTITLEMENT_KEYS.BUSINESSES_MAX], null);
  assert.equal(
    await service.getLimit(organizationId, ENTITLEMENT_KEYS.AGENTS_MAX),
    5,
  );
  assert.equal(
    await service.getLimit(organizationId, ENTITLEMENT_KEYS.BUSINESSES_MAX),
    null,
  );
  assert.equal(
    await service.canUseFeature(
      organizationId,
      ENTITLEMENT_KEYS.VOICE_CLONING_ENABLED,
    ),
    true,
  );
});

test('enforcement off does not block feature or limit asserts', async () => {
  const { service, organizationId } = createHarness({
    mode: 'off',
    entitlements: [
      {
        entitlementKey: ENTITLEMENT_KEYS.VOICE_CLONING_ENABLED,
        valueType: 'boolean',
        valueBoolean: false,
        valueInteger: null,
      },
    ],
    limits: { [ENTITLEMENT_KEYS.AGENTS_MAX]: 0 },
    agentCount: 10,
  });

  await service.assertFeature(
    organizationId,
    ENTITLEMENT_KEYS.VOICE_CLONING_ENABLED,
  );
  await service.assertWithinLimit(
    organizationId,
    ENTITLEMENT_KEYS.AGENTS_MAX,
    11,
  );
  await service.assertCanCreateAgent(organizationId);
});

test('enforcement on blocks missing feature with FEATURE_NOT_INCLUDED', async () => {
  const { service, organizationId } = createHarness({
    mode: 'enforce',
    entitlements: [
      {
        entitlementKey: ENTITLEMENT_KEYS.VOICE_CLONING_ENABLED,
        valueType: 'boolean',
        valueBoolean: false,
        valueInteger: null,
      },
    ],
  });

  await assert.rejects(
    () =>
      service.assertFeature(
        organizationId,
        ENTITLEMENT_KEYS.VOICE_CLONING_ENABLED,
      ),
    (error) =>
      error instanceof ApplicationError &&
      error.code === 'FEATURE_NOT_INCLUDED' &&
      error.details?.featureKey === ENTITLEMENT_KEYS.VOICE_CLONING_ENABLED,
  );
});

test('enforcement on blocks over-limit with PLAN_LIMIT_REACHED', async () => {
  const { service, organizationId } = createHarness({
    mode: 'enforce',
    limits: { [ENTITLEMENT_KEYS.BUSINESSES_MAX]: 1 },
    businessCount: 1,
  });

  await assert.rejects(
    () => service.assertCanCreateBusiness(organizationId),
    (error) =>
      error instanceof ApplicationError &&
      error.code === 'PLAN_LIMIT_REACHED' &&
      error.details?.limit === 1 &&
      error.details?.current === 1,
  );
});

test('enforcement on rejects expired subscription', async () => {
  const { service, organizationId } = createHarness({
    mode: 'enforce',
    status: 'expired',
  });

  await assert.rejects(
    () => service.assertSubscriptionActive(organizationId),
    (error) =>
      error instanceof ApplicationError &&
      error.code === 'SUBSCRIPTION_INACTIVE',
  );
});

test('enforcement on rejects expired trial with TRIAL_EXPIRED', async () => {
  const { service, organizationId } = createHarness({
    mode: 'enforce',
    status: 'trialing',
    trialEnd: new Date(Date.now() - 60_000),
  });

  await assert.rejects(
    () => service.assertSubscriptionActive(organizationId),
    (error) =>
      error instanceof ApplicationError && error.code === 'TRIAL_EXPIRED',
  );
});

test('organization-wide counts use injected repositories', async () => {
  const { service, organizationId } = createHarness({
    businessCount: 2,
    agentCount: 7,
    phoneCount: 3,
  });
  assert.equal(await service.countActiveBusinesses(organizationId), 2);
  assert.equal(await service.countNonArchivedAgents(organizationId), 7);
  assert.equal(await service.countActivePhoneNumbers(organizationId), 3);
});

test('inactive subscription clears entitlements in resolved view', async () => {
  const { service, organizationId } = createHarness({
    status: 'suspended',
    limits: { [ENTITLEMENT_KEYS.AGENTS_MAX]: 10 },
  });
  const resolved = await service.getResolvedEntitlements(organizationId);
  assert.equal(resolved.features[ENTITLEMENT_KEYS.VOICE_CLONING_ENABLED], false);
  assert.equal(resolved.limits[ENTITLEMENT_KEYS.AGENTS_MAX], 0);
});

test('legacy compatibility: unlimited agents when no integer row', async () => {
  const { service, organizationId } = createHarness({
    mode: 'enforce',
    agentCount: 100,
  });
  await service.assertCanCreateAgent(organizationId);
});

test('past_due and grace_period remain entitled (PRODUCT DECISION: strictness TBD)', async () => {
  for (const status of ['past_due', 'grace_period']) {
    const { service, organizationId } = createHarness({
      mode: 'enforce',
      status,
      limits: { [ENTITLEMENT_KEYS.AGENTS_MAX]: 2 },
      agentCount: 1,
    });
    await service.assertSubscriptionActive(organizationId);
    await service.assertCanCreateAgent(organizationId);
  }
});

test('canceled within current period remains entitled', async () => {
  const { service, organizationId } = createHarness({
    mode: 'enforce',
    status: 'canceled',
    currentPeriodEnd: new Date(Date.now() + 86_400_000),
    limits: { [ENTITLEMENT_KEYS.BUSINESSES_MAX]: 1 },
    businessCount: 0,
  });
  await service.assertCanCreateBusiness(organizationId);
});

test('canceled after period end is SUBSCRIPTION_INACTIVE', async () => {
  const { service, organizationId } = createHarness({
    mode: 'enforce',
    status: 'canceled',
    currentPeriodEnd: new Date(Date.now() - 86_400_000),
  });
  await assert.rejects(
    () => service.assertSubscriptionActive(organizationId),
    (error) =>
      error instanceof ApplicationError &&
      error.code === 'SUBSCRIPTION_INACTIVE',
  );
});

test('valid trial grants entitlements; assertFeature honors voice cloning', async () => {
  const { service, organizationId } = createHarness({
    mode: 'enforce',
    status: 'trialing',
    trialEnd: new Date(Date.now() + 86_400_000),
    entitlements: [
      {
        entitlementKey: ENTITLEMENT_KEYS.VOICE_CLONING_ENABLED,
        valueType: 'boolean',
        valueBoolean: true,
        valueInteger: null,
      },
    ],
  });
  await service.assertCanUseVoiceCloning(organizationId);
});

test('enforcement off leaves assert no-ops even when over limit', async () => {
  const { service, organizationId } = createHarness({
    mode: 'off',
    limits: { [ENTITLEMENT_KEYS.AGENTS_MAX]: 1 },
    agentCount: 50,
  });
  await service.assertCanCreateAgent(organizationId);
  await service.assertCanUseVoiceCloning(organizationId);
});
