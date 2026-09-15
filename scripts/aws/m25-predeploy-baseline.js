/**
 * M25 pre-deploy baseline (read-only). Prints M25BLINE markers only.
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
        'latest_migrations', (
          SELECT coalesce(json_agg(t ORDER BY t), '[]'::json)
          FROM (
            SELECT name FROM eazi_ai_call_migrations
            ORDER BY timestamp DESC LIMIT 5
          ) t
        ),
        'has_subscription_plans_migration', (
          SELECT EXISTS(
            SELECT 1 FROM eazi_ai_call_migrations
            WHERE name LIKE '%SubscriptionPlans%'
          )
        ),
        'organization_count', (SELECT count(*)::int FROM organizations),
        'organization_ids', (
          SELECT coalesce(json_agg(id::text ORDER BY created_at), '[]'::json)
          FROM organizations
        ),
        'organization_names', (
          SELECT coalesce(
            json_agg(json_build_object('id', id::text, 'name', name) ORDER BY created_at),
            '[]'::json
          )
          FROM organizations
        ),
        'business_count', (SELECT count(*)::int FROM businesses),
        'user_count', (SELECT count(*)::int FROM users),
        'calls_count', (SELECT count(*)::int FROM calls),
        'plans_table_exists', (
          SELECT EXISTS(
            SELECT 1 FROM information_schema.tables
            WHERE table_schema='public' AND table_name='plans'
          )
        ),
        'plan_entitlements_table_exists', (
          SELECT EXISTS(
            SELECT 1 FROM information_schema.tables
            WHERE table_schema='public' AND table_name='plan_entitlements'
          )
        ),
        'subscriptions_table_exists', (
          SELECT EXISTS(
            SELECT 1 FROM information_schema.tables
            WHERE table_schema='public' AND table_name='subscriptions'
          )
        )
      ) AS baseline
    `);
    console.log('M25BLINE ' + JSON.stringify(result.rows[0].baseline));
    console.log('M25BLINE done');
  } catch (err) {
    console.error('M25BLINE ERR ' + (err && err.message ? err.message : String(err)));
    process.exitCode = 1;
  } finally {
    try {
      await client.end();
    } catch (_) {
      /* ignore */
    }
  }
})();
