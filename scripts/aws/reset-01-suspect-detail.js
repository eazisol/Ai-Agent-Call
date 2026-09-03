/**
 * RESET-01 — Masked detail for safety-gate suspect rows (read-only).
 */
const { Client } = require('pg');

function maskEmail(email) {
  const e = String(email || '');
  const parts = e.split('@');
  if (parts.length !== 2) return '***';
  const local = parts[0];
  const prefix = local.slice(0, Math.min(2, local.length));
  return `${prefix}***@${parts[1]}`;
}

function maskPhone(e164) {
  if (!e164 || e164.length < 6) return '***';
  const prefixLen = e164.startsWith('+1') && e164.length >= 11 ? 4 : 3;
  return `${e164.slice(0, prefixLen)}***${e164.slice(-4)}`;
}

(async () => {
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
  console.log('RESET01 detail_start=yes');

  const users = await client.query(`
    SELECT id::text, email, display_name, email_verified_at, created_at, updated_at
    FROM users
    ORDER BY created_at ASC
  `);
  for (const u of users.rows) {
    console.log(
      `RESET01 user id=${u.id} email=${maskEmail(u.email)} display=${JSON.stringify(u.display_name)} verified=${u.email_verified_at ? 'yes' : 'no'} verified_at=${u.email_verified_at || 'null'} created=${u.created_at.toISOString()} updated=${u.updated_at.toISOString()}`,
    );

    const memberships = await client.query(
      `
      SELECT om.role, o.id::text AS org_id, o.name AS org_name, o.slug
      FROM organization_members om
      JOIN organizations o ON o.id = om.organization_id
      WHERE om.user_id = $1
      ORDER BY om.created_at ASC
    `,
      [u.id],
    );
    for (const m of memberships.rows) {
      console.log(
        `RESET01 user_membership user_id=${u.id} role=${m.role} org=${JSON.stringify(m.org_name)} slug=${m.slug} org_id=${m.org_id}`,
      );
    }

    const tokens = await client.query(
      `
      SELECT
        (SELECT COUNT(*)::int FROM refresh_tokens WHERE user_id = $1) AS refresh_n,
        (SELECT COUNT(*)::int FROM email_verification_tokens WHERE user_id = $1) AS email_tok_n,
        (SELECT COUNT(*)::int FROM password_reset_tokens WHERE user_id = $1) AS reset_tok_n
    `,
      [u.id],
    );
    console.log(
      `RESET01 user_tokens user_id=${u.id} refresh=${tokens.rows[0].refresh_n} email_verification=${tokens.rows[0].email_tok_n} password_reset=${tokens.rows[0].reset_tok_n}`,
    );
  }

  const businesses = await client.query(`
    SELECT
      b.id::text, b.name, b.status, b.industry_label, b.timezone,
      b.default_language, b.organization_id::text AS org_id,
      o.name AS org_name, o.slug AS org_slug,
      b.created_at, b.updated_at
    FROM businesses b
    LEFT JOIN organizations o ON o.id = b.organization_id
    ORDER BY b.created_at ASC
  `);
  for (const b of businesses.rows) {
    console.log(
      `RESET01 business id=${b.id} name=${JSON.stringify(b.name)} status=${b.status} industry=${JSON.stringify(b.industry_label)} tz=${b.timezone} lang=${b.default_language} org=${JSON.stringify(b.org_name)} slug=${b.org_slug} org_id=${b.org_id || 'null'} created=${b.created_at.toISOString()} updated=${b.updated_at.toISOString()}`,
    );

    const agents = await client.query(
      `
      SELECT id::text, name, status, created_at
      FROM ai_agents
      WHERE business_id = $1
      ORDER BY created_at ASC
    `,
      [b.id],
    );
    for (const a of agents.rows) {
      console.log(
        `RESET01 business_agent business_id=${b.id} agent_id=${a.id} name=${JSON.stringify(a.name)} status=${a.status} created=${a.created_at.toISOString()}`,
      );
    }

    const phones = await client.query(
      `
      SELECT id::text, provider, status, phone_number_e164, friendly_name, created_at
      FROM phone_numbers
      WHERE business_id = $1
      ORDER BY created_at ASC
    `,
      [b.id],
    );
    for (const p of phones.rows) {
      console.log(
        `RESET01 business_phone business_id=${b.id} phone_id=${p.id} provider=${p.provider} status=${p.status} e164=${maskPhone(p.phone_number_e164)} friendly=${JSON.stringify(p.friendly_name)} created=${p.created_at.toISOString()}`,
      );
    }
  }

  const calls = await client.query(`
    SELECT
      c.id::text, c.status, c.caller_number, c.receiver_number,
      c.business_id::text, b.name AS business_name,
      c.agent_id::text, a.name AS agent_name,
      c.started_at, c.ended_at, c.created_at, c.updated_at
    FROM calls c
    LEFT JOIN businesses b ON b.id = c.business_id
    LEFT JOIN ai_agents a ON a.id = c.agent_id
    ORDER BY c.created_at ASC
  `);
  console.log(`RESET01 calls_detail_count=${calls.rowCount}`);
  for (const c of calls.rows) {
    console.log(
      `RESET01 call id=${c.id} status=${c.status} from=${maskPhone(c.caller_number)} to=${maskPhone(c.receiver_number)} business=${JSON.stringify(c.business_name)} agent=${JSON.stringify(c.agent_name)} started=${c.started_at ? new Date(c.started_at).toISOString() : 'null'} ended=${c.ended_at ? new Date(c.ended_at).toISOString() : 'null'} created=${c.created_at.toISOString()}`,
    );
  }

  const events = await client.query(`
    SELECT
      ce.id::text, ce.call_id::text, ce.event_type, ce.created_at
    FROM call_events ce
    ORDER BY ce.created_at ASC
    LIMIT 50
  `);
  console.log(`RESET01 call_events_detail_count=${events.rowCount}`);
  for (const e of events.rows) {
    console.log(
      `RESET01 call_event id=${e.id} call_id=${e.call_id} type=${e.event_type} created=${e.created_at.toISOString()}`,
    );
  }

  // Focus lines for the two suspects
  console.log('RESET01 suspect_focus_start');
  const suspectUser = users.rows.find(
    (u) => !String(u.email).toLowerCase().includes('@eazisol.com'),
  );
  if (suspectUser) {
    console.log(
      `RESET01 suspect_user id=${suspectUser.id} email=${maskEmail(suspectUser.email)} display=${JSON.stringify(suspectUser.display_name)}`,
    );
  }
  const suspectBiz = businesses.rows.find(
    (b) => String(b.name).toLowerCase() === 'ahmad akram',
  );
  if (suspectBiz) {
    console.log(
      `RESET01 suspect_business id=${suspectBiz.id} name=${JSON.stringify(suspectBiz.name)} status=${suspectBiz.status} org=${JSON.stringify(suspectBiz.org_name)} slug=${suspectBiz.org_slug}`,
    );
  }
  console.log('RESET01 detail=PASS');
  await client.end();
})().catch((error) => {
  console.error(`RESET01 detail failed: ${error.message}`);
  process.exit(1);
});
