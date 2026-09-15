import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * M25.02 — Subscription Plans foundation.
 * Seeds internal `legacy_production` plan and backfills one subscription per organization.
 * Does NOT invent commercial catalog prices/limits (PRODUCT DECISION REQUIRED).
 */
export class SubscriptionPlans1756150000000 implements MigrationInterface {
  name = 'SubscriptionPlans1756150000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS plans (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        code varchar(64) NOT NULL,
        name varchar(120) NOT NULL,
        description text,
        status varchar(20) NOT NULL,
        sort_order int NOT NULL DEFAULT 0,
        billing_visibility varchar(20) NOT NULL,
        is_recommended boolean NOT NULL DEFAULT false,
        trial_eligible boolean NOT NULL DEFAULT false,
        trial_days int,
        price_monthly_cents int,
        price_annual_cents int,
        currency char(3) NOT NULL DEFAULT 'USD',
        comparison_metadata jsonb,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_plans_code UNIQUE (code),
        CONSTRAINT chk_plans_status CHECK (status IN ('draft', 'active', 'archived')),
        CONSTRAINT chk_plans_billing_visibility CHECK (
          billing_visibility IN ('public', 'authenticated', 'internal')
        ),
        CONSTRAINT chk_plans_trial_days CHECK (
          trial_days IS NULL OR trial_days > 0
        ),
        CONSTRAINT chk_plans_price_monthly CHECK (
          price_monthly_cents IS NULL OR price_monthly_cents >= 0
        ),
        CONSTRAINT chk_plans_price_annual CHECK (
          price_annual_cents IS NULL OR price_annual_cents >= 0
        )
      );

      CREATE INDEX IF NOT EXISTS idx_plans_status_sort
        ON plans (status, sort_order);

      CREATE TABLE IF NOT EXISTS plan_entitlements (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        plan_id uuid NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
        entitlement_key varchar(80) NOT NULL,
        value_type varchar(16) NOT NULL,
        value_boolean boolean,
        value_integer int,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_plan_entitlements_plan_key UNIQUE (plan_id, entitlement_key),
        CONSTRAINT chk_plan_entitlements_value_type CHECK (
          value_type IN ('boolean', 'integer')
        ),
        CONSTRAINT chk_plan_entitlements_typed_value CHECK (
          (
            value_type = 'boolean'
            AND value_boolean IS NOT NULL
            AND value_integer IS NULL
          )
          OR
          (
            value_type = 'integer'
            AND value_integer IS NOT NULL
            AND value_integer >= 0
            AND value_boolean IS NULL
          )
        )
      );

      CREATE INDEX IF NOT EXISTS idx_plan_entitlements_plan
        ON plan_entitlements (plan_id);

      CREATE TABLE IF NOT EXISTS subscriptions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        plan_id uuid NOT NULL REFERENCES plans(id) ON DELETE RESTRICT,
        status varchar(24) NOT NULL,
        started_at timestamptz NOT NULL,
        trial_start timestamptz,
        trial_end timestamptz,
        current_period_start timestamptz,
        current_period_end timestamptz,
        cancel_at_period_end boolean NOT NULL DEFAULT false,
        canceled_at timestamptz,
        grace_period_end timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_subscriptions_organization UNIQUE (organization_id),
        CONSTRAINT chk_subscriptions_status CHECK (
          status IN (
            'trialing',
            'active',
            'past_due',
            'grace_period',
            'canceled',
            'expired',
            'suspended'
          )
        )
      );

      CREATE INDEX IF NOT EXISTS idx_subscriptions_plan
        ON subscriptions (plan_id);

      CREATE INDEX IF NOT EXISTS idx_subscriptions_status
        ON subscriptions (status);

      -- Internal compatibility plan only (not public / not marketing).
      INSERT INTO plans (
        code,
        name,
        description,
        status,
        sort_order,
        billing_visibility,
        is_recommended,
        trial_eligible,
        trial_days,
        price_monthly_cents,
        price_annual_cents,
        currency,
        comparison_metadata
      )
      VALUES (
        'legacy_production',
        'Legacy Production',
        'Internal compatibility plan for organizations that predate commercial catalog assignment. Not customer-selectable.',
        'active',
        0,
        'internal',
        false,
        false,
        NULL,
        NULL,
        NULL,
        'USD',
        NULL
      )
      ON CONFLICT (code) DO NOTHING;

      -- Preserve current MVP feature access without inventing numeric commercial caps.
      -- Missing integer limit rows resolve as unlimited (null).
      INSERT INTO plan_entitlements (
        plan_id,
        entitlement_key,
        value_type,
        value_boolean,
        value_integer
      )
      SELECT p.id, v.entitlement_key, v.value_type, v.value_boolean, v.value_integer
      FROM plans p
      CROSS JOIN (
        VALUES
          ('voice_cloning.enabled', 'boolean', true, NULL::int),
          ('analytics.enabled', 'boolean', false, NULL::int),
          ('automations.enabled', 'boolean', false, NULL::int)
      ) AS v(entitlement_key, value_type, value_boolean, value_integer)
      WHERE p.code = 'legacy_production'
      ON CONFLICT ON CONSTRAINT uq_plan_entitlements_plan_key DO NOTHING;

      -- Idempotent backfill: one subscription per organization.
      INSERT INTO subscriptions (
        organization_id,
        plan_id,
        status,
        started_at,
        current_period_start,
        current_period_end,
        cancel_at_period_end
      )
      SELECT
        o.id,
        p.id,
        'active',
        COALESCE(o.created_at, now()),
        COALESCE(o.created_at, now()),
        NULL,
        false
      FROM organizations o
      CROSS JOIN plans p
      WHERE p.code = 'legacy_production'
        AND NOT EXISTS (
          SELECT 1
          FROM subscriptions s
          WHERE s.organization_id = o.id
        );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_subscriptions_status;
      DROP INDEX IF EXISTS idx_subscriptions_plan;
      DROP TABLE IF EXISTS subscriptions;

      DROP INDEX IF EXISTS idx_plan_entitlements_plan;
      DROP TABLE IF EXISTS plan_entitlements;

      DROP INDEX IF EXISTS idx_plans_status_sort;
      DROP TABLE IF EXISTS plans;
    `);
  }
}
