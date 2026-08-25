# Module 03 — Frontend surfaces

| Route | Access | Purpose |
| --- | --- | --- |
| `/team` | Portal (auth + org) | Member list, role changes, remove, pending invites, invite dialog, ownership transfer |
| `/invitations/accept?token=` | Public + optional session | Preview invite; sign-in CTA; accept when email matches |
| `/settings/organization` | Portal | Org settings editable by **owner and admin** (M03) |

## Client

- `src/lib/team-api.ts` — members, invitations, accept/preview, transfer; UI permission helpers
- `src/lib/organizations-api.ts` — roles typed `owner \| admin \| manager \| viewer`

## Nav

`/team` enabled in `isEnabledPortalRoute` (no longer coming-soon toast).

## Invite email flow

1. Owner/admin invites from `/team` → backend SMTP via `EmailDeliveryPort`
2. Link: `{AUTH_PUBLIC_APP_URL}/invitations/accept?token=…`
3. Invitee signs in (same email) → Accept → `eazi_org` set → redirect `/team`

SMTP failure surfaces as `INVITATION_EMAIL_FAILED` with retry guidance in the invite dialog.

## Post-acceptance refinement

See [invitation-ux-refinement.md](./invitation-ux-refinement.md) for Join-team confirmation, account-state CTAs, and auth return handoff (M03 remains COMPLETE).
