const { execSync } = require('child_process');
const { Client } = require('pg');

const migrationTable = process.env.DAZI_MIGRATION_TABLE || 'eazi_ai_call_migrations';
const expectedCount = Number.parseInt(
  process.env.DAZI_EXPECTED_MIGRATION_COUNT || '0',
  10,
);

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
  await client.query('SELECT 1');

  const migrationTableCheck = await client.query(
    `SELECT to_regclass('public.${migrationTable}') AS reg`,
  );
  if (!migrationTableCheck.rows[0].reg) {
    console.error('VERIFY migration table missing');
    process.exit(1);
  }

  const applied = await client.query(
    `SELECT COUNT(*)::int AS n FROM ${migrationTable}`,
  );
  const appliedCount = applied.rows[0].n;
  console.log(`VERIFY applied_migration_count=${appliedCount}`);
  console.log(`VERIFY expected_migration_count=${expectedCount}`);
  if (appliedCount !== expectedCount) {
    console.error('VERIFY applied count mismatch');
    process.exit(1);
  }

  const pgcrypto = await client.query(
    "SELECT extname FROM pg_extension WHERE extname = 'pgcrypto'",
  );
  console.log(`VERIFY pgcrypto=${pgcrypto.rowCount > 0 ? 'yes' : 'no'}`);
  if (pgcrypto.rowCount === 0) {
    console.error('VERIFY pgcrypto missing');
    process.exit(1);
  }

  const core = await client.query(
    "SELECT COUNT(*)::int AS n FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('users', 'organizations', 'businesses', 'calls')",
  );
  console.log(`VERIFY core_tables_found=${core.rows[0].n}`);
  if (core.rows[0].n < 4) {
    console.error('VERIFY core schema incomplete');
    process.exit(1);
  }

  await client.end();

  const show = execSync(
    'node node_modules/typeorm/cli.js -d dist/database/data-source.js migration:show',
    { encoding: 'utf8' },
  );
  console.log('VERIFY migration_show_start');
  console.log(show);
  if (/\[ \]/.test(show)) {
    console.error('VERIFY pending migrations detected');
    process.exit(1);
  }
  console.log('VERIFY complete');
})().catch((error) => {
  console.error(`VERIFY failed: ${error.message}`);
  process.exit(1);
});
