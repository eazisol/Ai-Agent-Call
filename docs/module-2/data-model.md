# Module 02 — Data model

Tenant tables introduced in M02. Auth tables remain user-scoped (no `organization_id` on `users`).

| Table | Purpose | Ownership / FK |
| --- | --- | --- |
| `organizations` | Workspace / tenant identity (`name`, optional unique `slug`) | Primary tenant root |
| `organization_members` | Membership + MVP role (`owner` \| `member`) | `organization_id` → `organizations.id` **ON DELETE CASCADE**; `user_id` → `users.id` **ON DELETE CASCADE**; unique (`organization_id`, `user_id`) |

## Ownership keys (P01-M02-02-04)

| Key | Status in M02 |
| --- | --- |
| `organization_id` | Introduced on membership (and as the org PK). Required for future tenant-owned product tables. |
| `business_id` | **Unchanged** — still owned by M04 / prototype `businesses`. Not added to organizations. |

Client-supplied organization IDs are never trusted without a membership row for the authenticated user.

## Migration

- `1756050000000-Organizations` — creates `organizations` and `organization_members`
- `synchronize` remains `false`
- History table: `eazi_ai_call_migrations`
