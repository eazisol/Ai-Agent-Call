# Database migration runbook

## Rules

- Never enable TypeORM `synchronize`.
- Back up a shared database before running or reverting migrations.
- Inspect generated SQL and test against a disposable copy first.
- Run one application revision against one known migration state.

## Local commands

Export the database variables from an untracked environment file, then:

```bash
npm run migration:show
npm run migration:run
npm run migration:revert
```

The first Module 0 migration is an idempotent foundation baseline. Its `down`
method drops the baseline tables, so `migration:revert` is destructive and must
not be used without a verified backup.

## Existing development database

The baseline uses `CREATE ... IF NOT EXISTS` for retained prototype tables and
adds provider mapping/event tables. Before applying it to an existing database,
compare the actual columns and enum types with the migration. If they differ,
create a reconciliation migration; do not edit an already-applied migration.

## Docker

The backend image runs `migration:run` before the API. A failed migration prevents
the service from becoming healthy, which also prevents the frontend from starting
through Compose's health dependency.

## EaziAICall vs n8n migration history

TypeORM uses `eazi_ai_call_migrations`. n8n continues to use `public.migrations`.
`npm run migration:show` and `migration:run` first execute
`migration:bootstrap`, which creates/seeds the EaziAICall table from existing
schema evidence without modifying n8n history.

## Module 01 identity migrations

After the foundation baseline, Module 01 adds:

1. `1756040000000-AuthIdentity` — `users`, `refresh_tokens`, `email_verification_tokens`, `password_reset_tokens`
2. `1756041000000-UsersEmailCaseInsensitive` — unique `LOWER(email)`

Details: [docs/module-1/data-model.md](../module-1/data-model.md).

## Module 02 organization migrations

1. `1756050000000-Organizations` — `organizations`, `organization_members`

Details: [docs/module-2/data-model.md](../module-2/data-model.md).
