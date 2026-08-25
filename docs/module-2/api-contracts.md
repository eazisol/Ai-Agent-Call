# Module 02 — API contracts

All routes require a valid M01 session (`AuthGuard`). Prefix `/api/v1`.

| Method | Path | Behavior |
| --- | --- | --- |
| POST | `/organizations` | Create org + owner membership; sets `eazi_org` cookie |
| GET | `/organizations` | List orgs for current user (`{ organizations }`) |
| GET | `/organizations/active` | Active org from cookie after membership check, or `null` |
| POST | `/organizations/active` | Body `{ organizationId }`; sets cookie after membership check |
| DELETE | `/organizations/active` | Clears `eazi_org` cookie |
| GET | `/organizations/:id` | Read one org (member); 404 if not a member |
| PATCH | `/organizations/:id` | Update `name` / `slug` (owner only); 403 if member |

## Cookies

| Name | Contents | Flags |
| --- | --- | --- |
| `eazi_org` | Organization UUID | HttpOnly, Secure/SameSite from auth cookie config, Path=/ |

Logout clears `eazi_org` along with access/refresh cookies.

## Errors

| Code | Status | When |
| --- | --- | --- |
| `VALIDATION_ERROR` | 400 | DTO validation |
| `ORGANIZATION_NOT_FOUND` | 404 | Missing membership / unknown id |
| `FORBIDDEN` | 403 | Member (non-owner) PATCH |
| `ORGANIZATION_SLUG_TAKEN` | 409 | Explicit slug already used |
| `INVALID_ORGANIZATION` / `INVALID_ORGANIZATION_SLUG` | 400 | Domain validation |
