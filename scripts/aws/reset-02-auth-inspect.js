/**
 * RESET-02 — Read-only auth account inspection (no tokens/hashes printed).
 */
const { Client } = require('pg');

function maskEmail(email) {
  const e = String(email || '');
  const parts = e.split('@');
  if (parts.length !== 2) return '***';
  const local = parts[0];
  return `${local.slice(0, Math.min(3, local.length))}***@${parts[1]}`;
}

(async () => {
  const expected = (process.env.RESET02_EMAIL || '').trim().toLowerCase();
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
  console.log('RESET02 inspect_start=yes');

  const users = await client.query(`
    SELECT
      id::text,
      email,
      display_name,
      email_verified_at,
      created_at,
      updated_at,
      (password_hash IS NOT NULL AND length(password_hash) > 0) AS has_password_hash,
      (password_hash LIKE '\\$2a$%' OR password_hash LIKE '\\$2b$%' OR password_hash LIKE '\\$2y$%') AS bcrypt_like
    FROM users
    ORDER BY created_at ASC
  `);
  console.log(`RESET02 users_count=${users.rowCount}`);

  for (const u of users.rows) {
    console.log(
      `RESET02 user id=${u.id} email=${maskEmail(u.email)} display=${JSON.stringify(u.display_name)} verified=${u.email_verified_at ? 'yes' : 'no'} verified_at=${u.email_verified_at ? u.email_verified_at.toISOString() : 'null'} created=${u.created_at.toISOString()} has_password_hash=${u.has_password_hash ? 'yes' : 'no'} bcrypt_like=${u.bcrypt_like ? 'yes' : 'no'}`,
    );
  }

  if (expected) {
    const match = users.rows.filter(
      (u) => String(u.email).toLowerCase() === expected,
    );
    console.log(`RESET02 expected_email_matches=${match.length}`);
    if (match.length === 1) {
      console.log(`RESET02 expected_user_id=${match[0].id}`);
      console.log(
        `RESET02 expected_verified=${match[0].email_verified_at ? 'yes' : 'no'}`,
      );
    }
  }

  const tokens = await client.query(`
    SELECT
      evt.id::text,
      evt.user_id::text,
      (evt.consumed_at IS NULL) AS open_token,
      evt.expires_at,
      evt.consumed_at,
      evt.created_at,
      u.email
    FROM email_verification_tokens evt
    JOIN users u ON u.id = evt.user_id
    ORDER BY evt.created_at DESC
    LIMIT 10
  `);
  console.log(`RESET02 verification_token_rows_sample=${tokens.rowCount}`);
  for (const t of tokens.rows) {
    console.log(
      `RESET02 verify_token user_id=${t.user_id} email=${maskEmail(t.email)} open=${t.open_token ? 'yes' : 'no'} expires=${t.expires_at.toISOString()} consumed=${t.consumed_at ? t.consumed_at.toISOString() : 'null'} created=${t.created_at.toISOString()}`,
    );
  }

  const emailLogsExist = await client.query(`
    SELECT to_regclass('public.email_logs') AS reg
  `);
  if (emailLogsExist.rows[0].reg) {
    const logs = await client.query(`
      SELECT id::text, status, created_at
      FROM email_logs
      ORDER BY created_at DESC
      LIMIT 5
    `);
    console.log(`RESET02 email_logs_sample=${logs.rowCount}`);
    for (const l of logs.rows) {
      console.log(
        `RESET02 email_log id=${l.id} status=${l.status} created=${l.created_at.toISOString()}`,
      );
    }
  } else {
    console.log('RESET02 email_logs=absent');
  }

  const orgs = await client.query(`SELECT COUNT(*)::int AS n FROM organizations`);
  const members = await client.query(
    `SELECT COUNT(*)::int AS n FROM organization_members`,
  );
  const businesses = await client.query(
    `SELECT COUNT(*)::int AS n FROM businesses`,
  );
  console.log(`RESET02 organizations_count=${orgs.rows[0].n}`);
  console.log(`RESET02 organization_members_count=${members.rows[0].n}`);
  console.log(`RESET02 businesses_count=${businesses.rows[0].n}`);

  const mig = await client.query(
    `SELECT COUNT(*)::int AS n FROM eazi_ai_call_migrations`,
  );
  console.log(`RESET02 migration_rows=${mig.rows[0].n}`);

  await client.end();
  console.log('RESET02 inspect=PASS');
})().catch((error) => {
  console.error(`RESET02 inspect failed: ${error.message}`);
  process.exit(1);
});
