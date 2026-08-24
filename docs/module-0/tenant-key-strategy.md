# Module 0 tenant-key strategy

**Status:** Accepted for M00. Isolation proofs belong to M02.

## Decision

| Key | Owner module | Role |
| --- | --- | --- |
| `organization_id` | M02 | Primary tenant, membership, billing, and security boundary |
| `business_id` | M04 | Operational owner of agents, numbers, knowledge, and calls |
| PostgreSQL RLS | M02 decision | Optional extra control; application scoping is mandatory either way |

M00 does **not** add `organization_id`. The baseline schema keeps the prototype `business_id` foreign key on `calls` and `ai_configs` (`ON DELETE SET NULL` / `CASCADE` as in the foundation migration). Queries remain unscoped until authentication (M01) and organizations (M02) exist.

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
