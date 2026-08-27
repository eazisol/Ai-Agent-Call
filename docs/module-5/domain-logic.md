# Module 05 — Domain logic (design)

| Field | Value |
| --- | --- |
| Module | M05 — AI Agent Management |
| Status | Designed — 27 August 2026 |

## Context resolution

1. Authenticate via `AuthGuard`.
2. Resolve active organization from `eazi_org`; require membership.
3. Resolve active business from `eazi_biz`; require business belongs to active org and `status = active`.
4. All agent operations default to that business.

## Core rules

- Create always inserts `agents` + `agent_configs` + `agent_prompts` in one transaction.
- Updates may patch agent name/status fields and nested config/prompt/escalation stub fields.
- List filters `business_id = active` and excludes `archived` unless requested.
- Get/patch/activate/deactivate/archive: load by id **and** `business_id`; mismatch → `AGENT_NOT_FOUND`.
- Activate: only from `inactive` (or already `active` idempotent). From `archived` → `AGENT_ARCHIVED`.
- Deactivate: only from `active` (or already `inactive` idempotent). From `archived` → `AGENT_ARCHIVED`.
- Archive: set `archived`; owner/admin only.
- Unarchive: PATCH status to `active` or `inactive`; owner/admin only.
- Hard delete: cascade children; block with `AGENT_HAS_DEPENDENTS` when future FKs exist (M05: allow if only cascading children).
- Name conflict among non-archived siblings → `AGENT_NAME_CONFLICT` / validation error.
- Language must be in MVP allow-list.
- Escalation contact email/phone validated when present; keywords stored as-is with max length/count limits in 05.02.
- **No** provider port calls.

## Permissions

Code-defined matrix (mirror M04 pattern, e.g. `agent-permissions.ts`):

- `canList` / `canView` — any member
- `canCreate` / `canUpdate` / `canActivate` — owner, admin, manager
- `canArchive` / `canDelete` — owner, admin

## Errors (planned codes)

| Code | When |
| --- | --- |
| `ACTIVE_ORGANIZATION_REQUIRED` | No/invalid org cookie |
| `ACTIVE_BUSINESS_REQUIRED` | No/invalid business cookie |
| `AGENT_NOT_FOUND` | Missing or cross-tenant/business |
| `AGENT_ARCHIVED` | Activate/deactivate while archived |
| `AGENT_HAS_DEPENDENTS` | Hard delete blocked |
| `AGENT_NAME_CONFLICT` | Duplicate name in business |
| `FORBIDDEN` | RBAC denial |
| `VALIDATION_ERROR` | DTO failures |
