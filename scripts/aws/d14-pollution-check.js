const { Client } = require('pg');

const baselineCalls = Number.parseInt(process.env.D14_BASELINE_CALL_COUNT || '0', 10);
const baselineEvents = Number.parseInt(
  process.env.D14_BASELINE_EVENT_COUNT || '0',
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

  const calls = await client.query(`SELECT COUNT(*)::int AS n FROM calls`);
  const events = await client.query(
    `SELECT COUNT(*)::int AS n FROM provider_events`,
  );
  const callEvents = await client.query(
    `SELECT COUNT(*)::int AS n FROM call_events`,
  );

  console.log(`D14 post_call_count=${calls.rows[0].n}`);
  console.log(`D14 post_event_count=${events.rows[0].n}`);
  console.log(`D14 post_call_event_count=${callEvents.rows[0].n}`);
  console.log(`D14 baseline_call_count=${baselineCalls}`);
  console.log(`D14 baseline_event_count=${baselineEvents}`);

  if (calls.rows[0].n > baselineCalls) {
    console.error('D14 POLLUTION: call count increased after negative tests');
    process.exit(2);
  }
  if (events.rows[0].n > baselineEvents) {
    console.error('D14 POLLUTION: provider_events count increased after negative tests');
    process.exit(3);
  }

  await client.end();
  console.log('D14 pollution_check=PASS');
})().catch((error) => {
  console.error(`D14 pollution check failed: ${error.message}`);
  process.exit(1);
});
