# Module 0 tenant-key strategy

**Status:** Accepted for M00. M02 completed 25 August 2026 — see `docs/module-2/README.md`. Isolation proofs live in organization domain/e2e tests.

## Decision

| Key | Owner module | Role |
| --- | --- | --- |
| `organization_id` | M02 | Primary tenant, membership, billing, and security boundary |
| `business_id` | M04 | Operational owner of agents, numbers, knowledge, and calls |
| `agent_id` (via `business_id`) | M05 | Agents live under a business; APIs require `eazi_org` + `eazi_biz` (no `eazi_agent` cookie in M05) |
| M04 status | Completed — 27 August 2026 | See `docs/module-4/README.md` |
| PostgreSQL RLS | Deferred past M02 MVP | Optional extra control; **application scoping is mandatory** in M02 |

M00 does **not** add `organization_id`. The baseline schema keeps the prototype `business_id` foreign key on `calls` and `ai_configs` (`ON DELETE SET NULL` / `CASCADE` as in the foundation migration). Queries remain unscoped until authentication (M01) and organizations (M02) exist.

M01 identity tables (`users`, `refresh_tokens`, `email_verification_tokens`, `password_reset_tokens`) are user-scoped only. See `docs/module-1/data-model.md`.

M02 introduces `organizations` + `organization_members` and an active-workspace cookie (`eazi_org`). Client-supplied organization IDs are never trusted without membership context.

M04 (04.02) extends `businesses` with `organization_id`, adds `business_settings` / `business_hours`, and an active-business cookie (`eazi_biz`). API queries always filter by active org membership; legacy rows without `organization_id` are not exposed.

## M00 isolation posture (accepted exception)

Pretending tenant isolation exists would be unsafe. Instead:

1. Prototype call-read APIs (`GET /api/v1/calls`) are gated by `PrototypeOnlyGuard`.
2. They are disabled when `PROTOTYPE_API_ENABLED=false` **or** `NODE_ENV=production` (404).
3. Webhooks identify calls by provider mapping (`provider` + `external_call_id`), not by client-supplied tenant IDs.
4. Cross-tenant automated isolation tests start in M02 after `organizations` / `organization_members` exist.

## Forward conventions (do not implement in M00)

- UUID primary keys, `created_at` / `updated_at`, and explicit migrations.
- Tenant-owned tables will carry `organization_id` (required) and usually `business_id` when the record is business-scoped.
- Foreign keys must not allow a child row to reference a parent in another organization.
- Client-supplied organization IDs are never trusted without membership context.
