/**
 * RESET-01 — Production DB inventory + safety inspection (read-only).
 * Runs inside ECS with DATABASE_* from task secrets. No mutations.
 */
const { Client } = require('pg');
const { execSync } = require('child_process');

const MIGRATION_TABLE = 'eazi_ai_call_migrations';
const PRESERVE_TABLES = new Set([
  MIGRATION_TABLE,
  // Legacy / framework metadata that must never be truncated
  'migrations', // n8n or other tooling if present
]);

function classifyTable(schema, table) {
  if (schema !== 'public') {
    return 'PRESERVE';
  }
  if (PRESERVE_TABLES.has(table)) {
    return 'PRESERVE';
  }
  return 'RESET';
}

function looksLikeDummyEmail(email) {
  const e = String(email || '').toLowerCase();
  return (
    e.includes('eaziacall-prod-admin@') ||
    e.includes('@eazisol.com') ||
    e.includes('test@') ||
    e.includes('dummy') ||
    e.includes('bootstrap') ||
    e.includes('qa@') ||
    e.includes('+qa') ||
    e.includes('noreply')
  );
}

function looksLikeDummyName(name) {
  const n = String(name || '').toLowerCase();
  return (
    n.includes('eazi') ||
    n.includes('demo') ||
    n.includes('test') ||
    n.includes('qa') ||
    n.includes('bootstrap') ||
    n.includes('production tenant') ||
    n.includes('sample')
  );
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
  console.log('RESET01 inventory_start=yes');
  console.log(`RESET01 database=${process.env.DATABASE_NAME}`);

  const pgcrypto = await client.query(
    "SELECT extname, extversion FROM pg_extension WHERE extname = 'pgcrypto'",
  );
  console.log(
    `RESET01 pgcrypto=${pgcrypto.rowCount > 0 ? 'present' : 'missing'}`,
  );
  if (pgcrypto.rowCount > 0) {
    console.log(`RESET01 pgcrypto_version=${pgcrypto.rows[0].extversion}`);
  }

  const tables = await client.query(`
    SELECT
      n.nspname AS schema_name,
      c.relname AS table_name,
      COALESCE(
        (
          SELECT string_agg(format_type(a.atttypid, a.atttypmod), ',' ORDER BY a.attnum)
          FROM pg_index i
          JOIN pg_attribute a
            ON a.attrelid = i.indrelid
           AND a.attnum = ANY(i.indkey)
          WHERE i.indrelid = c.oid
            AND i.indisprimary
        ),
        'NONE'
      ) AS pk_types,
      (
        SELECT COUNT(*)::int
        FROM pg_constraint con
        WHERE con.conrelid = c.oid AND con.contype = 'f'
      ) AS fk_out_count,
      (
        SELECT COUNT(*)::int
        FROM pg_constraint con
        WHERE con.confrelid = c.oid AND con.contype = 'f'
      ) AS fk_in_count
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'r'
      AND n.nspname NOT IN ('pg_catalog', 'information_schema')
    ORDER BY n.nspname, c.relname
  `);

  console.log(`RESET01 table_count=${tables.rowCount}`);

  const inventory = [];
  for (const row of tables.rows) {
    const quoted = `"${row.schema_name}"."${row.table_name}"`;
    const countRes = await client.query(`SELECT COUNT(*)::bigint AS n FROM ${quoted}`);
    const classification = classifyTable(row.schema_name, row.table_name);
    const item = {
      schema: row.schema_name,
      table: row.table_name,
      row_count: Number(countRes.rows[0].n),
      pk_types: row.pk_types,
      fk_out: row.fk_out_count,
      fk_in: row.fk_in_count,
      classification,
    };
    inventory.push(item);
    console.log(
      `RESET01 table schema=${item.schema} name=${item.table} rows=${item.row_count} pk=${item.pk_types} fk_out=${item.fk_out} fk_in=${item.fk_in} class=${item.classification}`,
    );
  }

  const migCount = await client.query(
    `SELECT COUNT(*)::int AS n FROM public.${MIGRATION_TABLE}`,
  );
  console.log(`RESET01 migration_rows=${migCount.rows[0].n}`);
  const migNames = await client.query(
    `SELECT timestamp, name FROM public.${MIGRATION_TABLE} ORDER BY timestamp ASC`,
  );
  for (const m of migNames.rows) {
    console.log(`RESET01 migration_applied ts=${m.timestamp} name=${m.name}`);
  }

  // Safety inspection of domain rows (masked)
  const usersExist = inventory.some((t) => t.table === 'users');
  let realCustomerSuspect = false;
  const suspectReasons = [];

  if (usersExist) {
    const users = await client.query(`
      SELECT id::text, email, display_name, email_verified_at, created_at
      FROM users
      ORDER BY created_at ASC
      LIMIT 50
    `);
    console.log(`RESET01 users_sample_count=${users.rowCount}`);
    for (const u of users.rows) {
      const email = String(u.email || '');
      const masked =
        email.length > 4
          ? `${email.slice(0, 2)}***@${email.split('@')[1] || '***'}`
          : '***';
      const dummy =
        looksLikeDummyEmail(email) || looksLikeDummyName(u.display_name);
      console.log(
        `RESET01 user id=${u.id} email=${masked} display=${JSON.stringify(u.display_name)} verified=${u.email_verified_at ? 'yes' : 'no'} dummy_like=${dummy ? 'yes' : 'no'}`,
      );
      if (!dummy) {
        realCustomerSuspect = true;
        suspectReasons.push(`user_email_not_dummy_like:${masked}`);
      }
    }
  }

  if (inventory.some((t) => t.table === 'organizations')) {
    const orgs = await client.query(`
      SELECT id::text, name, slug, created_at
      FROM organizations
      ORDER BY created_at ASC
      LIMIT 50
    `);
    console.log(`RESET01 organizations_sample_count=${orgs.rowCount}`);
    for (const o of orgs.rows) {
      const dummy = looksLikeDummyName(o.name) || looksLikeDummyName(o.slug);
      console.log(
        `RESET01 org id=${o.id} name=${JSON.stringify(o.name)} slug=${o.slug} dummy_like=${dummy ? 'yes' : 'no'}`,
      );
      if (!dummy) {
        realCustomerSuspect = true;
        suspectReasons.push(`org_not_dummy_like:${o.slug || o.name}`);
      }
    }
  }

  if (inventory.some((t) => t.table === 'businesses')) {
    const businesses = await client.query(`
      SELECT id::text, name, status, created_at
      FROM businesses
      ORDER BY created_at ASC
      LIMIT 50
    `);
    console.log(`RESET01 businesses_sample_count=${businesses.rowCount}`);
    for (const b of businesses.rows) {
      const dummy = looksLikeDummyName(b.name);
      console.log(
        `RESET01 business id=${b.id} name=${JSON.stringify(b.name)} status=${b.status} dummy_like=${dummy ? 'yes' : 'no'}`,
      );
      if (!dummy) {
        realCustomerSuspect = true;
        suspectReasons.push(`business_not_dummy_like:${b.name}`);
      }
    }
  }

  if (inventory.some((t) => t.table === 'calls')) {
    const calls = await client.query(`
      SELECT COUNT(*)::int AS n,
             COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days')::int AS recent_30d
      FROM calls
    `);
    console.log(`RESET01 calls_total=${calls.rows[0].n}`);
    console.log(`RESET01 calls_recent_30d=${calls.rows[0].recent_30d}`);
  }

  if (inventory.some((t) => t.table === 'call_events')) {
    const events = await client.query(
      `SELECT COUNT(*)::int AS n FROM call_events`,
    );
    console.log(`RESET01 call_events_total=${events.rows[0].n}`);
  }

  if (inventory.some((t) => t.table === 'phone_numbers')) {
    const phones = await client.query(`
      SELECT COUNT(*)::int AS n,
             COUNT(*) FILTER (WHERE status = 'active')::int AS active_n
      FROM phone_numbers
    `);
    console.log(`RESET01 phone_numbers_total=${phones.rows[0].n}`);
    console.log(`RESET01 phone_numbers_active=${phones.rows[0].active_n}`);
  }

  console.log(
    `RESET01 real_customer_data_suspect=${realCustomerSuspect ? 'YES' : 'NO'}`,
  );
  for (const reason of suspectReasons) {
    console.log(`RESET01 suspect_reason=${reason}`);
  }

  const preserve = inventory.filter((t) => t.classification === 'PRESERVE');
  const reset = inventory.filter((t) => t.classification === 'RESET');
  console.log(`RESET01 preserve_table_count=${preserve.length}`);
  console.log(`RESET01 reset_table_count=${reset.length}`);
  console.log(
    `RESET01 reset_tables=${reset.map((t) => t.table).join(',')}`,
  );
  console.log(
    `RESET01 preserve_tables=${preserve.map((t) => t.table).join(',')}`,
  );

  // migration:show (inspection only)
  try {
    const show = execSync(
      'node node_modules/typeorm/cli.js -d dist/database/data-source.js migration:show',
      { encoding: 'utf8' },
    );
    console.log('RESET01 migration_show_start');
    for (const line of show.split('\n')) {
      if (line.trim()) {
        console.log(`RESET01 migration_show ${line.trim()}`);
      }
    }
    const pending = (show.match(/\[ \]/g) || []).length;
    const appliedMarks = (show.match(/\[X\]/gi) || []).length;
    console.log(`RESET01 migration_show_applied_marks=${appliedMarks}`);
    console.log(`RESET01 migration_show_pending=${pending}`);
  } catch (err) {
    console.error(`RESET01 migration_show_error=${err.message}`);
    process.exit(1);
  }

  await client.end();
  console.log('RESET01 inventory=PASS');
})().catch((error) => {
  console.error(`RESET01 inventory failed: ${error.message}`);
  process.exit(1);
});
