# Module 03 — Domain logic (Users, Team & Roles)

## Membership

- Creating an organization (M02) still creates the creator as **owner**.
- Listing members requires any membership in the org.
- Changing roles / removing members requires `assertCan` plus target-policy helpers (`canAssignRole`, `canManageTarget`, `canRemoveMember`).
- Actors cannot change their own role via PATCH; ownership uses transfer.

## Invitations

1. Privileged actor posts email + inviteable role.
2. Prior pending invite for same org+email is cancelled (resend = rotate).
3. Opaque token generated; only SHA-256 hash stored.
4. Email sent through `EmailDeliveryPort` (SMTP adapter). On send failure, invite is cancelled and API returns `INVITATION_EMAIL_FAILED`.
5. Accept: authenticated user, normalized email match, unused non-expired token → insert `organization_members` with invite role, set `consumed_at`, set active org cookie.

## Ownership transfer

Atomic: target → `owner`, previous owner → `admin`. MVP keeps a single owner after transfer.

## Tenant isolation

All org-scoped member/invite operations call `requireMembership` first (404 for outsiders). Tokens are global lookup by hash but bind the invitee to a specific org on accept.

## Provider boundary

SMTP stays behind `EMAIL_DELIVERY_PORT`; team domain does not import Nodemailer.
