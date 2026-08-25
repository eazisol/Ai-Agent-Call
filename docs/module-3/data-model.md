# Module 03 — Data model (Users, Team & Roles)

## `organization_members` (updated)

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid PK | |
| organization_id | uuid FK → organizations ON DELETE CASCADE | |
| user_id | uuid FK → users ON DELETE CASCADE | |
| role | varchar(20) | `owner` \| `admin` \| `manager` \| `viewer` |
| created_at / updated_at | timestamptz | |

Constraints:

- Unique `(organization_id, user_id)`
- Check: `role IN ('owner','admin','manager','viewer')`
- Migration maps legacy `member` → `viewer`

## `organization_invitations` (new)

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid PK | |
| organization_id | uuid FK → organizations ON DELETE CASCADE | |
| email | varchar(320) | Normalized lowercase |
| role | varchar(20) | `admin` \| `manager` \| `viewer` |
| token_hash | varchar(64) | SHA-256 of opaque token; unique |
| invited_by_user_id | uuid FK → users ON DELETE SET NULL | Nullable |
| expires_at | timestamptz | Default TTL 7 days |
| consumed_at | timestamptz nullable | Single-use |
| cancelled_at | timestamptz nullable | Soft cancel |
| created_at / updated_at | timestamptz | |

Indexes:

- `(organization_id)`, `(email)`
- Unique partial: `(organization_id, email)` where not consumed and not cancelled

## Permissions

Not persisted. Matrix lives in application code (`organization-permissions.ts`).

## Migration

`TeamRolesAndInvitations1756060000000` — registered in TypeORM data source; `synchronize: false`.
