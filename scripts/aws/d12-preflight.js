const { Client } = require('pg');

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
  const tables = await client.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name",
  );
  console.log('PREFLIGHT connectivity=ok');
  console.log(`PREFLIGHT public_table_count=${tables.rowCount}`);
  if (tables.rowCount > 0) {
    console.log(
      `PREFLIGHT public_tables=${tables.rows.map((row) => row.table_name).join(',')}`,
    );
  }
  await client.end();
})().catch((error) => {
  console.error(`PREFLIGHT failed: ${error.message}`);
  process.exit(1);
});
