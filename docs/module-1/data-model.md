# Module 01 — Data model

Identity tables are **user-scoped**. They do **not** carry `organization_id` or `business_id`. Tenant-owned product records remain M02/M04.

| Table | Purpose | Ownership / FK |
| --- | --- | --- |
| `users` | Account identity, unique email, password hash, verification timestamp | No tenant key |
| `refresh_tokens` | Hashed refresh JWT sessions; rotation via `replaced_by_id`; logout sets `revoked_at` | `user_id` → `users.id` **ON DELETE CASCADE** |
| `email_verification_tokens` | Hashed one-time verify tokens | `user_id` → `users.id` **ON DELETE CASCADE** |
| `password_reset_tokens` | Hashed one-time reset tokens | `user_id` → `users.id` **ON DELETE CASCADE** |

Raw tokens are never stored. `token_hash` is a 64-character SHA-256 hex digest.

## Email uniqueness invariant

`User@Example.com` and `user@example.com` are **the same identity**, not separate accounts.

| Layer | Rule |
| --- | --- |
| Database | Unique index `uq_users_email_lower` on `LOWER(email)` |
| Storage convention | Persist email as lowercase (domain logic normalizes before insert/lookup) |
| Migration | `UsersEmailCaseInsensitive1756041000000` lowercases existing rows, drops case-sensitive `uq_users_email`, creates `uq_users_email_lower` |

## Tenant-key confirmation (P01-M01-02-06)

- Auth tables are **not** tenant-owned. Cross-user access is prevented by authenticated `user_id`, not `organization_id`.
- Existing `businesses` / `calls.business_id` / `ai_configs.business_id` are unchanged.
- `organization_id` is still M02. Do not add it to `users` in M01 (a user may later belong to many organizations via `organization_members`).

## Migration history isolation

n8n and EaziAICall may share the same PostgreSQL database for now, but **must not** share migration bookkeeping.

| System | Migration table | Schema |
| --- | --- | --- |
| EaziAICall (TypeORM) | `eazi_ai_call_migrations` | `public` |
| n8n | `migrations` | `public` |

Transition (idempotent bootstrap in `src/database/bootstrap-eazi-migrations.ts`, run before `migration:show` / `migration:run`):

1. Create `eazi_ai_call_migrations` if missing.
2. If foundation/auth tables already exist, insert `FoundationBaseline1724500000000` and `AuthIdentity1756040000000` into the new table so TypeORM does not re-run them.
3. Leave `public.migrations` (n8n) unchanged — including any historical EaziAICall rows that were previously written there. Do not delete n8n rows.

Migrations:

- `1724500000000-FoundationBaseline`
- `1756040000000-AuthIdentity`
- `1756041000000-UsersEmailCaseInsensitive`

`synchronize` remains `false`.
