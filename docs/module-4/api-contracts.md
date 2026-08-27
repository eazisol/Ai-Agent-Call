# Module 04 — API contracts (Business Management)

Prefix `/api/v1`. All routes require M01 `AuthGuard` and an active organization cookie `eazi_org` (except where noted).

## Businesses

| Method | Path | Who | Behavior |
| --- | --- | --- | --- |
| POST | `/businesses` | owner/admin/manager | Create under active org; sets `eazi_biz` |
| GET | `/businesses` | any member | List for active org; `?includeArchived=true` optional |
| GET | `/businesses/:id` | any member | Read one (org-scoped); 404 otherwise |
| PATCH | `/businesses/:id` | see RBAC | Update core fields, settings, hours, status |
| DELETE | `/businesses/:id` | owner/admin | Hard delete if no dependents; else 409 |
| POST | `/businesses/:id/archive` | owner/admin | Sets `status=archived`; clears `eazi_biz` if active |

## Active business

| Method | Path | Behavior |
| --- | --- | --- |
| GET | `/businesses/active` | Returns active business or `null`; clears stale cookie |
| POST | `/businesses/active` | Body `{ businessId }` → sets `eazi_biz` |
| DELETE | `/businesses/active` | Clears `eazi_biz` |

## Cookies

| Name | Contents |
| --- | --- |
| `eazi_org` | Active organization UUID (M02) — required |
| `eazi_biz` | Active business UUID (M04) |

Switching/clearing org clears `eazi_biz`. Logout clears both.

## Create body (representative)

```json
{
  "name": "Bella Restaurant",
  "industry": "restaurant",
  "email": "hello@bella.example",
  "phone": "+1-555-0100",
  "website": "https://bella.example",
  "timezone": "America/New_York",
  "defaultLanguage": "en",
  "settings": { "city": "New York", "country": "US" },
  "hours": [
    { "dayOfWeek": 1, "isClosed": false, "opensAt": "09:00", "closesAt": "17:00" }
  ]
}
```

Response shape: `{ business: BusinessView }` with nested `settings` and 7-day `hours`.
