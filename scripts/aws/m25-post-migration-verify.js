/**
 * M25 post-migration verification (read-only). Prints M25POST markers only.
 */
const { Client } = require('pg');

(async () => {
  const client = new Client({
    host: process.env.DATABASE_HOST,
    port: Number.parseInt(process.env.DATABASE_PORT || '5432', 10),
    user: process.env.DATABASE_USER || process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME || process.env.DATABASE_DATABASE,
    ssl:
      String(process.env.DATABASE_SSL || '').toLowerCase() === 'true'
        ? { rejectUnauthorized: false }
        : undefined,
  });

  try {
    await client.connect();
    const result = await client.query(`
      SELECT json_build_object(
        'migration_count', (SELECT count(*)::int FROM eazi_ai_call_migrations),
        'has_subscription_plans_migration', (
          SELECT EXISTS(
            SELECT 1 FROM eazi_ai_call_migrations
            WHERE name = 'SubscriptionPlans1756150000000'
          )
        ),
        'subscription_plans_migration_count', (
          SELECT count(*)::int FROM eazi_ai_call_migrations
          WHERE name = 'SubscriptionPlans1756150000000'
        ),
        'plans_count', (SELECT count(*)::int FROM plans),
        'legacy_plan', (
          SELECT coalesce(
            json_agg(json_build_object(
              'code', code,
              'name', name,
              'status', status,
              'billing_visibility', billing_visibility,
              'is_recommended', is_recommended,
              'price_monthly_cents', price_monthly_cents,
              'price_annual_cents', price_annual_cents
            )),
            '[]'::json
          )
          FROM plans WHERE code = 'legacy_production'
        ),
        'legacy_plan_count', (
          SELECT count(*)::int FROM plans WHERE code = 'legacy_production'
        ),
        'public_active_plans', (
          SELECT count(*)::int FROM plans
          WHERE status = 'active' AND billing_visibility = 'public'
        ),
        'plan_entitlements_count', (SELECT count(*)::int FROM plan_entitlements),
        'legacy_entitlement_keys', (
          SELECT coalesce(json_agg(pe.entitlement_key ORDER BY pe.entitlement_key), '[]'::json)
          FROM plan_entitlements pe
          JOIN plans p ON p.id = pe.plan_id
          WHERE p.code = 'legacy_production'
        ),
        'organization_count', (SELECT count(*)::int FROM organizations),
        'subscription_count', (SELECT count(*)::int FROM subscriptions),
        'orgs_without_subscription', (
          SELECT count(*)::int FROM organizations o
          WHERE NOT EXISTS (
            SELECT 1 FROM subscriptions s WHERE s.organization_id = o.id
          )
        ),
        'duplicate_subscriptions', (
          SELECT count(*)::int FROM (
            SELECT organization_id FROM subscriptions
            GROUP BY organization_id HAVING count(*) > 1
          ) d
        ),
        'subscription_plan_codes', (
          SELECT coalesce(json_agg(DISTINCT p.code), '[]'::json)
          FROM subscriptions s
          JOIN plans p ON p.id = s.plan_id
        ),
        'uq_plans_code', (
          SELECT EXISTS(
            SELECT 1 FROM pg_constraint
            WHERE conname = 'uq_plans_code'
          )
        ),
        'uq_plan_entitlements_plan_key', (
          SELECT EXISTS(
            SELECT 1 FROM pg_constraint
            WHERE conname = 'uq_plan_entitlements_plan_key'
          )
        ),
        'uq_subscriptions_organization', (
          SELECT EXISTS(
            SELECT 1 FROM pg_constraint
            WHERE conname LIKE '%subscriptions%organization%'
               OR conname = 'uq_subscriptions_organization_id'
          )
        ),
        'business_count', (SELECT count(*)::int FROM businesses),
        'user_count', (SELECT count(*)::int FROM users),
        'calls_count', (SELECT count(*)::int FROM calls)
      ) AS v
    `);
    console.log('M25POST ' + JSON.stringify(result.rows[0].v));
    console.log('M25POST done');
  } catch (err) {
    console.error('M25POST ERR ' + (err && err.message ? err.message : String(err)));
    process.exitCode = 1;
  } finally {
    try {
      await client.end();
    } catch (_) {
      /* ignore */
    }
  }
})();
