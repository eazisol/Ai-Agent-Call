const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const test = require('node:test');
const {
  PlansService,
} = require('../../dist/modules/subscriptions/plans.service');
const {
  ApplicationError,
} = require('../../dist/common/errors/application-error');
const {
  ENTITLEMENT_KEYS,
} = require('../../dist/modules/subscriptions/entitlement-keys');
const {
  LEGACY_PRODUCTION_PLAN_CODE,
} = require('../../dist/modules/subscriptions/entities/plan.entity');

function createPlansService(seedPlans = []) {
  const planRows = [...seedPlans];
  const entitlementRows = [];

  const plans = {
    find: async ({ where }) => {
      return planRows.filter((row) => {
        if (where.status && row.status !== where.status) return false;
        if (where.billingVisibility) {
          if (Array.isArray(where.billingVisibility?.value)) {
            // TypeORM In() shape varies; handle plain string or In
          }
          if (typeof where.billingVisibility === 'string') {
            return row.billingVisibility === where.billingVisibility;
          }
          // In(['public','authenticated']) from TypeORM often stored as FindOperator
          const values = where.billingVisibility._value ?? where.billingVisibility.value;
          if (Array.isArray(values)) {
            return values.includes(row.billingVisibility);
          }
        }
        return true;
      });
    },
    findOne: async ({ where }) =>
      planRows.find((row) =>
        where.id ? row.id === where.id : row.code === where.code,
      ) ?? null,
    create: (data) => ({ id: randomUUID(), ...data }),
    save: async (entity) => {
      const idx = planRows.findIndex((row) => row.id === entity.id);
      if (idx >= 0) {
        planRows[idx] = { ...planRows[idx], ...entity };
        return planRows[idx];
      }
      planRows.push(entity);
      return entity;
    },
  };

  // Override find for listPublicPlans / listCustomerVisiblePlans simpler path
  plans.find = async (options = {}) => {
    const where = options.where ?? {};
    let rows = planRows;
    if (where.status) {
      rows = rows.filter((r) => r.status === where.status);
    }
    if (where.billingVisibility) {
      const op = where.billingVisibility;
      if (typeof op === 'string') {
        rows = rows.filter((r) => r.billingVisibility === op);
      } else if (op && typeof op === 'object') {
        const values = op._value ?? op.value ?? [];
        if (Array.isArray(values)) {
          rows = rows.filter((r) => values.includes(r.billingVisibility));
        }
      }
    }
    const order = options.order ?? {};
    return rows.sort((a, b) => {
      if (order.sortOrder === 'ASC') {
        return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
      }
      return 0;
    });
  };

  const entitlements = {
    find: async ({ where }) =>
      entitlementRows.filter((row) => row.planId === where.planId),
    delete: async ({ planId }) => {
      for (let i = entitlementRows.length - 1; i >= 0; i -= 1) {
        if (entitlementRows[i].planId === planId) {
          entitlementRows.splice(i, 1);
        }
      }
    },
    create: (data) => ({ id: randomUUID(), ...data }),
    save: async (rows) => {
      const list = Array.isArray(rows) ? rows : [rows];
      entitlementRows.push(...list);
      return list;
    },
  };

  return {
    service: new PlansService(plans, entitlements),
    planRows,
    entitlementRows,
  };
}

test('listPublicPlans excludes internal legacy_production', async () => {
  const { service } = createPlansService([
    {
      id: randomUUID(),
      code: LEGACY_PRODUCTION_PLAN_CODE,
      name: 'Legacy Production',
      description: null,
      status: 'active',
      sortOrder: 0,
      billingVisibility: 'internal',
      isRecommended: false,
      trialEligible: false,
      trialDays: null,
      priceMonthlyCents: null,
      priceAnnualCents: null,
      currency: 'USD',
      comparisonMetadata: null,
    },
    {
      id: randomUUID(),
      code: 'growth',
      name: 'Growth',
      description: 'Public',
      status: 'active',
      sortOrder: 1,
      billingVisibility: 'public',
      isRecommended: true,
      trialEligible: true,
      trialDays: 14,
      priceMonthlyCents: null,
      priceAnnualCents: null,
      currency: 'USD',
      comparisonMetadata: null,
    },
  ]);

  const publicPlans = await service.listPublicPlans();
  assert.equal(publicPlans.length, 1);
  assert.equal(publicPlans[0].code, 'growth');
  assert.equal(
    publicPlans.some((p) => p.code === LEGACY_PRODUCTION_PLAN_CODE),
    false,
  );
});

test('replaceEntitlements rejects unknown keys and typed mismatches', async () => {
  const planId = randomUUID();
  const { service, planRows } = createPlansService([
    {
      id: planId,
      code: 'qa_limits',
      name: 'QA Limits',
      description: null,
      status: 'active',
      sortOrder: 1,
      billingVisibility: 'internal',
      isRecommended: false,
      trialEligible: false,
      trialDays: null,
      priceMonthlyCents: null,
      priceAnnualCents: null,
      currency: 'USD',
      comparisonMetadata: null,
    },
  ]);

  await assert.rejects(
    () =>
      service.replaceEntitlements(planId, [
        {
          entitlementKey: 'stripe.secret',
          valueType: 'boolean',
          valueBoolean: true,
        },
      ]),
    (error) =>
      error instanceof ApplicationError &&
      error.code === 'INVALID_PLAN_ENTITLEMENT',
  );

  await assert.rejects(
    () =>
      service.replaceEntitlements(planId, [
        {
          entitlementKey: ENTITLEMENT_KEYS.AGENTS_MAX,
          valueType: 'boolean',
          valueBoolean: true,
        },
      ]),
    (error) =>
      error instanceof ApplicationError &&
      error.code === 'INVALID_PLAN_ENTITLEMENT',
  );

  assert.equal(planRows.length, 1);
});

test('createPlan rejects duplicate codes', async () => {
  const { service } = createPlansService([
    {
      id: randomUUID(),
      code: 'growth',
      name: 'Growth',
      description: null,
      status: 'active',
      sortOrder: 1,
      billingVisibility: 'public',
      isRecommended: false,
      trialEligible: false,
      trialDays: null,
      priceMonthlyCents: null,
      priceAnnualCents: null,
      currency: 'USD',
      comparisonMetadata: null,
    },
  ]);

  await assert.rejects(
    () => service.createPlan({ code: 'growth', name: 'Dup' }),
    (error) =>
      error instanceof ApplicationError && error.code === 'PLAN_CODE_CONFLICT',
  );
});
