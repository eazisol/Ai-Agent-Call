/**
 * M25 local enforcement verification against SAFE local Postgres.
 * Uses pg + service layer with thin repository adapters (no full TypeORM graph).
 *
 * Usage: node scripts/m25-enforcement-verify.cjs
 */
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Client } = require('pg');

const {
  EntitlementsService,
} = require('../dist/modules/subscriptions/entitlements.service');
const {
  PlansService,
} = require('../dist/modules/subscriptions/plans.service');
const {
  SubscriptionsService,
} = require('../dist/modules/subscriptions/subscriptions.service');
const {
  ENTITLEMENT_KEYS,
} = require('../dist/modules/subscriptions/entitlement-keys');
const {
  ApplicationError,
} = require('../dist/common/errors/application-error');

function mapPlan(row) {
  if (!row) return null;
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    status: row.status,
    sortOrder: row.sort_order,
    billingVisibility: row.billing_visibility,
    isRecommended: row.is_recommended,
    trialEligible: row.trial_eligible,
    trialDays: row.trial_days,
    priceMonthlyCents: row.price_monthly_cents,
    priceAnnualCents: row.price_annual_cents,
    currency: row.currency,
    comparisonMetadata: row.comparison_metadata,
  };
}

function mapEntitlement(row) {
  return {
    id: row.id,
    planId: row.plan_id,
    entitlementKey: row.entitlement_key,
    valueType: row.value_type,
    valueBoolean: row.value_boolean,
    valueInteger: row.value_integer,
  };
}

function mapSubscription(row) {
  if (!row) return null;
  return {
    id: row.id,
    organizationId: row.organization_id,
    planId: row.plan_id,
    status: row.status,
    startedAt: row.started_at,
    trialStart: row.trial_start,
    trialEnd: row.trial_end,
    currentPeriodStart: row.current_period_start,
    currentPeriodEnd: row.current_period_end,
    cancelAtPeriodEnd: row.cancel_at_period_end,
    canceledAt: row.canceled_at,
    gracePeriodEnd: row.grace_period_end,
    plan: mapPlan({
      id: row.plan_id,
      code: row.plan_code,
      name: row.plan_name,
      description: null,
      status: 'active',
      sort_order: 0,
      billing_visibility: 'internal',
      is_recommended: false,
      trial_eligible: false,
      trial_days: null,
      price_monthly_cents: null,
      price_annual_cents: null,
      currency: 'USD',
      comparison_metadata: null,
    }),
  };
}

