/**
 * RESET-03 — Read-only org/business ownership inspection.
 */
const { Client } = require('pg');

function maskEmail(email) {
  const e = String(email || '');
  const parts = e.split('@');
  if (parts.length !== 2) return '***';
  return `${parts[0].slice(0, 3)}***@${parts[1]}`;
}

(async () => {
  const expectedUserId = (
    process.env.RESET03_USER_ID ||
    '1a8ad4ad-ffa3-4f8d-a611-463c45861e43'
  ).trim();
  const expectedEmail = (
    process.env.RESET03_EMAIL ||
    'ahmadg03025249091@gmail.com'
  )
    .trim()
    .toLowerCase();

  const client = new Client({
    host: process.env.DATABASE_HOST,
    port: Number.parseInt(process.env.DATABASE_PORT || '5432', 10),
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    ssl:
      process.env.DATABASE_SSL === 'true'
        ? { rejectUnauthorized: false }
        : undefined,
  });

  await client.connect();
  console.log('RESET03 inspect_start=yes');

  const counts = await client.query(`
    SELECT
      (SELECT COUNT(*)::int FROM users) AS users,
      (SELECT COUNT(*)::int FROM organizations) AS organizations,
      (SELECT COUNT(*)::int FROM organization_members) AS memberships,
      (SELECT COUNT(*)::int FROM businesses) AS businesses,
      (SELECT COUNT(*)::int FROM business_settings) AS business_settings,
      (SELECT COUNT(*)::int FROM business_hours) AS business_hours,
      (SELECT COUNT(*)::int FROM ai_agents) AS agents,
      (SELECT COUNT(*)::int FROM agent_provider_mappings) AS agent_provider_mappings,
      (SELECT COUNT(*)::int FROM phone_numbers) AS phone_numbers,
      (SELECT COUNT(*)::int FROM phone_number_assignments) AS phone_assignments,
      (SELECT COUNT(*)::int FROM calls) AS calls,
      (SELECT COUNT(*)::int FROM call_events) AS call_events,
      (SELECT COUNT(*)::int FROM eazi_ai_call_migrations) AS migrations
  `);
  const c = counts.rows[0];
  for (const [k, v] of Object.entries(c)) {
    console.log(`RESET03 count_${k}=${v}`);
  }

  const users = await client.query(`
    SELECT id::text, email, display_name, email_verified_at
    FROM users
    ORDER BY created_at ASC
  `);
  for (const u of users.rows) {
    console.log(
      `RESET03 user id=${u.id} email=${maskEmail(u.email)} display=${JSON.stringify(u.display_name)} verified=${u.email_verified_at ? 'yes' : 'no'}`,
    );
  }

  const match = users.rows.find(
    (u) =>
      u.id === expectedUserId &&
      String(u.email).toLowerCase() === expectedEmail,
  );
  console.log(`RESET03 expected_user_match=${match ? 'yes' : 'no'}`);

  const orgs = await client.query(`
    SELECT id::text, name, slug, created_at
    FROM organizations
    ORDER BY created_at ASC
  `);
  for (const o of orgs.rows) {
    console.log(
      `RESET03 org id=${o.id} name=${JSON.stringify(o.name)} slug=${o.slug} created=${o.created_at.toISOString()}`,
    );
  }

  const members = await client.query(`
    SELECT
      om.id::text,
      om.user_id::text,
      om.organization_id::text,
      om.role,
      o.name AS org_name,
      u.email
    FROM organization_members om
    JOIN organizations o ON o.id = om.organization_id
    JOIN users u ON u.id = om.user_id
    ORDER BY om.created_at ASC
  `);
  for (const m of members.rows) {
    console.log(
      `RESET03 membership id=${m.id} user=${m.user_id} email=${maskEmail(m.email)} org=${m.organization_id} org_name=${JSON.stringify(m.org_name)} role=${m.role}`,
    );
  }

  const ownerOk =
    members.rowCount === 1 &&
    members.rows[0].role === 'owner' &&
    members.rows[0].user_id === expectedUserId;
  console.log(`RESET03 owner_membership_ok=${ownerOk ? 'yes' : 'no'}`);

  const businesses = await client.query(`
    SELECT
      b.id::text,
      b.name,
      b.status,
      b.industry,
      b.industry_label,
      b.email,
      b.phone_number,
      b.website,
      b.timezone,
      b.default_language,
      b.organization_id::text,
      o.name AS org_name,
      b.created_at
    FROM businesses b
    JOIN organizations o ON o.id = b.organization_id
    ORDER BY b.created_at ASC
  `);
  for (const b of businesses.rows) {
    console.log(
      `RESET03 business id=${b.id} name=${JSON.stringify(b.name)} status=${b.status} industry=${b.industry} email=${maskEmail(b.email)} phone=${b.phone_number || 'null'} website=${b.website || 'null'} tz=${b.timezone} lang=${b.default_language} org_id=${b.organization_id} org_name=${JSON.stringify(b.org_name)} created=${b.created_at.toISOString()}`,
    );
  }

  const bizOk =
    businesses.rowCount === 1 &&
    orgs.rowCount === 1 &&
    businesses.rows[0].organization_id === orgs.rows[0].id &&
    businesses.rows[0].status === 'active';
  console.log(`RESET03 business_org_link_ok=${bizOk ? 'yes' : 'no'}`);

  const orphanBiz = await client.query(`
    SELECT COUNT(*)::int AS n
    FROM businesses b
    LEFT JOIN organizations o ON o.id = b.organization_id
    WHERE o.id IS NULL
  `);
  console.log(`RESET03 orphan_businesses=${orphanBiz.rows[0].n}`);

  const zeroDomain =
    Number(c.agents) === 0 &&
    Number(c.agent_provider_mappings) === 0 &&
    Number(c.phone_numbers) === 0 &&
    Number(c.phone_assignments) === 0 &&
    Number(c.calls) === 0 &&
    Number(c.call_events) === 0;
  console.log(`RESET03 zero_agent_phone_call=${zeroDomain ? 'yes' : 'no'}`);
  console.log(
    `RESET03 expected_counts_ok=${
      Number(c.users) === 1 &&
      Number(c.organizations) === 1 &&
      Number(c.businesses) === 1 &&
      Number(c.memberships) === 1 &&
      Number(c.migrations) === 16
        ? 'yes'
        : 'no'
    }`,
  );

  await client.end();
  console.log('RESET03 inspect=PASS');
})().catch((error) => {
  console.error(`RESET03 inspect failed: ${error.message}`);
  process.exit(1);
});
