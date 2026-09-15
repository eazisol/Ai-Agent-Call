/**
 * M25 tenant regression (read-only).
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
    const r = await client.query(`
      SELECT json_build_object(
        'org', (SELECT json_build_object('id', id::text, 'name', name) FROM organizations WHERE id = '35e6178e-5d74-4188-85ac-bee124adc6d5'),
        'membership_count', (SELECT count(*)::int FROM organization_members WHERE organization_id = '35e6178e-5d74-4188-85ac-bee124adc6d5'),
        'business', (SELECT json_build_object('id', id::text, 'name', name, 'status', status) FROM businesses WHERE organization_id = '35e6178e-5d74-4188-85ac-bee124adc6d5' LIMIT 1),
        'agent_count', (SELECT count(*)::int FROM ai_agents a JOIN businesses b ON b.id = a.business_id WHERE b.organization_id = '35e6178e-5d74-4188-85ac-bee124adc6d5'),
        'phone_count', (SELECT count(*)::int FROM phone_numbers pn JOIN businesses b ON b.id = pn.business_id WHERE b.organization_id = '35e6178e-5d74-4188-85ac-bee124adc6d5'),
        'phone_e164', (SELECT coalesce(json_agg(pn.e164 ORDER BY pn.created_at), '[]'::json) FROM phone_numbers pn JOIN businesses b ON b.id = pn.business_id WHERE b.organization_id = '35e6178e-5d74-4188-85ac-bee124adc6d5'),
        'subscription', (
          SELECT json_build_object('plan_code', p.code, 'status', s.status)
          FROM subscriptions s JOIN plans p ON p.id = s.plan_id
          WHERE s.organization_id = '35e6178e-5d74-4188-85ac-bee124adc6d5'
        ),
        'calls_count', (SELECT count(*)::int FROM calls)
      ) AS v
    `);
    console.log('M25TENANT ' + JSON.stringify(r.rows[0].v));
    console.log('M25TENANT done');
  } catch (e) {
    console.error('M25TENANT ERR ' + (e.message || e));
    process.exit(1);
  } finally {
    try { await client.end(); } catch (_) {}
  }
})();
