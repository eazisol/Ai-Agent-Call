/**
 * One-time / idempotent bootstrap: move EaziAICall TypeORM history off n8n's
 * public.migrations table onto eazi_ai_call_migrations.
 *
 * Does not modify or delete rows in public.migrations (n8n ownership).
 */
import { Client } from 'pg';
import { formatPgError, loadBackendEnv } from './load-backend-env';

loadBackendEnv();

const APPLIED = [
  {
    timestamp: 1724500000000,
    name: 'FoundationBaseline1724500000000',
    evidenceSql: `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'businesses'`,
  },
  {
    timestamp: 1756040000000,
    name: 'AuthIdentity1756040000000',
    evidenceSql: `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users'`,
  },
] as const;

async function main(): Promise<void> {
  const host = process.env.DATABASE_HOST ?? 'localhost';
  const port = Number.parseInt(process.env.DATABASE_PORT ?? '5432', 10);
  const database = process.env.DATABASE_NAME ?? 'ai_call_agent';
  const user = process.env.DATABASE_USER ?? 'postgres';

  if (!process.env.DATABASE_PASSWORD) {
    throw new Error(
      `DATABASE_PASSWORD is not set (connecting would use ${user}@${host}:${port}/${database}). Load .env before migration:bootstrap.`,
    );
  }

  const client = new Client({
    host,
    port,
    user,
    password: process.env.DATABASE_PASSWORD,
    database,
    ssl:
      process.env.DATABASE_SSL === 'true'
        ? { rejectUnauthorized: false }
        : undefined,
  });

  await client.connect();
  try {
    await client.query('BEGIN');
    await client.query(`
      CREATE TABLE IF NOT EXISTS eazi_ai_call_migrations (
        id SERIAL PRIMARY KEY,
        timestamp bigint NOT NULL,
        name varchar NOT NULL
      );
    `);

    for (const migration of APPLIED) {
      const evidence = await client.query(migration.evidenceSql);
      if (evidence.rowCount === 0) {
        continue;
      }

      await client.query(
        `
          INSERT INTO eazi_ai_call_migrations (timestamp, name)
          SELECT $1::bigint, $2::varchar
          WHERE NOT EXISTS (
            SELECT 1 FROM eazi_ai_call_migrations WHERE name = $2::varchar
          )
        `,
        [migration.timestamp, migration.name],
      );
    }

    await client.query('COMMIT');
    console.log(
      `Bootstrapped eazi_ai_call_migrations on ${host}:${port}/${database} (n8n public.migrations left unchanged).`,
    );
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  console.error(`migration bootstrap failed: ${formatPgError(error)}`);
  process.exitCode = 1;
});
