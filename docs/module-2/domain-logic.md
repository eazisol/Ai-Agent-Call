# Module 02 — Domain logic

Organizations domain lives in NestJS `OrganizationsModule`.

## Boundaries

| Component | Responsibility |
| --- | --- |
| `OrganizationsService` | Create (transactional owner membership), list, get, owner update, membership checks |
| `OrganizationsController` | HTTP contracts under `/api/v1/organizations`; requires `AuthGuard` |
| `AuthCookieService` | Sets/clears active workspace cookie `eazi_org`; cleared on logout |

No external providers in M02.

## Domain rules

- Create inserts `organizations` + `organization_members` (`role=owner`) in one transaction.
- Slug is optional; when omitted it is derived from the name (URL-safe). Explicit slug conflicts return `ORGANIZATION_SLUG_TAKEN` (409).
- List/get only return orgs where the user has membership.
- Non-members receive `ORGANIZATION_NOT_FOUND` (404).
- Non-owners receive `FORBIDDEN` (403) on settings update.
- Active org cookie is re-validated on `GET /organizations/active`; invalid cookies are cleared.

## Config

- `AUTH_ORG_COOKIE_NAME` (default `eazi_org`)
- Cookie Secure/SameSite follow existing `AUTH_COOKIE_*` settings