async function main() {
  const client = new Client({
    host: process.env.DATABASE_HOST || 'localhost',
    port: Number(process.env.DATABASE_PORT || 5434),
    user: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'postgres',
    database: process.env.DATABASE_NAME || 'ai_call_agent',
  });
  await client.connect();

  const planCode = `qa_m25_limits_${Date.now()}`;
  const orgAId = randomUUID();
  const orgBId = randomUUID();
  const userId = randomUUID();
  let planId;

  const planRepo = {
    find: async ({ where = {}, order } = {}) => {
      const params = [];
      const clauses = [];
      if (where.status) {
        params.push(where.status);
        clauses.push(`status = $${params.length}`);
      }
      if (where.billingVisibility) {
        params.push(where.billingVisibility);
        clauses.push(`billing_visibility = $${params.length}`);
      }
      const whereSql = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
      const orderSql =
        order?.sortOrder === 'ASC'
          ? 'ORDER BY sort_order ASC, code ASC'
          : '';
      const { rows } = await client.query(
        `SELECT * FROM plans ${whereSql} ${orderSql}`,
        params,
      );
      return rows.map(mapPlan);
    },
    findOne: async ({ where = {} } = {}) => {
      if (where.id) {
        const { rows } = await client.query(
          `SELECT * FROM plans WHERE id = $1`,
          [where.id],
        );
        return mapPlan(rows[0]);
      }
      if (where.code) {
        const { rows } = await client.query(
          `SELECT * FROM plans WHERE code = $1`,
          [where.code],
        );
        return mapPlan(rows[0]);
      }
      return null;
    },
    create: (data) => ({ id: randomUUID(), ...data }),
    save: async (entity) => entity,
  };

  const entitlementRepo = {
    find: async ({ where = {}, order } = {}) => {
      const { rows } = await client.query(
        `SELECT * FROM plan_entitlements WHERE plan_id = $1 ORDER BY entitlement_key ASC`,
        [where.planId],
      );
      return rows.map(mapEntitlement);
    },
    delete: async () => undefined,
    create: (data) => ({ id: randomUUID(), ...data }),
    save: async (rows) => rows,
  };

  const subscriptionRepo = {
    findOne: async ({ where = {} } = {}) => {
      const { rows } = await client.query(
        `SELECT s.*, p.code AS plan_code, p.name AS plan_name
         FROM subscriptions s
         JOIN plans p ON p.id = s.plan_id
         WHERE s.organization_id = $1`,
        [where.organizationId],
      );
      return mapSubscription(rows[0]);
    },
    create: (data) => ({ id: randomUUID(), ...data }),
    save: async (entity) => entity,
  };

  const businessRepo = {
    count: async ({ where = {} } = {}) => {
      const { rows } = await client.query(
        `SELECT COUNT(*)::int AS c FROM businesses
         WHERE organization_id = $1 AND status = $2`,
        [where.organizationId, where.status],
      );
      return rows[0].c;
    },
  };

  const agentRepo = {
    createQueryBuilder() {
      const state = { organizationId: null };
      return {
        innerJoin() {
          return this;
        },
        where(_c, params) {
          state.organizationId = params.organizationId;
          return this;
        },
        andWhere() {
          return this;
        },
        getCount: async () => {
          const { rows } = await client.query(
            `SELECT COUNT(*)::int AS c
             FROM ai_agents a
             INNER JOIN businesses b ON b.id = a.business_id
             WHERE b.organization_id = $1 AND a.status != 'archived'`,
            [state.organizationId],
          );
          return rows[0].c;
        },
      };
    },
  };

  const phoneRepo = {
    createQueryBuilder() {
      const state = { organizationId: null };
      return {
        innerJoin() {
          return this;
        },
        where(_c, params) {
          state.organizationId = params.organizationId;
          return this;
        },
        andWhere() {
          return this;
        },
        getCount: async () => {
          const { rows } = await client.query(
            `SELECT COUNT(*)::int AS c
             FROM phone_numbers p
             INNER JOIN businesses b ON b.id = p.business_id
             WHERE b.organization_id = $1
               AND p.status IN ('active', 'provisioning')`,
            [state.organizationId],
          );
          return rows[0].c;
        },
      };
    },
  };

  try {
    await client.query(
      `INSERT INTO users (id, email, password_hash, display_name, email_verified_at, created_at, updated_at)
       VALUES ($1, $2, 'x', 'M25 QA', NOW(), NOW(), NOW())`,
      [userId, `m25-qa-${userId.slice(0, 8)}@example.test`],
    );

    for (const [id, name] of [
      [orgAId, 'M25 Org A'],
      [orgBId, 'M25 Org B'],
    ]) {
      await client.query(
        `INSERT INTO organizations (id, name, slug, created_at, updated_at)
         VALUES ($1, $2, $3, NOW(), NOW())`,
        [id, name, `m25-${id.slice(0, 8)}`],
      );
      await client.query(
        `INSERT INTO organization_members (id, organization_id, user_id, role, created_at, updated_at)
         VALUES ($1, $2, $3, 'owner', NOW(), NOW())`,
        [randomUUID(), id, userId],
      );
    }

    const planInsert = await client.query(
      `INSERT INTO plans (
         id, code, name, description, status, sort_order, billing_visibility,
         is_recommended, trial_eligible, trial_days, currency, created_at, updated_at
       ) VALUES (
         $1, $2, 'QA Limits', 'local verification', 'active', 99, 'internal',
         false, true, 14, 'USD', NOW(), NOW()
       ) RETURNING id`,
      [randomUUID(), planCode],
    );
    planId = planInsert.rows[0].id;

    for (const [key, type, boolVal, intVal] of [
      [ENTITLEMENT_KEYS.BUSINESSES_MAX, 'integer', null, 1],
      [ENTITLEMENT_KEYS.AGENTS_MAX, 'integer', null, 1],
      [ENTITLEMENT_KEYS.PHONE_NUMBERS_MAX, 'integer', null, 1],
      [ENTITLEMENT_KEYS.VOICE_CLONING_ENABLED, 'boolean', false, null],
      [ENTITLEMENT_KEYS.ANALYTICS_ENABLED, 'boolean', false, null],
      [ENTITLEMENT_KEYS.AUTOMATIONS_ENABLED, 'boolean', false, null],
    ]) {
      await client.query(
        `INSERT INTO plan_entitlements (
           id, plan_id, entitlement_key, value_type, value_boolean, value_integer, created_at, updated_at
         ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
        [randomUUID(), planId, key, type, boolVal, intVal],
      );
    }

    await client.query(
      `INSERT INTO subscriptions (
         id, organization_id, plan_id, status, started_at,
         current_period_start, current_period_end, cancel_at_period_end, created_at, updated_at
       ) VALUES ($1, $2, $3, 'active', NOW(), NOW(), NOW() + interval '30 days', false, NOW(), NOW())`,
      [randomUUID(), orgAId, planId],
    );

    const legacy = await client.query(
      `SELECT id FROM plans WHERE code = 'legacy_production' LIMIT 1`,
    );
    await client.query(
      `INSERT INTO subscriptions (
         id, organization_id, plan_id, status, started_at, cancel_at_period_end, created_at, updated_at
       ) VALUES ($1, $2, $3, 'active', NOW(), false, NOW(), NOW())
       ON CONFLICT (organization_id) DO NOTHING`,
      [randomUUID(), orgBId, legacy.rows[0].id],
    );

    const plans = new PlansService(planRepo, entitlementRepo);
    const subscriptions = new SubscriptionsService(subscriptionRepo, plans);
    const configEnforce = {
      get: (k) => (k === 'subscription.enforcementMode' ? 'enforce' : undefined),
    };
    const configOff = {
      get: (k) => (k === 'subscription.enforcementMode' ? 'off' : undefined),
    };
    const entitlementsSvc = new EntitlementsService(
      configEnforce,
      subscriptions,
      plans,
      businessRepo,
      agentRepo,
      phoneRepo,
    );

    await entitlementsSvc.assertCanCreateBusiness(orgAId);
    const bizId = randomUUID();
    await client.query(
      `INSERT INTO businesses (
         id, organization_id, name, industry, email, status, created_at, updated_at
       ) VALUES ($1, $2, 'Biz1', 'other', 'biz1@example.test', 'active', NOW(), NOW())`,
      [bizId, orgAId],
    );
    await assert.rejects(
      () => entitlementsSvc.assertCanCreateBusiness(orgAId),
      (e) => e instanceof ApplicationError && e.code === 'PLAN_LIMIT_REACHED',
    );

    await entitlementsSvc.assertCanCreateAgent(orgAId);
    await client.query(
      `INSERT INTO ai_agents (id, business_id, name, status, created_at, updated_at)
       VALUES ($1, $2, 'Agent1', 'active', NOW(), NOW())`,
      [randomUUID(), bizId],
    );
    await assert.rejects(
      () => entitlementsSvc.assertCanCreateAgent(orgAId),
      (e) => e instanceof ApplicationError && e.code === 'PLAN_LIMIT_REACHED',
    );

    await entitlementsSvc.assertCanAddPhoneNumber(orgAId);
    await client.query(
      `INSERT INTO phone_numbers (
         id, business_id, provider, phone_number_e164, country, status, created_at, updated_at
       ) VALUES ($1, $2, 'twilio', '+14155550100', 'US', 'active', NOW(), NOW())`,
      [randomUUID(), bizId],
    );
    await assert.rejects(
      () => entitlementsSvc.assertCanAddPhoneNumber(orgAId),
      (e) =>
        e instanceof ApplicationError &&
        e.code === 'PLAN_LIMIT_REACHED' &&
        e.details?.featureKey === ENTITLEMENT_KEYS.PHONE_NUMBERS_MAX,
    );

    await assert.rejects(
      () => entitlementsSvc.assertCanUseVoiceCloning(orgAId),
      (e) => e instanceof ApplicationError && e.code === 'FEATURE_NOT_INCLUDED',
    );
    await client.query(
      `UPDATE plan_entitlements SET value_boolean = true
       WHERE plan_id = $1 AND entitlement_key = $2`,
      [planId, ENTITLEMENT_KEYS.VOICE_CLONING_ENABLED],
    );
    await entitlementsSvc.assertCanUseVoiceCloning(orgAId);

    await client.query(
      `UPDATE subscriptions SET status = 'trialing',
         trial_start = NOW() - interval '1 day',
         trial_end = NOW() + interval '7 days'
       WHERE organization_id = $1`,
      [orgAId],
    );
    await entitlementsSvc.assertSubscriptionActive(orgAId);
    await client.query(
      `UPDATE subscriptions SET trial_end = NOW() - interval '1 hour'
       WHERE organization_id = $1`,
      [orgAId],
    );
    await assert.rejects(
      () => entitlementsSvc.assertSubscriptionActive(orgAId),
      (e) => e instanceof ApplicationError && e.code === 'TRIAL_EXPIRED',
    );

    const publicPlans = await plans.listPublicPlans();
    assert.equal(
      publicPlans.some((p) => p.code === 'legacy_production'),
      false,
    );
    assert.equal(publicPlans.some((p) => p.code === planCode), false);
    for (const p of publicPlans) {
      assert.equal('id' in p, false);
      assert.equal('billingVisibility' in p, false);
    }

    await client.query(
      `UPDATE subscriptions SET status = 'active', trial_end = NULL WHERE organization_id = $1`,
      [orgAId],
    );
    const resolvedA = await entitlementsSvc.getResolvedEntitlements(orgAId);
    const resolvedB = await entitlementsSvc.getResolvedEntitlements(orgBId);
    assert.equal(resolvedA.organizationId, orgAId);
    assert.equal(resolvedA.planCode, planCode);
    assert.equal(resolvedB.organizationId, orgBId);
    assert.notEqual(resolvedB.planCode, planCode);

    const offSvc = new EntitlementsService(
      configOff,
      subscriptions,
      plans,
      businessRepo,
      agentRepo,
      phoneRepo,
    );
    await offSvc.assertCanCreateBusiness(orgAId);
    await offSvc.assertCanUseVoiceCloning(orgAId);

    console.log('M25 local enforcement verification: PASS');
    console.log(
      JSON.stringify({
        planCode,
        checks: [
          'PLAN_LIMIT_REACHED businesses/agents/phones',
          'FEATURE_NOT_INCLUDED then enabled',
          'TRIAL_EXPIRED',
          'public sanitization',
          'tenant resolved isolation',
          'enforcement off no-op',
        ],
      }),
    );
  } catch (error) {
    console.error('M25 local enforcement verification: FAIL');
    console.error(error);
    process.exitCode = 1;
  } finally {
    try {
      await client.query(
        `DELETE FROM phone_numbers WHERE business_id IN (SELECT id FROM businesses WHERE organization_id = $1)`,
        [orgAId],
      );
      await client.query(
        `DELETE FROM ai_agents WHERE business_id IN (SELECT id FROM businesses WHERE organization_id = $1)`,
        [orgAId],
      );
      await client.query(`DELETE FROM businesses WHERE organization_id = $1`, [
        orgAId,
      ]);
      await client.query(
        `DELETE FROM subscriptions WHERE organization_id IN ($1, $2)`,
        [orgAId, orgBId],
      );
      if (planId) {
        await client.query(`DELETE FROM plan_entitlements WHERE plan_id = $1`, [
          planId,
        ]);
        await client.query(`DELETE FROM plans WHERE id = $1`, [planId]);
      }
      await client.query(
        `DELETE FROM organization_members WHERE organization_id IN ($1, $2)`,
        [orgAId, orgBId],
      );
      await client.query(`DELETE FROM organizations WHERE id IN ($1, $2)`, [
        orgAId,
        orgBId,
      ]);
      await client.query(`DELETE FROM users WHERE id = $1`, [userId]);
    } catch (cleanupError) {
      console.warn('cleanup warning', cleanupError.message);
    }
    await client.end();
  }
}

main();
