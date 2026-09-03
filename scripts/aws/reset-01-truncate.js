/**
 * RESET-01 — Truncate RESET-classified application tables (destructive).
 * Requires EAZI_ALLOW_PROD_DATA_RESET=YES and EAZI_RESET_MODE=execute.
 * Never truncates eazi_ai_call_migrations or other PRESERVE tables.
 */
const { Client } = require('pg');
const { execSync } = require('child_process');

const MIGRATION_TABLE = 'eazi_ai_call_migrations';
const PRESERVE_TABLES = new Set([MIGRATION_TABLE, 'migrations']);

function classifyTable(schema, table) {
  if (schema !== 'public') return 'PRESERVE';
  if (PRESERVE_TABLES.has(table)) return 'PRESERVE';
  return 'RESET';
}

(async () => {
  const allow = process.env.EAZI_ALLOW_PROD_DATA_RESET;
  const mode = (process.env.EAZI_RESET_MODE || 'dry-run').toLowerCase();

  console.log(`RESET01 truncate_mode=${mode}`);
  console.log(
    `RESET01 allow_flag_present=${allow === 'YES' ? 'yes' : 'no'}`,
  );

  if (mode === 'execute' && allow !== 'YES') {
    console.error(
      'RESET01 REFUSED: EAZI_ALLOW_PROD_DATA_RESET must be exactly YES for execute mode',
    );
    process.exit(2);
  }

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

  const tables = await client.query(`
    SELECT n.nspname AS schema_name, c.relname AS table_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'r'
      AND n.nspname NOT IN ('pg_catalog', 'information_schema')
    ORDER BY n.nspname, c.relname
  `);

  const resetTables = [];
  const preserveTables = [];
  const beforeCounts = {};

  for (const row of tables.rows) {
    const quoted = `"${row.schema_name}"."${row.table_name}"`;
    const countRes = await client.query(
      `SELECT COUNT(*)::bigint AS n FROM ${quoted}`,
    );
    const n = Number(countRes.rows[0].n);
    beforeCounts[`${row.schema_name}.${row.table_name}`] = n;
    const classification = classifyTable(row.schema_name, row.table_name);
    if (classification === 'RESET') {
      resetTables.push({ schema: row.schema_name, table: row.table_name });
    } else {
      preserveTables.push({ schema: row.schema_name, table: row.table_name });
    }
    console.log(
      `RESET01 before schema=${row.schema_name} name=${row.table_name} rows=${n} class=${classification}`,
    );
  }

  console.log(
    `RESET01 preserve_tables=${preserveTables.map((t) => t.table).join(',')}`,
  );
  console.log(
    `RESET01 reset_tables=${resetTables.map((t) => t.table).join(',')}`,
  );

  if (resetTables.some((t) => PRESERVE_TABLES.has(t.table))) {
    console.error('RESET01 REFUSED: preserve table leaked into reset set');
    process.exit(3);
  }

  if (mode !== 'execute') {
    console.log('RESET01 dry_run=PASS (no truncate performed)');
    await client.end();
    return;
  }

  const truncateList = resetTables
    .map((t) => `"${t.schema}"."${t.table}"`)
    .join(', ');

  console.log('RESET01 truncate_begin=yes');
  await client.query('BEGIN');
  try {
    await client.query(
      `TRUNCATE TABLE ${truncateList} RESTART IDENTITY CASCADE`,
    );
    await client.query('COMMIT');
    console.log('RESET01 truncate_commit=yes');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(`RESET01 truncate_failed=${err.message}`);
    process.exit(4);
  }

  let zeroOk = true;
  for (const t of resetTables) {
    const quoted = `"${t.schema}"."${t.table}"`;
    const countRes = await client.query(
      `SELECT COUNT(*)::bigint AS n FROM ${quoted}`,
    );
    const n = Number(countRes.rows[0].n);
    console.log(
      `RESET01 after schema=${t.schema} name=${t.table} rows=${n}`,
    );
    if (n !== 0) zeroOk = false;
  }

  const migBefore = beforeCounts[`public.${MIGRATION_TABLE}`];
  const migAfter = await client.query(
    `SELECT COUNT(*)::int AS n FROM public.${MIGRATION_TABLE}`,
  );
  console.log(`RESET01 migration_rows_before=${migBefore}`);
  console.log(`RESET01 migration_rows_after=${migAfter.rows[0].n}`);
  if (Number(migAfter.rows[0].n) !== Number(migBefore)) {
    console.error('RESET01 FAILED: migration table row count changed');
    process.exit(5);
  }

  const pgcrypto = await client.query(
    "SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto'",
  );
  console.log(
    `RESET01 pgcrypto=${pgcrypto.rowCount > 0 ? 'present' : 'missing'}`,
  );
  if (pgcrypto.rowCount === 0) {
    console.error('RESET01 FAILED: pgcrypto missing');
    process.exit(6);
  }

  const show = execSync(
    'node node_modules/typeorm/cli.js -d dist/database/data-source.js migration:show',
    { encoding: 'utf8' },
  );
  console.log('RESET01 migration_show_start');
  for (const line of show.split('\n')) {
    if (line.trim()) console.log(`RESET01 migration_show ${line.trim()}`);
  }
  if (/\[ \]/.test(show)) {
    console.error('RESET01 FAILED: pending migrations detected');
    process.exit(7);
  }

  await client.end();

  if (!zeroOk) {
    console.error('RESET01 FAILED: non-zero rows remain in RESET tables');
    process.exit(8);
  }

  console.log('RESET01 truncate=PASS');
})().catch((error) => {
  console.error(`RESET01 truncate failed: ${error.message}`);
  process.exit(1);
});
