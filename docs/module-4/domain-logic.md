# Module 04 — Domain logic (Business Management)

| Field | Value |
| --- | --- |
| Module | M04 — Business Management |
| Status | Implemented — 27 August 2026 |

## Service

`BusinessesService` — create / list / get / update / archive / delete / resolve-active.

### Active context

- Requires authenticated user + `eazi_org` cookie (membership re-validated)
- Active business cookie `eazi_biz` set on create/switch; cleared on logout, org switch, archive/delete of active business

### RBAC (`business-permissions.ts`)

| Action | owner | admin | manager | viewer |
| --- | --- | --- | --- | --- |
| list / view / switch active | ✓ | ✓ | ✓ | ✓ |
| create / update | ✓ | ✓ | ✓ | ✗ |
| archive / hard delete | ✓ | ✓ | ✗ | ✗ |

### Validation

- Industry enum; `industry_label` only meaningful for `other`
- Email required (normalized lower); phone optional pattern; website optional URL
- Timezone: valid IANA via `Intl.DateTimeFormat`
- Language: `en|es|fr|de|pt|ar|hi|ur`
- Hours: one interval/day; `opensAt < closesAt`; missing days default closed
- Delete: blocked with `BUSINESS_HAS_DEPENDENTS` if `calls` or `ai_configs` reference the business

### Errors

| Code | Status |
| --- | --- |
| `ACTIVE_ORGANIZATION_REQUIRED` | 400 |
| `BUSINESS_NOT_FOUND` | 404 |
| `BUSINESS_ARCHIVED` | 400 |
| `BUSINESS_HAS_DEPENDENTS` | 409 |
| `INVALID_TIMEZONE` / `INVALID_BUSINESS_HOURS` / `INVALID_*` | 400 |
| `FORBIDDEN` | 403 |
| `ORGANIZATION_NOT_FOUND` | 404 |
| `VALIDATION_ERROR` | 400 |

### Providers

None — no SMTP/Twilio in M04 domain.
