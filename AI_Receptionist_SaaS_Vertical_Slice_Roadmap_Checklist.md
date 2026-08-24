# AI Receptionist SaaS — Vertical Slice Development Roadmap & Master Checklist

**Source:** AI Receptionist SaaS Master Project Specification
**Methodology:** Vertical Slice / Feature-Based Incremental Development
**Rule:** Do not start the next module until the current module passes its acceptance criteria and Definition of Done.

> Checklist syntax: `- [ ] ID — detailed task`. Change `[ ]` to `[x]` only after the item is verified.

## Status Legend

- [ ] Not Started
- [~] In Progress (use only in working copies if desired)
- [x] Completed and verified

## Global Vertical Slice Gate — Applies to Every Module

- [ ] VS-GLOBAL-01 — Requirements and scope for the module are finalized before implementation.
- [ ] VS-GLOBAL-02 — Dependencies are confirmed complete or explicitly mocked only when approved.
- [ ] VS-GLOBAL-03 — Database changes are implemented through migrations where required.
- [ ] VS-GLOBAL-04 — Backend domain logic and APIs are implemented.
- [ ] VS-GLOBAL-05 — Authentication, authorization, validation and tenant isolation are applied.
- [ ] VS-GLOBAL-06 — Frontend UI is implemented for the module where a user-facing surface exists.
- [ ] VS-GLOBAL-07 — Frontend is connected to real backend APIs; permanent fake/mock data is not accepted as completion.
- [ ] VS-GLOBAL-08 — Loading, empty, success, validation and error states are implemented.
- [ ] VS-GLOBAL-09 — External provider integration is completed and failure behavior is handled where applicable.
- [ ] VS-GLOBAL-10 — Unit and integration tests are completed where applicable.
- [ ] VS-GLOBAL-11 — End-to-end/manual QA validates the complete user journey.
- [ ] VS-GLOBAL-12 — Security review and tenant-boundary checks pass.
- [ ] VS-GLOBAL-13 — Documentation and architecture/module registry are updated.
- [ ] VS-GLOBAL-14 — No unrelated future module is implemented during the slice.
- [ ] VS-GLOBAL-15 — Module is accepted before the next module moves to In Development.

## Overall Development Phases & Modules

- [ ] P00 — **Foundation**
  - [ ] M00 — Existing Project Audit & SaaS Foundation (MVP)
- [ ] P01 — **SaaS Core**
  - [ ] M01 — Authentication (MVP)
  - [ ] M02 — Organizations / Tenants (MVP)
  - [ ] M03 — Users, Team & Roles (MVP)
  - [ ] M04 — Business Management (MVP)
- [ ] P02 — **AI Agent Core**
  - [ ] M05 — AI Agent Management (MVP)
  - [ ] M06 — ElevenLabs Voice Agent Provider (MVP)
- [ ] P03 — **Knowledge & Voice**
  - [ ] M07 — Knowledge Base (MVP)
  - [ ] M08 — Voice Library (MVP)
  - [ ] M09 — Voice Cloning (MVP/Premium)
- [ ] P04 — **Telephony**
  - [ ] M10 — Twilio Telephony Provider (MVP)
  - [ ] M11 — Phone Number Management (MVP)
- [ ] P05 — **AI Calling MVP**
  - [ ] M12 — Incoming AI Calls (MVP)
  - [ ] M13 — Outbound Calls (Post-MVP)
  - [ ] M14 — Call Management (MVP)
  - [ ] M15 — Transcript Management (MVP)
  - [ ] M16 — Call Summary & Analysis (MVP)
- [ ] P06 — **Business Tools**
  - [ ] M17 — Generic Tool Framework (MVP)
  - [ ] M18 — Appointment Booking (Industry)
  - [ ] M19 — Restaurant Reservations (Industry)
- [ ] P07 — **CRM & Intelligence**
  - [ ] M20 — Customer / CRM (Commercial)
  - [ ] M21 — Knowledge Gap Detection (Commercial)
- [ ] P08 — **Automation**
  - [ ] M22 — n8n Automation (Commercial)
  - [ ] M23 — Notifications (Commercial)
- [ ] P09 — **Commercial SaaS**
  - [ ] M24 — Analytics (Commercial)
  - [ ] M25 — Subscription Plans (Commercial)
  - [ ] M26 — Usage Metering (Commercial)
  - [ ] M27 — Billing (Commercial)
- [ ] P10 — **Admin & Production**
  - [ ] M28 — Admin Portal (Commercial)
  - [ ] M29 — Security, Audit & Monitoring (Commercial)
- [ ] P11 — **Multi-Provider Future**
  - [ ] M30 — Retell Voice Agent Provider (Future)
  - [ ] M31 — OpenAI Realtime Provider (Future)
  - [ ] M32 — Telnyx Telephony Provider (Future)
- [ ] P12 — **Platform Expansion**
  - [ ] M33 — Developer / Integration Portal (Future)
  - [ ] M34 — Documentation / Help Center (Future)
  - [ ] M35 — Operations / Support Console (Future)
  - [ ] M36 — Partner / Reseller / White-Label Portal (Future)
  - [ ] M37 — Public Status Page (Future)
  - [ ] M38 — Business Mobile App (Future)
  - [ ] M39 — Embeddable Web Voice / Chat Widget (Future)
  - [ ] M40 — Public Demo / Trial Sandbox (Future)

---

# PHASE 00 — Foundation

- [ ] P00-GATE — Phase 00 is complete only when every required module below is accepted.

## Module 00 — Existing Project Audit & SaaS Foundation `M00`

**Target:** MVP

**Dependencies:** None

### Submodule 00.01 — Scope & Requirements

- [ ] P00-M00-01-01 — Confirm the objective and boundaries of **Existing Project Audit & SaaS Foundation**.
- [ ] P00-M00-01-02 — Create a safe Git checkpoint of the current working repository before architecture changes.
- [ ] P00-M00-01-03 — Audit the existing NestJS backend, Next.js frontend, PostgreSQL schema, Docker setup, Twilio integration, OpenAI Realtime code, voice-stream/WebSocket code, n8n integration, dashboard, calls pages and settings.
- [ ] P00-M00-01-04 — Classify current files and modules as Keep, Refactor, Move, Park-for-Future or Remove-with-Approval.
- [ ] P00-M00-01-05 — Prepare the multi-tenant foundation without rebuilding the project from zero.
- [ ] P00-M00-01-06 — Prepare provider-abstraction folders/interfaces for telephony and voice-agent providers.
- [ ] P00-M00-01-07 — Establish a migration-first database workflow and remove production dependence on TypeORM synchronize:true.
- [ ] P00-M00-01-08 — Validate local and Docker startup for frontend, backend, PostgreSQL and Redis.
- [ ] P00-M00-01-09 — Define S3-compatible object-storage configuration and ownership boundaries.
- [ ] P00-M00-01-10 — Add health checks, structured error handling and baseline logging.
- [ ] P00-M00-01-11 — Document environment-variable strategy for local, development, staging and production.
- [ ] P00-M00-01-12 — Explicitly document what is out of scope for this module so later-phase work is not pulled forward.

### Submodule 00.02 — Data & Persistence

- [ ] P00-M00-02-01 — Implement/confirm data requirement: `Inventory existing tables and decide which are retained, migrated or extended.`.
- [ ] P00-M00-02-02 — Implement/confirm data requirement: `Create migration baseline without destroying existing development data.`.
- [ ] P00-M00-02-03 — Implement/confirm data requirement: `Document tenant-key strategy for future organization_id/business_id ownership.`.
- [ ] P00-M00-02-04 — Create and test migrations for this module without destructive uncontrolled schema synchronization.
- [ ] P00-M00-02-05 — Confirm organization/business ownership keys and foreign-key behavior for tenant-owned records.

### Submodule 00.03 — Backend / Domain Logic

- [ ] P00-M00-03-01 — Create/update the NestJS module boundaries, services and domain logic for **Existing Project Audit & SaaS Foundation**.
- [ ] P00-M00-03-02 — Keep provider-specific implementation outside core business rules wherever the provider abstraction applies.
- [ ] P00-M00-03-03 — Add consistent error handling, logging and retry/idempotency behavior where required.

### Submodule 00.04 — API / Contracts

- [ ] P00-M00-04-01 — Implement/verify API contract: `Add/verify backend health endpoint.`.
- [ ] P00-M00-04-02 — Implement/verify API contract: `Confirm frontend-to-backend base URL strategy for local and containers.`.
- [ ] P00-M00-04-03 — Implement/verify API contract: `Document webhook routes already present and routes to preserve.`.
- [ ] P00-M00-04-04 — Add DTO/schema validation and consistent API error responses.

### Submodule 00.05 — Frontend / UX

- [ ] P00-M00-05-01 — Build/complete frontend requirement: Verify existing Dashboard, Calls and Settings routes build successfully..
- [ ] P00-M00-05-02 — Build/complete frontend requirement: Document current reusable frontend components and layouts..
- [ ] P00-M00-05-03 — Connect the UI to real APIs and remove temporary production-blocking mock data.
- [ ] P00-M00-05-04 — Verify responsive, loading, empty, validation, success and error states.

### Submodule 00.06 — Provider / External Integration

- [ ] P00-M00-06-01 — Integrate and verify: Verify PostgreSQL connection..
- [ ] P00-M00-06-02 — Integrate and verify: Verify Redis connection..
- [ ] P00-M00-06-03 — Integrate and verify: Verify Docker Compose service networking..
- [ ] P00-M00-06-04 — Integrate and verify: Preserve Twilio and OpenAI provider code for later refactor..
- [ ] P00-M00-06-05 — Handle provider timeout, unavailable, invalid-response and retry scenarios where applicable.

### Submodule 00.07 — Security / Validation

- [ ] P00-M00-07-01 — Confirm secrets are environment-based and not committed..
- [ ] P00-M00-07-02 — Identify unsafe debug/development settings that cannot remain in production..
- [ ] P00-M00-07-03 — Verify tenant isolation for all tenant-owned records and actions.

### Submodule 00.08 — Testing / QA

- [ ] P00-M00-08-01 — Test: Backend production build succeeds..
- [ ] P00-M00-08-02 — Test: Frontend production build succeeds..
- [ ] P00-M00-08-03 — Test: Docker stack starts..
- [ ] P00-M00-08-04 — Test: Health checks pass..
- [ ] P00-M00-08-05 — Test: Existing core call-related functionality is not unintentionally broken..
- [ ] P00-M00-08-06 — Run regression checks for directly affected existing modules.
- [ ] P00-M00-08-07 — Complete manual QA of the end-to-end user journey.

### Submodule 00.09 — Documentation / Operational Readiness

- [ ] P00-M00-09-01 — Update the Master Module Registry status and dependencies.
- [ ] P00-M00-09-02 — Document database/API/provider changes introduced by this module.
- [ ] P00-M00-09-03 — Update environment-variable/example configuration documentation if this module introduces new configuration.
- [ ] P00-M00-09-04 — Do not add future business features during M00. This is a controlled foundation slice only.

### Submodule 00.10 — Acceptance / Definition of Done

- [ ] P00-M00-10-01 — Requirements approved.
- [ ] P00-M00-10-02 — Database/migrations complete where required.
- [ ] P00-M00-10-03 — Backend/domain logic complete.
- [ ] P00-M00-10-04 — API contracts complete where required.
- [ ] P00-M00-10-05 — Frontend complete where required.
- [ ] P00-M00-10-06 — Real integration complete; no production-blocking mock flow remains.
- [ ] P00-M00-10-07 — Loading/empty/error/validation states complete.
- [ ] P00-M00-10-08 — Security and tenant-isolation checks pass.
- [ ] P00-M00-10-09 — Unit/integration/E2E/manual QA required for this slice pass.
- [ ] P00-M00-10-10 — Documentation updated.
- [ ] P00-M00-10-11 — No unrelated future module was implemented.
- [ ] P00-M00-10-12 — Module accepted and marked Completed before the next module starts.

**Module Gate:** `[M00] Existing Project Audit & SaaS Foundation = COMPLETE ✅` only after every required checkbox above is verified.

---

# PHASE 01 — SaaS Core

- [ ] P01-GATE — Phase 01 is complete only when every required module below is accepted.

## Module 01 — Authentication `M01`

**Target:** MVP

**Dependencies:** M00

### Submodule 01.01 — Scope & Requirements

- [ ] P01-M01-01-01 — Confirm the objective and boundaries of **Authentication**.
- [ ] P01-M01-01-02 — Register account
- [ ] P01-M01-01-03 — Login
- [ ] P01-M01-01-04 — Logout
- [ ] P01-M01-01-05 — Forgot password
- [ ] P01-M01-01-06 — Reset password
- [ ] P01-M01-01-07 — Email verification
- [ ] P01-M01-01-08 — Current-user session endpoint
- [ ] P01-M01-01-09 — Protected routes/session restoration
- [ ] P01-M01-01-10 — Explicitly document what is out of scope for this module so later-phase work is not pulled forward.

### Submodule 01.02 — Data & Persistence

- [ ] P01-M01-02-01 — Implement/confirm data requirement: `users`.
- [ ] P01-M01-02-02 — Implement/confirm data requirement: `sessions or refresh_tokens`.
- [ ] P01-M01-02-03 — Implement/confirm data requirement: `email_verification_tokens`.
- [ ] P01-M01-02-04 — Implement/confirm data requirement: `password_reset_tokens`.
- [ ] P01-M01-02-05 — Create and test migrations for this module without destructive uncontrolled schema synchronization.
- [ ] P01-M01-02-06 — Confirm organization/business ownership keys and foreign-key behavior for tenant-owned records.

### Submodule 01.03 — Backend / Domain Logic

- [ ] P01-M01-03-01 — Create/update the NestJS module boundaries, services and domain logic for **Authentication**.
- [ ] P01-M01-03-02 — Keep provider-specific implementation outside core business rules wherever the provider abstraction applies.
- [ ] P01-M01-03-03 — Add consistent error handling, logging and retry/idempotency behavior where required.

### Submodule 01.04 — API / Contracts

- [ ] P01-M01-04-01 — Implement/verify API contract: `POST /api/v1/auth/register`.
- [ ] P01-M01-04-02 — Implement/verify API contract: `POST /api/v1/auth/login`.
- [ ] P01-M01-04-03 — Implement/verify API contract: `POST /api/v1/auth/logout`.
- [ ] P01-M01-04-04 — Implement/verify API contract: `POST /api/v1/auth/forgot-password`.
- [ ] P01-M01-04-05 — Implement/verify API contract: `POST /api/v1/auth/reset-password`.
- [ ] P01-M01-04-06 — Implement/verify API contract: `POST /api/v1/auth/verify-email`.
- [ ] P01-M01-04-07 — Implement/verify API contract: `GET /api/v1/auth/me`.
- [ ] P01-M01-04-08 — Add DTO/schema validation and consistent API error responses.

### Submodule 01.05 — Frontend / UX

- [ ] P01-M01-05-01 — Build/complete frontend requirement: Register page.
- [ ] P01-M01-05-02 — Build/complete frontend requirement: Login page.
- [ ] P01-M01-05-03 — Build/complete frontend requirement: Forgot-password page.
- [ ] P01-M01-05-04 — Build/complete frontend requirement: Reset-password page.
- [ ] P01-M01-05-05 — Build/complete frontend requirement: Email-verification states.
- [ ] P01-M01-05-06 — Build/complete frontend requirement: Protected-app redirect/session loading.
- [ ] P01-M01-05-07 — Connect the UI to real APIs and remove temporary production-blocking mock data.
- [ ] P01-M01-05-08 — Verify responsive, loading, empty, validation, success and error states.

### Submodule 01.06 — Provider / External Integration

- [ ] P01-M01-06-01 — Integrate and verify: Email delivery provider for verification/reset messages when enabled..
- [ ] P01-M01-06-02 — Handle provider timeout, unavailable, invalid-response and retry scenarios where applicable.

### Submodule 01.07 — Security / Validation

- [ ] P01-M01-07-01 — Secure password hashing.
- [ ] P01-M01-07-02 — Access/refresh token or session expiry.
- [ ] P01-M01-07-03 — Auth rate limiting.
- [ ] P01-M01-07-04 — Token invalidation/logout.
- [ ] P01-M01-07-05 — No sensitive auth data in client logs.
- [ ] P01-M01-07-06 — Verify tenant isolation for all tenant-owned records and actions.

### Submodule 01.08 — Testing / QA

- [ ] P01-M01-08-01 — Test: Register→verify→login→protected page→logout E2E.
- [ ] P01-M01-08-02 — Test: Duplicate email rejection.
- [ ] P01-M01-08-03 — Test: Invalid credentials.
- [ ] P01-M01-08-04 — Test: Expired/invalid reset token.
- [ ] P01-M01-08-05 — Test: Unauthenticated protected-route rejection.
- [ ] P01-M01-08-06 — Run regression checks for directly affected existing modules.
- [ ] P01-M01-08-07 — Complete manual QA of the end-to-end user journey.

### Submodule 01.09 — Documentation / Operational Readiness

- [ ] P01-M01-09-01 — Update the Master Module Registry status and dependencies.
- [ ] P01-M01-09-02 — Document database/API/provider changes introduced by this module.
- [ ] P01-M01-09-03 — Update environment-variable/example configuration documentation if this module introduces new configuration.

### Submodule 01.10 — Acceptance / Definition of Done

- [ ] P01-M01-10-01 — Requirements approved.
- [ ] P01-M01-10-02 — Database/migrations complete where required.
- [ ] P01-M01-10-03 — Backend/domain logic complete.
- [ ] P01-M01-10-04 — API contracts complete where required.
- [ ] P01-M01-10-05 — Frontend complete where required.
- [ ] P01-M01-10-06 — Real integration complete; no production-blocking mock flow remains.
- [ ] P01-M01-10-07 — Loading/empty/error/validation states complete.
- [ ] P01-M01-10-08 — Security and tenant-isolation checks pass.
- [ ] P01-M01-10-09 — Unit/integration/E2E/manual QA required for this slice pass.
- [ ] P01-M01-10-10 — Documentation updated.
- [ ] P01-M01-10-11 — No unrelated future module was implemented.
- [ ] P01-M01-10-12 — Module accepted and marked Completed before the next module starts.

**Module Gate:** `[M01] Authentication = COMPLETE ✅` only after every required checkbox above is verified.

## Module 02 — Organizations / Tenants `M02`

**Target:** MVP

**Dependencies:** M01

### Submodule 02.01 — Scope & Requirements

- [ ] P01-M02-01-01 — Confirm the objective and boundaries of **Organizations / Tenants**.
- [ ] P01-M02-01-02 — Create organization/workspace
- [ ] P01-M02-01-03 — Read organization
- [ ] P01-M02-01-04 — Update organization settings
- [ ] P01-M02-01-05 — List organizations for current user
- [ ] P01-M02-01-06 — Switch active workspace
- [ ] P01-M02-01-07 — Organization membership ownership
- [ ] P01-M02-01-08 — Tenant isolation
- [ ] P01-M02-01-09 — Explicitly document what is out of scope for this module so later-phase work is not pulled forward.

### Submodule 02.02 — Data & Persistence

- [ ] P01-M02-02-01 — Implement/confirm data requirement: `organizations`.
- [ ] P01-M02-02-02 — Implement/confirm data requirement: `organization_members`.
- [ ] P01-M02-02-03 — Create and test migrations for this module without destructive uncontrolled schema synchronization.
- [ ] P01-M02-02-04 — Confirm organization/business ownership keys and foreign-key behavior for tenant-owned records.

### Submodule 02.03 — Backend / Domain Logic

- [ ] P01-M02-03-01 — Create/update the NestJS module boundaries, services and domain logic for **Organizations / Tenants**.
- [ ] P01-M02-03-02 — Keep provider-specific implementation outside core business rules wherever the provider abstraction applies.
- [ ] P01-M02-03-03 — Add consistent error handling, logging and retry/idempotency behavior where required.

### Submodule 02.04 — API / Contracts

- [ ] P01-M02-04-01 — Implement/verify API contract: `POST /api/v1/organizations`.
- [ ] P01-M02-04-02 — Implement/verify API contract: `GET /api/v1/organizations`.
- [ ] P01-M02-04-03 — Implement/verify API contract: `GET /api/v1/organizations/:id`.
- [ ] P01-M02-04-04 — Implement/verify API contract: `PATCH /api/v1/organizations/:id`.
- [ ] P01-M02-04-05 — Add DTO/schema validation and consistent API error responses.

### Submodule 02.05 — Frontend / UX

- [ ] P01-M02-05-01 — Build/complete frontend requirement: Organization creation onboarding.
- [ ] P01-M02-05-02 — Build/complete frontend requirement: Workspace selector.
- [ ] P01-M02-05-03 — Build/complete frontend requirement: Organization settings page.
- [ ] P01-M02-05-04 — Build/complete frontend requirement: No-organization empty state.
- [ ] P01-M02-05-05 — Connect the UI to real APIs and remove temporary production-blocking mock data.
- [ ] P01-M02-05-06 — Verify responsive, loading, empty, validation, success and error states.

### Submodule 02.06 — Provider / External Integration

- [ ] P01-M02-06-01 — Confirm this module has no direct external-provider dependency or that dependencies are already abstracted.

### Submodule 02.07 — Security / Validation

- [ ] P01-M02-07-01 — Every organization query scoped to authenticated membership.
- [ ] P01-M02-07-02 — Cross-tenant access denied.
- [ ] P01-M02-07-03 — Owner-only settings protected where applicable.
- [ ] P01-M02-07-04 — Verify tenant isolation for all tenant-owned records and actions.

### Submodule 02.08 — Testing / QA

- [ ] P01-M02-08-01 — Test: User creates first organization.
- [ ] P01-M02-08-02 — Test: Member can access own tenant.
- [ ] P01-M02-08-03 — Test: Organization A cannot read/update Organization B.
- [ ] P01-M02-08-04 — Test: Workspace switching preserves isolation.
- [ ] P01-M02-08-05 — Run regression checks for directly affected existing modules.
- [ ] P01-M02-08-06 — Complete manual QA of the end-to-end user journey.

### Submodule 02.09 — Documentation / Operational Readiness

- [ ] P01-M02-09-01 — Update the Master Module Registry status and dependencies.
- [ ] P01-M02-09-02 — Document database/API/provider changes introduced by this module.
- [ ] P01-M02-09-03 — Update environment-variable/example configuration documentation if this module introduces new configuration.

### Submodule 02.10 — Acceptance / Definition of Done

- [ ] P01-M02-10-01 — Requirements approved.
- [ ] P01-M02-10-02 — Database/migrations complete where required.
- [ ] P01-M02-10-03 — Backend/domain logic complete.
- [ ] P01-M02-10-04 — API contracts complete where required.
- [ ] P01-M02-10-05 — Frontend complete where required.
- [ ] P01-M02-10-06 — Real integration complete; no production-blocking mock flow remains.
- [ ] P01-M02-10-07 — Loading/empty/error/validation states complete.
- [ ] P01-M02-10-08 — Security and tenant-isolation checks pass.
- [ ] P01-M02-10-09 — Unit/integration/E2E/manual QA required for this slice pass.
- [ ] P01-M02-10-10 — Documentation updated.
- [ ] P01-M02-10-11 — No unrelated future module was implemented.
- [ ] P01-M02-10-12 — Module accepted and marked Completed before the next module starts.

**Module Gate:** `[M02] Organizations / Tenants = COMPLETE ✅` only after every required checkbox above is verified.

## Module 03 — Users, Team & Roles `M03`

**Target:** MVP

**Dependencies:** M02

### Submodule 03.01 — Scope & Requirements

- [ ] P01-M03-01-01 — Confirm the objective and boundaries of **Users, Team & Roles**.
- [ ] P01-M03-01-02 — Invite team member
- [ ] P01-M03-01-03 — Accept invitation
- [ ] P01-M03-01-04 — List members
- [ ] P01-M03-01-05 — Owner/Admin/Manager/Viewer roles
- [ ] P01-M03-01-06 — Change role
- [ ] P01-M03-01-07 — Remove member
- [ ] P01-M03-01-08 — Pending invitations
- [ ] P01-M03-01-09 — RBAC permission checks
- [ ] P01-M03-01-10 — Explicitly document what is out of scope for this module so later-phase work is not pulled forward.

### Submodule 03.02 — Data & Persistence

- [ ] P01-M03-02-01 — Implement/confirm data requirement: `organization_members`.
- [ ] P01-M03-02-02 — Implement/confirm data requirement: `invitations`.
- [ ] P01-M03-02-03 — Implement/confirm data requirement: `roles/permission mapping if persisted`.
- [ ] P01-M03-02-04 — Create and test migrations for this module without destructive uncontrolled schema synchronization.
- [ ] P01-M03-02-05 — Confirm organization/business ownership keys and foreign-key behavior for tenant-owned records.

### Submodule 03.03 — Backend / Domain Logic

- [ ] P01-M03-03-01 — Create/update the NestJS module boundaries, services and domain logic for **Users, Team & Roles**.
- [ ] P01-M03-03-02 — Keep provider-specific implementation outside core business rules wherever the provider abstraction applies.
- [ ] P01-M03-03-03 — Add consistent error handling, logging and retry/idempotency behavior where required.

### Submodule 03.04 — API / Contracts

- [ ] P01-M03-04-01 — Implement/verify API contract: `GET /api/v1/organizations/:id/members`.
- [ ] P01-M03-04-02 — Implement/verify API contract: `POST /api/v1/organizations/:id/invitations`.
- [ ] P01-M03-04-03 — Implement/verify API contract: `PATCH /api/v1/organizations/:id/members/:memberId`.
- [ ] P01-M03-04-04 — Implement/verify API contract: `DELETE /api/v1/organizations/:id/members/:memberId`.
- [ ] P01-M03-04-05 — Add DTO/schema validation and consistent API error responses.

### Submodule 03.05 — Frontend / UX

- [ ] P01-M03-05-01 — Build/complete frontend requirement: Team list.
- [ ] P01-M03-05-02 — Build/complete frontend requirement: Invite-member modal/page.
- [ ] P01-M03-05-03 — Build/complete frontend requirement: Pending invitations.
- [ ] P01-M03-05-04 — Build/complete frontend requirement: Role selector.
- [ ] P01-M03-05-05 — Build/complete frontend requirement: Remove-member confirmation.
- [ ] P01-M03-05-06 — Connect the UI to real APIs and remove temporary production-blocking mock data.
- [ ] P01-M03-05-07 — Verify responsive, loading, empty, validation, success and error states.

### Submodule 03.06 — Provider / External Integration

- [ ] P01-M03-06-01 — Integrate and verify: Email invitation delivery..
- [ ] P01-M03-06-02 — Handle provider timeout, unavailable, invalid-response and retry scenarios where applicable.

### Submodule 03.07 — Security / Validation

- [ ] P01-M03-07-01 — Prevent privilege escalation.
- [ ] P01-M03-07-02 — Prevent removing final owner without ownership transfer flow.
- [ ] P01-M03-07-03 — Tenant-scoped membership checks.
- [ ] P01-M03-07-04 — Verify tenant isolation for all tenant-owned records and actions.

### Submodule 03.08 — Testing / QA

- [ ] P01-M03-08-01 — Test: Owner invites member.
- [ ] P01-M03-08-02 — Test: Invite accepted.
- [ ] P01-M03-08-03 — Test: Role enforcement.
- [ ] P01-M03-08-04 — Test: Unauthorized role change blocked.
- [ ] P01-M03-08-05 — Test: Removed member loses tenant access.
- [ ] P01-M03-08-06 — Run regression checks for directly affected existing modules.
- [ ] P01-M03-08-07 — Complete manual QA of the end-to-end user journey.

### Submodule 03.09 — Documentation / Operational Readiness

- [ ] P01-M03-09-01 — Update the Master Module Registry status and dependencies.
- [ ] P01-M03-09-02 — Document database/API/provider changes introduced by this module.
- [ ] P01-M03-09-03 — Update environment-variable/example configuration documentation if this module introduces new configuration.

### Submodule 03.10 — Acceptance / Definition of Done

- [ ] P01-M03-10-01 — Requirements approved.
- [ ] P01-M03-10-02 — Database/migrations complete where required.
- [ ] P01-M03-10-03 — Backend/domain logic complete.
- [ ] P01-M03-10-04 — API contracts complete where required.
- [ ] P01-M03-10-05 — Frontend complete where required.
- [ ] P01-M03-10-06 — Real integration complete; no production-blocking mock flow remains.
- [ ] P01-M03-10-07 — Loading/empty/error/validation states complete.
- [ ] P01-M03-10-08 — Security and tenant-isolation checks pass.
- [ ] P01-M03-10-09 — Unit/integration/E2E/manual QA required for this slice pass.
- [ ] P01-M03-10-10 — Documentation updated.
- [ ] P01-M03-10-11 — No unrelated future module was implemented.
- [ ] P01-M03-10-12 — Module accepted and marked Completed before the next module starts.

**Module Gate:** `[M03] Users, Team & Roles = COMPLETE ✅` only after every required checkbox above is verified.

## Module 04 — Business Management `M04`

**Target:** MVP

**Dependencies:** M02, M03

### Submodule 04.01 — Scope & Requirements

- [ ] P01-M04-01-01 — Confirm the objective and boundaries of **Business Management**.
- [ ] P01-M04-01-02 — List businesses
- [ ] P01-M04-01-03 — Create business
- [ ] P01-M04-01-04 — View business
- [ ] P01-M04-01-05 — Update business
- [ ] P01-M04-01-06 — Archive/delete according to policy
- [ ] P01-M04-01-07 — Industry selection
- [ ] P01-M04-01-08 — Contact information
- [ ] P01-M04-01-09 — Business hours
- [ ] P01-M04-01-10 — Timezone
- [ ] P01-M04-01-11 — Default language
- [ ] P01-M04-01-12 — Business status/settings
- [ ] P01-M04-01-13 — Explicitly document what is out of scope for this module so later-phase work is not pulled forward.

### Submodule 04.02 — Data & Persistence

- [ ] P01-M04-02-01 — Implement/confirm data requirement: `businesses`.
- [ ] P01-M04-02-02 — Implement/confirm data requirement: `business_settings`.
- [ ] P01-M04-02-03 — Implement/confirm data requirement: `business_hours`.
- [ ] P01-M04-02-04 — Create and test migrations for this module without destructive uncontrolled schema synchronization.
- [ ] P01-M04-02-05 — Confirm organization/business ownership keys and foreign-key behavior for tenant-owned records.

### Submodule 04.03 — Backend / Domain Logic

- [ ] P01-M04-03-01 — Create/update the NestJS module boundaries, services and domain logic for **Business Management**.
- [ ] P01-M04-03-02 — Keep provider-specific implementation outside core business rules wherever the provider abstraction applies.
- [ ] P01-M04-03-03 — Add consistent error handling, logging and retry/idempotency behavior where required.

### Submodule 04.04 — API / Contracts

- [ ] P01-M04-04-01 — Implement/verify API contract: `POST /api/v1/businesses`.
- [ ] P01-M04-04-02 — Implement/verify API contract: `GET /api/v1/businesses`.
- [ ] P01-M04-04-03 — Implement/verify API contract: `GET /api/v1/businesses/:id`.
- [ ] P01-M04-04-04 — Implement/verify API contract: `PATCH /api/v1/businesses/:id`.
- [ ] P01-M04-04-05 — Implement/verify API contract: `DELETE or archive /api/v1/businesses/:id`.
- [ ] P01-M04-04-06 — Add DTO/schema validation and consistent API error responses.

### Submodule 04.05 — Frontend / UX

- [ ] P01-M04-05-01 — Build/complete frontend requirement: Business list.
- [ ] P01-M04-05-02 — Build/complete frontend requirement: Create-business flow.
- [ ] P01-M04-05-03 — Build/complete frontend requirement: Business details.
- [ ] P01-M04-05-04 — Build/complete frontend requirement: Business settings.
- [ ] P01-M04-05-05 — Build/complete frontend requirement: Business-hours editor.
- [ ] P01-M04-05-06 — Build/complete frontend requirement: Empty/loading/error states.
- [ ] P01-M04-05-07 — Connect the UI to real APIs and remove temporary production-blocking mock data.
- [ ] P01-M04-05-08 — Verify responsive, loading, empty, validation, success and error states.

### Submodule 04.06 — Provider / External Integration

- [ ] P01-M04-06-01 — Confirm this module has no direct external-provider dependency or that dependencies are already abstracted.

### Submodule 04.07 — Security / Validation

- [ ] P01-M04-07-01 — Organization-scoped business access.
- [ ] P01-M04-07-02 — Role-based create/update/archive rights.
- [ ] P01-M04-07-03 — Verify tenant isolation for all tenant-owned records and actions.

### Submodule 04.08 — Testing / QA

- [ ] P01-M04-08-01 — Test: Business CRUD within tenant.
- [ ] P01-M04-08-02 — Test: Invalid timezone/hours validation.
- [ ] P01-M04-08-03 — Test: Cross-tenant business access blocked.
- [ ] P01-M04-08-04 — Run regression checks for directly affected existing modules.
- [ ] P01-M04-08-05 — Complete manual QA of the end-to-end user journey.

### Submodule 04.09 — Documentation / Operational Readiness

- [ ] P01-M04-09-01 — Update the Master Module Registry status and dependencies.
- [ ] P01-M04-09-02 — Document database/API/provider changes introduced by this module.
- [ ] P01-M04-09-03 — Update environment-variable/example configuration documentation if this module introduces new configuration.

### Submodule 04.10 — Acceptance / Definition of Done

- [ ] P01-M04-10-01 — Requirements approved.
- [ ] P01-M04-10-02 — Database/migrations complete where required.
- [ ] P01-M04-10-03 — Backend/domain logic complete.
- [ ] P01-M04-10-04 — API contracts complete where required.
- [ ] P01-M04-10-05 — Frontend complete where required.
- [ ] P01-M04-10-06 — Real integration complete; no production-blocking mock flow remains.
- [ ] P01-M04-10-07 — Loading/empty/error/validation states complete.
- [ ] P01-M04-10-08 — Security and tenant-isolation checks pass.
- [ ] P01-M04-10-09 — Unit/integration/E2E/manual QA required for this slice pass.
- [ ] P01-M04-10-10 — Documentation updated.
- [ ] P01-M04-10-11 — No unrelated future module was implemented.
- [ ] P01-M04-10-12 — Module accepted and marked Completed before the next module starts.

**Module Gate:** `[M04] Business Management = COMPLETE ✅` only after every required checkbox above is verified.

---

# PHASE 02 — AI Agent Core

- [ ] P02-GATE — Phase 02 is complete only when every required module below is accepted.

## Module 05 — AI Agent Management `M05`

**Target:** MVP

**Dependencies:** M04

### Submodule 05.01 — Scope & Requirements

- [ ] P02-M05-01-01 — Confirm the objective and boundaries of **AI Agent Management**.
- [ ] P02-M05-01-02 — List agents
- [ ] P02-M05-01-03 — Create agent
- [ ] P02-M05-01-04 — View agent
- [ ] P02-M05-01-05 — Update agent
- [ ] P02-M05-01-06 — Archive/delete agent
- [ ] P02-M05-01-07 — Set role/personality
- [ ] P02-M05-01-08 — Set greeting
- [ ] P02-M05-01-09 — Set language
- [ ] P02-M05-01-10 — Set instructions/prompts
- [ ] P02-M05-01-11 — Set escalation rules
- [ ] P02-M05-01-12 — Activate/deactivate
- [ ] P02-M05-01-13 — Explicitly document what is out of scope for this module so later-phase work is not pulled forward.

### Submodule 05.02 — Data & Persistence

- [ ] P02-M05-02-01 — Implement/confirm data requirement: `agents`.
- [ ] P02-M05-02-02 — Implement/confirm data requirement: `agent_configs`.
- [ ] P02-M05-02-03 — Implement/confirm data requirement: `agent_prompts`.
- [ ] P02-M05-02-04 — Implement/confirm data requirement: `agent_provider_mappings`.
- [ ] P02-M05-02-05 — Create and test migrations for this module without destructive uncontrolled schema synchronization.
- [ ] P02-M05-02-06 — Confirm organization/business ownership keys and foreign-key behavior for tenant-owned records.

### Submodule 05.03 — Backend / Domain Logic

- [ ] P02-M05-03-01 — Create/update the NestJS module boundaries, services and domain logic for **AI Agent Management**.
- [ ] P02-M05-03-02 — Keep provider-specific implementation outside core business rules wherever the provider abstraction applies.
- [ ] P02-M05-03-03 — Add consistent error handling, logging and retry/idempotency behavior where required.

### Submodule 05.04 — API / Contracts

- [ ] P02-M05-04-01 — Implement/verify API contract: `POST /api/v1/agents`.
- [ ] P02-M05-04-02 — Implement/verify API contract: `GET /api/v1/agents`.
- [ ] P02-M05-04-03 — Implement/verify API contract: `GET /api/v1/agents/:id`.
- [ ] P02-M05-04-04 — Implement/verify API contract: `PATCH /api/v1/agents/:id`.
- [ ] P02-M05-04-05 — Implement/verify API contract: `POST /api/v1/agents/:id/activate`.
- [ ] P02-M05-04-06 — Implement/verify API contract: `POST /api/v1/agents/:id/deactivate`.
- [ ] P02-M05-04-07 — Add DTO/schema validation and consistent API error responses.

### Submodule 05.05 — Frontend / UX

- [ ] P02-M05-05-01 — Build/complete frontend requirement: Agent list.
- [ ] P02-M05-05-02 — Build/complete frontend requirement: Create-agent wizard.
- [ ] P02-M05-05-03 — Build/complete frontend requirement: Agent details.
- [ ] P02-M05-05-04 — Build/complete frontend requirement: Behavior/instructions editor.
- [ ] P02-M05-05-05 — Build/complete frontend requirement: Escalation settings.
- [ ] P02-M05-05-06 — Build/complete frontend requirement: Activation status.
- [ ] P02-M05-05-07 — Connect the UI to real APIs and remove temporary production-blocking mock data.
- [ ] P02-M05-05-08 — Verify responsive, loading, empty, validation, success and error states.

### Submodule 05.06 — Provider / External Integration

- [ ] P02-M05-06-01 — Confirm this module has no direct external-provider dependency or that dependencies are already abstracted.

### Submodule 05.07 — Security / Validation

- [ ] P02-M05-07-01 — Business/organization ownership checks.
- [ ] P02-M05-07-02 — Role-based agent management.
- [ ] P02-M05-07-03 — Verify tenant isolation for all tenant-owned records and actions.

### Submodule 05.08 — Testing / QA

- [ ] P02-M05-08-01 — Test: Create agent under correct business.
- [ ] P02-M05-08-02 — Test: Update behavior.
- [ ] P02-M05-08-03 — Test: Activation/deactivation.
- [ ] P02-M05-08-04 — Test: Cross-tenant access blocked.
- [ ] P02-M05-08-05 — Run regression checks for directly affected existing modules.
- [ ] P02-M05-08-06 — Complete manual QA of the end-to-end user journey.

### Submodule 05.09 — Documentation / Operational Readiness

- [ ] P02-M05-09-01 — Update the Master Module Registry status and dependencies.
- [ ] P02-M05-09-02 — Document database/API/provider changes introduced by this module.
- [ ] P02-M05-09-03 — Update environment-variable/example configuration documentation if this module introduces new configuration.

### Submodule 05.10 — Acceptance / Definition of Done

- [ ] P02-M05-10-01 — Requirements approved.
- [ ] P02-M05-10-02 — Database/migrations complete where required.
- [ ] P02-M05-10-03 — Backend/domain logic complete.
- [ ] P02-M05-10-04 — API contracts complete where required.
- [ ] P02-M05-10-05 — Frontend complete where required.
- [ ] P02-M05-10-06 — Real integration complete; no production-blocking mock flow remains.
- [ ] P02-M05-10-07 — Loading/empty/error/validation states complete.
- [ ] P02-M05-10-08 — Security and tenant-isolation checks pass.
- [ ] P02-M05-10-09 — Unit/integration/E2E/manual QA required for this slice pass.
- [ ] P02-M05-10-10 — Documentation updated.
- [ ] P02-M05-10-11 — No unrelated future module was implemented.
- [ ] P02-M05-10-12 — Module accepted and marked Completed before the next module starts.

**Module Gate:** `[M05] AI Agent Management = COMPLETE ✅` only after every required checkbox above is verified.

## Module 06 — ElevenLabs Voice Agent Provider `M06`

**Target:** MVP

**Dependencies:** M05

### Submodule 06.01 — Scope & Requirements

- [ ] P02-M06-01-01 — Confirm the objective and boundaries of **ElevenLabs Voice Agent Provider**.
- [ ] P02-M06-01-02 — Implement VoiceAgentProvider contract
- [ ] P02-M06-01-03 — Create ElevenLabs agent
- [ ] P02-M06-01-04 — Update ElevenLabs agent
- [ ] P02-M06-01-05 — Delete/deactivate provider agent
- [ ] P02-M06-01-06 — Fetch provider status
- [ ] P02-M06-01-07 — Store provider mapping
- [ ] P02-M06-01-08 — Retry failed sync
- [ ] P02-M06-01-09 — Normalize provider errors
- [ ] P02-M06-01-10 — Explicitly document what is out of scope for this module so later-phase work is not pulled forward.

### Submodule 06.02 — Data & Persistence

- [ ] P02-M06-02-01 — Implement/confirm data requirement: `agent_provider_mappings`.
- [ ] P02-M06-02-02 — Implement/confirm data requirement: `provider_logs or sync metadata`.
- [ ] P02-M06-02-03 — Create and test migrations for this module without destructive uncontrolled schema synchronization.
- [ ] P02-M06-02-04 — Confirm organization/business ownership keys and foreign-key behavior for tenant-owned records.

### Submodule 06.03 — Backend / Domain Logic

- [ ] P02-M06-03-01 — Create/update the NestJS module boundaries, services and domain logic for **ElevenLabs Voice Agent Provider**.
- [ ] P02-M06-03-02 — Keep provider-specific implementation outside core business rules wherever the provider abstraction applies.
- [ ] P02-M06-03-03 — Add consistent error handling, logging and retry/idempotency behavior where required.

### Submodule 06.04 — API / Contracts

- [ ] P02-M06-04-01 — Implement/verify API contract: `Internal provider service methods`.
- [ ] P02-M06-04-02 — Implement/verify API contract: `Optional POST /api/v1/agents/:id/sync`.
- [ ] P02-M06-04-03 — Implement/verify API contract: `Optional GET /api/v1/agents/:id/provider-status`.
- [ ] P02-M06-04-04 — Add DTO/schema validation and consistent API error responses.

### Submodule 06.05 — Frontend / UX

- [ ] P02-M06-05-01 — Build/complete frontend requirement: Provider sync status on agent page.
- [ ] P02-M06-05-02 — Build/complete frontend requirement: Sync/retry action.
- [ ] P02-M06-05-03 — Build/complete frontend requirement: Provider error state without exposing secrets.
- [ ] P02-M06-05-04 — Connect the UI to real APIs and remove temporary production-blocking mock data.
- [ ] P02-M06-05-05 — Verify responsive, loading, empty, validation, success and error states.

### Submodule 06.06 — Provider / External Integration

- [ ] P02-M06-06-01 — Integrate and verify: ElevenLabs API.
- [ ] P02-M06-06-02 — Handle provider timeout, unavailable, invalid-response and retry scenarios where applicable.

### Submodule 06.07 — Security / Validation

- [ ] P02-M06-07-01 — Provider API key stored server-side only.
- [ ] P02-M06-07-02 — No provider credentials in browser.
- [ ] P02-M06-07-03 — Sanitize provider error payloads.
- [ ] P02-M06-07-04 — Verify tenant isolation for all tenant-owned records and actions.

### Submodule 06.08 — Testing / QA

- [ ] P02-M06-08-01 — Test: Create local agent then provider agent.
- [ ] P02-M06-08-02 — Test: Update sync.
- [ ] P02-M06-08-03 — Test: Failed provider call records safe error.
- [ ] P02-M06-08-04 — Test: Retry succeeds.
- [ ] P02-M06-08-05 — Test: Mapping persists.
- [ ] P02-M06-08-06 — Run regression checks for directly affected existing modules.
- [ ] P02-M06-08-07 — Complete manual QA of the end-to-end user journey.

### Submodule 06.09 — Documentation / Operational Readiness

- [ ] P02-M06-09-01 — Update the Master Module Registry status and dependencies.
- [ ] P02-M06-09-02 — Document database/API/provider changes introduced by this module.
- [ ] P02-M06-09-03 — Update environment-variable/example configuration documentation if this module introduces new configuration.

### Submodule 06.10 — Acceptance / Definition of Done

- [ ] P02-M06-10-01 — Requirements approved.
- [ ] P02-M06-10-02 — Database/migrations complete where required.
- [ ] P02-M06-10-03 — Backend/domain logic complete.
- [ ] P02-M06-10-04 — API contracts complete where required.
- [ ] P02-M06-10-05 — Frontend complete where required.
- [ ] P02-M06-10-06 — Real integration complete; no production-blocking mock flow remains.
- [ ] P02-M06-10-07 — Loading/empty/error/validation states complete.
- [ ] P02-M06-10-08 — Security and tenant-isolation checks pass.
- [ ] P02-M06-10-09 — Unit/integration/E2E/manual QA required for this slice pass.
- [ ] P02-M06-10-10 — Documentation updated.
- [ ] P02-M06-10-11 — No unrelated future module was implemented.
- [ ] P02-M06-10-12 — Module accepted and marked Completed before the next module starts.

**Module Gate:** `[M06] ElevenLabs Voice Agent Provider = COMPLETE ✅` only after every required checkbox above is verified.

---

# PHASE 03 — Knowledge & Voice

- [ ] P03-GATE — Phase 03 is complete only when every required module below is accepted.

## Module 07 — Knowledge Base `M07`

**Target:** MVP

**Dependencies:** M05, M06

### Submodule 07.01 — Scope & Requirements

- [ ] P03-M07-01-01 — Confirm the objective and boundaries of **Knowledge Base**.
- [ ] P03-M07-01-02 — Upload file
- [ ] P03-M07-01-03 — Add URL
- [ ] P03-M07-01-04 — Add plain text
- [ ] P03-M07-01-05 — Add FAQ content
- [ ] P03-M07-01-06 — List knowledge sources
- [ ] P03-M07-01-07 — Store original source
- [ ] P03-M07-01-08 — Sync to provider KB
- [ ] P03-M07-01-09 — Display sync status
- [ ] P03-M07-01-10 — Delete source
- [ ] P03-M07-01-11 — Resync failed source
- [ ] P03-M07-01-12 — Explicitly document what is out of scope for this module so later-phase work is not pulled forward.

### Submodule 07.02 — Data & Persistence

- [ ] P03-M07-02-01 — Implement/confirm data requirement: `knowledge_bases`.
- [ ] P03-M07-02-02 — Implement/confirm data requirement: `knowledge_sources`.
- [ ] P03-M07-02-03 — Implement/confirm data requirement: `knowledge_sync_logs`.
- [ ] P03-M07-02-04 — Create and test migrations for this module without destructive uncontrolled schema synchronization.
- [ ] P03-M07-02-05 — Confirm organization/business ownership keys and foreign-key behavior for tenant-owned records.

### Submodule 07.03 — Backend / Domain Logic

- [ ] P03-M07-03-01 — Create/update the NestJS module boundaries, services and domain logic for **Knowledge Base**.
- [ ] P03-M07-03-02 — Keep provider-specific implementation outside core business rules wherever the provider abstraction applies.
- [ ] P03-M07-03-03 — Add consistent error handling, logging and retry/idempotency behavior where required.

### Submodule 07.04 — API / Contracts

- [ ] P03-M07-04-01 — Implement/verify API contract: `POST /api/v1/agents/:id/knowledge/files`.
- [ ] P03-M07-04-02 — Implement/verify API contract: `POST /api/v1/agents/:id/knowledge/url`.
- [ ] P03-M07-04-03 — Implement/verify API contract: `POST /api/v1/agents/:id/knowledge/text`.
- [ ] P03-M07-04-04 — Implement/verify API contract: `GET /api/v1/agents/:id/knowledge`.
- [ ] P03-M07-04-05 — Implement/verify API contract: `DELETE /api/v1/knowledge/:id`.
- [ ] P03-M07-04-06 — Implement/verify API contract: `POST /api/v1/knowledge/:id/resync`.
- [ ] P03-M07-04-07 — Add DTO/schema validation and consistent API error responses.

### Submodule 07.05 — Frontend / UX

- [ ] P03-M07-05-01 — Build/complete frontend requirement: Knowledge list.
- [ ] P03-M07-05-02 — Build/complete frontend requirement: Upload component.
- [ ] P03-M07-05-03 — Build/complete frontend requirement: URL form.
- [ ] P03-M07-05-04 — Build/complete frontend requirement: Text/FAQ form.
- [ ] P03-M07-05-05 — Build/complete frontend requirement: Sync status badges.
- [ ] P03-M07-05-06 — Build/complete frontend requirement: Delete/resync actions.
- [ ] P03-M07-05-07 — Connect the UI to real APIs and remove temporary production-blocking mock data.
- [ ] P03-M07-05-08 — Verify responsive, loading, empty, validation, success and error states.

### Submodule 07.06 — Provider / External Integration

- [ ] P03-M07-06-01 — Integrate and verify: S3-compatible storage.
- [ ] P03-M07-06-02 — Integrate and verify: ElevenLabs knowledge/RAG synchronization.
- [ ] P03-M07-06-03 — Handle provider timeout, unavailable, invalid-response and retry scenarios where applicable.

### Submodule 07.07 — Security / Validation

- [ ] P03-M07-07-01 — File type/size validation.
- [ ] P03-M07-07-02 — Tenant-scoped object keys.
- [ ] P03-M07-07-03 — Signed/private storage access.
- [ ] P03-M07-07-04 — URL validation.
- [ ] P03-M07-07-05 — Verify tenant isolation for all tenant-owned records and actions.

### Submodule 07.08 — Testing / QA

- [ ] P03-M07-08-01 — Test: Upload→store→sync.
- [ ] P03-M07-08-02 — Test: URL/text sync.
- [ ] P03-M07-08-03 — Test: Delete.
- [ ] P03-M07-08-04 — Test: Failed sync retry.
- [ ] P03-M07-08-05 — Test: Cross-tenant source access blocked.
- [ ] P03-M07-08-06 — Run regression checks for directly affected existing modules.
- [ ] P03-M07-08-07 — Complete manual QA of the end-to-end user journey.

### Submodule 07.09 — Documentation / Operational Readiness

- [ ] P03-M07-09-01 — Update the Master Module Registry status and dependencies.
- [ ] P03-M07-09-02 — Document database/API/provider changes introduced by this module.
- [ ] P03-M07-09-03 — Update environment-variable/example configuration documentation if this module introduces new configuration.

### Submodule 07.10 — Acceptance / Definition of Done

- [ ] P03-M07-10-01 — Requirements approved.
- [ ] P03-M07-10-02 — Database/migrations complete where required.
- [ ] P03-M07-10-03 — Backend/domain logic complete.
- [ ] P03-M07-10-04 — API contracts complete where required.
- [ ] P03-M07-10-05 — Frontend complete where required.
- [ ] P03-M07-10-06 — Real integration complete; no production-blocking mock flow remains.
- [ ] P03-M07-10-07 — Loading/empty/error/validation states complete.
- [ ] P03-M07-10-08 — Security and tenant-isolation checks pass.
- [ ] P03-M07-10-09 — Unit/integration/E2E/manual QA required for this slice pass.
- [ ] P03-M07-10-10 — Documentation updated.
- [ ] P03-M07-10-11 — No unrelated future module was implemented.
- [ ] P03-M07-10-12 — Module accepted and marked Completed before the next module starts.

**Module Gate:** `[M07] Knowledge Base = COMPLETE ✅` only after every required checkbox above is verified.

## Module 08 — Voice Library `M08`

**Target:** MVP

**Dependencies:** M05, M06

### Submodule 08.01 — Scope & Requirements

- [ ] P03-M08-01-01 — Confirm the objective and boundaries of **Voice Library**.
- [ ] P03-M08-01-02 — Fetch available voices
- [ ] P03-M08-01-03 — Search/filter voices
- [ ] P03-M08-01-04 — Preview voice
- [ ] P03-M08-01-05 — Assign voice to agent
- [ ] P03-M08-01-06 — Persist provider voice mapping
- [ ] P03-M08-01-07 — Show assigned voice
- [ ] P03-M08-01-08 — Explicitly document what is out of scope for this module so later-phase work is not pulled forward.

### Submodule 08.02 — Data & Persistence

- [ ] P03-M08-02-01 — Implement/confirm data requirement: `voices or cached provider_voice metadata`.
- [ ] P03-M08-02-02 — Implement/confirm data requirement: `voice_configs`.
- [ ] P03-M08-02-03 — Create and test migrations for this module without destructive uncontrolled schema synchronization.
- [ ] P03-M08-02-04 — Confirm organization/business ownership keys and foreign-key behavior for tenant-owned records.

### Submodule 08.03 — Backend / Domain Logic

- [ ] P03-M08-03-01 — Create/update the NestJS module boundaries, services and domain logic for **Voice Library**.
- [ ] P03-M08-03-02 — Keep provider-specific implementation outside core business rules wherever the provider abstraction applies.
- [ ] P03-M08-03-03 — Add consistent error handling, logging and retry/idempotency behavior where required.

### Submodule 08.04 — API / Contracts

- [ ] P03-M08-04-01 — Implement/verify API contract: `GET /api/v1/voices`.
- [ ] P03-M08-04-02 — Implement/verify API contract: `POST /api/v1/agents/:id/voice`.
- [ ] P03-M08-04-03 — Add DTO/schema validation and consistent API error responses.

### Submodule 08.05 — Frontend / UX

- [ ] P03-M08-05-01 — Build/complete frontend requirement: Voice library.
- [ ] P03-M08-05-02 — Build/complete frontend requirement: Filters.
- [ ] P03-M08-05-03 — Build/complete frontend requirement: Audio preview.
- [ ] P03-M08-05-04 — Build/complete frontend requirement: Selected state.
- [ ] P03-M08-05-05 — Build/complete frontend requirement: Assign/save action.
- [ ] P03-M08-05-06 — Connect the UI to real APIs and remove temporary production-blocking mock data.
- [ ] P03-M08-05-07 — Verify responsive, loading, empty, validation, success and error states.

### Submodule 08.06 — Provider / External Integration

- [ ] P03-M08-06-01 — Integrate and verify: ElevenLabs voice catalogue.
- [ ] P03-M08-06-02 — Handle provider timeout, unavailable, invalid-response and retry scenarios where applicable.

### Submodule 08.07 — Security / Validation

- [ ] P03-M08-07-01 — No provider secret exposed in client preview flow.
- [ ] P03-M08-07-02 — Tenant-scoped assignment.
- [ ] P03-M08-07-03 — Verify tenant isolation for all tenant-owned records and actions.

### Submodule 08.08 — Testing / QA

- [ ] P03-M08-08-01 — Test: List voices.
- [ ] P03-M08-08-02 — Test: Preview.
- [ ] P03-M08-08-03 — Test: Assign voice.
- [ ] P03-M08-08-04 — Test: Persist mapping.
- [ ] P03-M08-08-05 — Test: Invalid provider voice rejected.
- [ ] P03-M08-08-06 — Run regression checks for directly affected existing modules.
- [ ] P03-M08-08-07 — Complete manual QA of the end-to-end user journey.

### Submodule 08.09 — Documentation / Operational Readiness

- [ ] P03-M08-09-01 — Update the Master Module Registry status and dependencies.
- [ ] P03-M08-09-02 — Document database/API/provider changes introduced by this module.
- [ ] P03-M08-09-03 — Update environment-variable/example configuration documentation if this module introduces new configuration.

### Submodule 08.10 — Acceptance / Definition of Done

- [ ] P03-M08-10-01 — Requirements approved.
- [ ] P03-M08-10-02 — Database/migrations complete where required.
- [ ] P03-M08-10-03 — Backend/domain logic complete.
- [ ] P03-M08-10-04 — API contracts complete where required.
- [ ] P03-M08-10-05 — Frontend complete where required.
- [ ] P03-M08-10-06 — Real integration complete; no production-blocking mock flow remains.
- [ ] P03-M08-10-07 — Loading/empty/error/validation states complete.
- [ ] P03-M08-10-08 — Security and tenant-isolation checks pass.
- [ ] P03-M08-10-09 — Unit/integration/E2E/manual QA required for this slice pass.
- [ ] P03-M08-10-10 — Documentation updated.
- [ ] P03-M08-10-11 — No unrelated future module was implemented.
- [ ] P03-M08-10-12 — Module accepted and marked Completed before the next module starts.

**Module Gate:** `[M08] Voice Library = COMPLETE ✅` only after every required checkbox above is verified.

## Module 09 — Voice Cloning `M09`

**Target:** MVP/Premium

**Dependencies:** M05, M06, M08

### Submodule 09.01 — Scope & Requirements

- [ ] P03-M09-01-01 — Confirm the objective and boundaries of **Voice Cloning**.
- [ ] P03-M09-01-02 — Capture explicit consent
- [ ] P03-M09-01-03 — Upload or record voice samples
- [ ] P03-M09-01-04 — Submit clone request
- [ ] P03-M09-01-05 — Track processing status
- [ ] P03-M09-01-06 — Preview cloned voice
- [ ] P03-M09-01-07 — Assign clone to agent
- [ ] P03-M09-01-08 — Delete/revoke clone where supported
- [ ] P03-M09-01-09 — Audit consent and actions
- [ ] P03-M09-01-10 — Explicitly document what is out of scope for this module so later-phase work is not pulled forward.

### Submodule 09.02 — Data & Persistence

- [ ] P03-M09-02-01 — Implement/confirm data requirement: `voice_clones`.
- [ ] P03-M09-02-02 — Implement/confirm data requirement: `voice_consents`.
- [ ] P03-M09-02-03 — Implement/confirm data requirement: `voice_samples`.
- [ ] P03-M09-02-04 — Implement/confirm data requirement: `voice_configs`.
- [ ] P03-M09-02-05 — Create and test migrations for this module without destructive uncontrolled schema synchronization.
- [ ] P03-M09-02-06 — Confirm organization/business ownership keys and foreign-key behavior for tenant-owned records.

### Submodule 09.03 — Backend / Domain Logic

- [ ] P03-M09-03-01 — Create/update the NestJS module boundaries, services and domain logic for **Voice Cloning**.
- [ ] P03-M09-03-02 — Keep provider-specific implementation outside core business rules wherever the provider abstraction applies.
- [ ] P03-M09-03-03 — Add consistent error handling, logging and retry/idempotency behavior where required.

### Submodule 09.04 — API / Contracts

- [ ] P03-M09-04-01 — Implement/verify API contract: `POST /api/v1/voices/clone`.
- [ ] P03-M09-04-02 — Implement/verify API contract: `GET /api/v1/voices/:id/status`.
- [ ] P03-M09-04-03 — Implement/verify API contract: `DELETE /api/v1/voices/:id`.
- [ ] P03-M09-04-04 — Implement/verify API contract: `POST /api/v1/agents/:id/voice`.
- [ ] P03-M09-04-05 — Add DTO/schema validation and consistent API error responses.

### Submodule 09.05 — Frontend / UX

- [ ] P03-M09-05-01 — Build/complete frontend requirement: Consent screen.
- [ ] P03-M09-05-02 — Build/complete frontend requirement: Upload/record samples.
- [ ] P03-M09-05-03 — Build/complete frontend requirement: Processing state.
- [ ] P03-M09-05-04 — Build/complete frontend requirement: Preview.
- [ ] P03-M09-05-05 — Build/complete frontend requirement: Assign clone.
- [ ] P03-M09-05-06 — Build/complete frontend requirement: Delete/revoke confirmation.
- [ ] P03-M09-05-07 — Connect the UI to real APIs and remove temporary production-blocking mock data.
- [ ] P03-M09-05-08 — Verify responsive, loading, empty, validation, success and error states.

### Submodule 09.06 — Provider / External Integration

- [ ] P03-M09-06-01 — Integrate and verify: S3-compatible sample storage where permitted.
- [ ] P03-M09-06-02 — Integrate and verify: ElevenLabs voice cloning.
- [ ] P03-M09-06-03 — Handle provider timeout, unavailable, invalid-response and retry scenarios where applicable.

### Submodule 09.07 — Security / Validation

- [ ] P03-M09-07-01 — Explicit consent required before submission.
- [ ] P03-M09-07-02 — Restrict sample access.
- [ ] P03-M09-07-03 — Retention/deletion rules.
- [ ] P03-M09-07-04 — Audit log.
- [ ] P03-M09-07-05 — Verify tenant isolation for all tenant-owned records and actions.

### Submodule 09.08 — Testing / QA

- [ ] P03-M09-08-01 — Test: Consent required.
- [ ] P03-M09-08-02 — Test: Valid sample upload.
- [ ] P03-M09-08-03 — Test: Clone request/status.
- [ ] P03-M09-08-04 — Test: Assign clone.
- [ ] P03-M09-08-05 — Test: Unauthorized clone access blocked.
- [ ] P03-M09-08-06 — Run regression checks for directly affected existing modules.
- [ ] P03-M09-08-07 — Complete manual QA of the end-to-end user journey.

### Submodule 09.09 — Documentation / Operational Readiness

- [ ] P03-M09-09-01 — Update the Master Module Registry status and dependencies.
- [ ] P03-M09-09-02 — Document database/API/provider changes introduced by this module.
- [ ] P03-M09-09-03 — Update environment-variable/example configuration documentation if this module introduces new configuration.

### Submodule 09.10 — Acceptance / Definition of Done

- [ ] P03-M09-10-01 — Requirements approved.
- [ ] P03-M09-10-02 — Database/migrations complete where required.
- [ ] P03-M09-10-03 — Backend/domain logic complete.
- [ ] P03-M09-10-04 — API contracts complete where required.
- [ ] P03-M09-10-05 — Frontend complete where required.
- [ ] P03-M09-10-06 — Real integration complete; no production-blocking mock flow remains.
- [ ] P03-M09-10-07 — Loading/empty/error/validation states complete.
- [ ] P03-M09-10-08 — Security and tenant-isolation checks pass.
- [ ] P03-M09-10-09 — Unit/integration/E2E/manual QA required for this slice pass.
- [ ] P03-M09-10-10 — Documentation updated.
- [ ] P03-M09-10-11 — No unrelated future module was implemented.
- [ ] P03-M09-10-12 — Module accepted and marked Completed before the next module starts.

**Module Gate:** `[M09] Voice Cloning = COMPLETE ✅` only after every required checkbox above is verified.

---

# PHASE 04 — Telephony

- [ ] P04-GATE — Phase 04 is complete only when every required module below is accepted.

## Module 10 — Twilio Telephony Provider `M10`

**Target:** MVP

**Dependencies:** M00

### Submodule 10.01 — Scope & Requirements

- [ ] P04-M10-01-01 — Confirm the objective and boundaries of **Twilio Telephony Provider**.
- [ ] P04-M10-01-02 — Implement TelephonyProvider contract
- [ ] P04-M10-01-03 — Authenticate with Twilio
- [ ] P04-M10-01-04 — Search numbers
- [ ] P04-M10-01-05 — Purchase/configure number
- [ ] P04-M10-01-06 — Release number
- [ ] P04-M10-01-07 — Handle inbound webhook
- [ ] P04-M10-01-08 — Handle status callbacks
- [ ] P04-M10-01-09 — Normalize Twilio errors/events
- [ ] P04-M10-01-10 — Explicitly document what is out of scope for this module so later-phase work is not pulled forward.

### Submodule 10.02 — Data & Persistence

- [ ] P04-M10-02-01 — Implement/confirm data requirement: `provider mappings and logs as required`.
- [ ] P04-M10-02-02 — Create and test migrations for this module without destructive uncontrolled schema synchronization.
- [ ] P04-M10-02-03 — Confirm organization/business ownership keys and foreign-key behavior for tenant-owned records.

### Submodule 10.03 — Backend / Domain Logic

- [ ] P04-M10-03-01 — Create/update the NestJS module boundaries, services and domain logic for **Twilio Telephony Provider**.
- [ ] P04-M10-03-02 — Keep provider-specific implementation outside core business rules wherever the provider abstraction applies.
- [ ] P04-M10-03-03 — Add consistent error handling, logging and retry/idempotency behavior where required.

### Submodule 10.04 — API / Contracts

- [ ] P04-M10-04-01 — Implement/verify API contract: `Internal Twilio provider methods`.
- [ ] P04-M10-04-02 — Implement/verify API contract: `/api/v1/webhooks/twilio/*`.
- [ ] P04-M10-04-03 — Add DTO/schema validation and consistent API error responses.

### Submodule 10.05 — Frontend / UX

- [ ] P04-M10-05-01 — Build/complete frontend requirement: Provider health/config status in internal settings if needed.
- [ ] P04-M10-05-02 — Connect the UI to real APIs and remove temporary production-blocking mock data.
- [ ] P04-M10-05-03 — Verify responsive, loading, empty, validation, success and error states.

### Submodule 10.06 — Provider / External Integration

- [ ] P04-M10-06-01 — Integrate and verify: Twilio.
- [ ] P04-M10-06-02 — Handle provider timeout, unavailable, invalid-response and retry scenarios where applicable.

### Submodule 10.07 — Security / Validation

- [ ] P04-M10-07-01 — Verify Twilio webhook signatures.
- [ ] P04-M10-07-02 — Keep Account SID/Auth Token server-side.
- [ ] P04-M10-07-03 — Idempotent callback handling.
- [ ] P04-M10-07-04 — Verify tenant isolation for all tenant-owned records and actions.

### Submodule 10.08 — Testing / QA

- [ ] P04-M10-08-01 — Test: Credential validation.
- [ ] P04-M10-08-02 — Test: Webhook verification.
- [ ] P04-M10-08-03 — Test: Event normalization.
- [ ] P04-M10-08-04 — Test: Number configuration test.
- [ ] P04-M10-08-05 — Test: Provider failure handling.
- [ ] P04-M10-08-06 — Run regression checks for directly affected existing modules.
- [ ] P04-M10-08-07 — Complete manual QA of the end-to-end user journey.

### Submodule 10.09 — Documentation / Operational Readiness

- [ ] P04-M10-09-01 — Update the Master Module Registry status and dependencies.
- [ ] P04-M10-09-02 — Document database/API/provider changes introduced by this module.
- [ ] P04-M10-09-03 — Update environment-variable/example configuration documentation if this module introduces new configuration.

### Submodule 10.10 — Acceptance / Definition of Done

- [ ] P04-M10-10-01 — Requirements approved.
- [ ] P04-M10-10-02 — Database/migrations complete where required.
- [ ] P04-M10-10-03 — Backend/domain logic complete.
- [ ] P04-M10-10-04 — API contracts complete where required.
- [ ] P04-M10-10-05 — Frontend complete where required.
- [ ] P04-M10-10-06 — Real integration complete; no production-blocking mock flow remains.
- [ ] P04-M10-10-07 — Loading/empty/error/validation states complete.
- [ ] P04-M10-10-08 — Security and tenant-isolation checks pass.
- [ ] P04-M10-10-09 — Unit/integration/E2E/manual QA required for this slice pass.
- [ ] P04-M10-10-10 — Documentation updated.
- [ ] P04-M10-10-11 — No unrelated future module was implemented.
- [ ] P04-M10-10-12 — Module accepted and marked Completed before the next module starts.

**Module Gate:** `[M10] Twilio Telephony Provider = COMPLETE ✅` only after every required checkbox above is verified.

## Module 11 — Phone Number Management `M11`

**Target:** MVP

**Dependencies:** M04, M05, M10

### Submodule 11.01 — Scope & Requirements

- [ ] P04-M11-01-01 — Confirm the objective and boundaries of **Phone Number Management**.
- [ ] P04-M11-01-02 — Search available phone numbers
- [ ] P04-M11-01-03 — Purchase/provision
- [ ] P04-M11-01-04 — Import/map existing number where supported
- [ ] P04-M11-01-05 — List owned numbers
- [ ] P04-M11-01-06 — Assign number to agent
- [ ] P04-M11-01-07 — Unassign
- [ ] P04-M11-01-08 — Release
- [ ] P04-M11-01-09 — Display status/provider/country
- [ ] P04-M11-01-10 — Explicitly document what is out of scope for this module so later-phase work is not pulled forward.

### Submodule 11.02 — Data & Persistence

- [ ] P04-M11-02-01 — Implement/confirm data requirement: `phone_numbers`.
- [ ] P04-M11-02-02 — Implement/confirm data requirement: `phone_number_assignments`.
- [ ] P04-M11-02-03 — Create and test migrations for this module without destructive uncontrolled schema synchronization.
- [ ] P04-M11-02-04 — Confirm organization/business ownership keys and foreign-key behavior for tenant-owned records.

### Submodule 11.03 — Backend / Domain Logic

- [ ] P04-M11-03-01 — Create/update the NestJS module boundaries, services and domain logic for **Phone Number Management**.
- [ ] P04-M11-03-02 — Keep provider-specific implementation outside core business rules wherever the provider abstraction applies.
- [ ] P04-M11-03-03 — Add consistent error handling, logging and retry/idempotency behavior where required.

### Submodule 11.04 — API / Contracts

- [ ] P04-M11-04-01 — Implement/verify API contract: `GET /api/v1/phone-numbers`.
- [ ] P04-M11-04-02 — Implement/verify API contract: `POST /api/v1/phone-numbers/search`.
- [ ] P04-M11-04-03 — Implement/verify API contract: `POST /api/v1/phone-numbers/purchase`.
- [ ] P04-M11-04-04 — Implement/verify API contract: `POST /api/v1/phone-numbers/:id/assign`.
- [ ] P04-M11-04-05 — Implement/verify API contract: `POST /api/v1/phone-numbers/:id/unassign`.
- [ ] P04-M11-04-06 — Implement/verify API contract: `DELETE /api/v1/phone-numbers/:id`.
- [ ] P04-M11-04-07 — Add DTO/schema validation and consistent API error responses.

### Submodule 11.05 — Frontend / UX

- [ ] P04-M11-05-01 — Build/complete frontend requirement: Phone-number list.
- [ ] P04-M11-05-02 — Build/complete frontend requirement: Search/purchase flow.
- [ ] P04-M11-05-03 — Build/complete frontend requirement: Assignment UI.
- [ ] P04-M11-05-04 — Build/complete frontend requirement: Release confirmation.
- [ ] P04-M11-05-05 — Build/complete frontend requirement: Status badges.
- [ ] P04-M11-05-06 — Connect the UI to real APIs and remove temporary production-blocking mock data.
- [ ] P04-M11-05-07 — Verify responsive, loading, empty, validation, success and error states.

### Submodule 11.06 — Provider / External Integration

- [ ] P04-M11-06-01 — Integrate and verify: Twilio number APIs.
- [ ] P04-M11-06-02 — Handle provider timeout, unavailable, invalid-response and retry scenarios where applicable.

### Submodule 11.07 — Security / Validation

- [ ] P04-M11-07-01 — Tenant owns number record.
- [ ] P04-M11-07-02 — Role-based purchase/release.
- [ ] P04-M11-07-03 — Confirm destructive release.
- [ ] P04-M11-07-04 — Verify tenant isolation for all tenant-owned records and actions.

### Submodule 11.08 — Testing / QA

- [ ] P04-M11-08-01 — Test: Search→purchase→assign.
- [ ] P04-M11-08-02 — Test: Unassign.
- [ ] P04-M11-08-03 — Test: Release.
- [ ] P04-M11-08-04 — Test: Cannot assign another tenant's number.
- [ ] P04-M11-08-05 — Run regression checks for directly affected existing modules.
- [ ] P04-M11-08-06 — Complete manual QA of the end-to-end user journey.

### Submodule 11.09 — Documentation / Operational Readiness

- [ ] P04-M11-09-01 — Update the Master Module Registry status and dependencies.
- [ ] P04-M11-09-02 — Document database/API/provider changes introduced by this module.
- [ ] P04-M11-09-03 — Update environment-variable/example configuration documentation if this module introduces new configuration.

### Submodule 11.10 — Acceptance / Definition of Done

- [ ] P04-M11-10-01 — Requirements approved.
- [ ] P04-M11-10-02 — Database/migrations complete where required.
- [ ] P04-M11-10-03 — Backend/domain logic complete.
- [ ] P04-M11-10-04 — API contracts complete where required.
- [ ] P04-M11-10-05 — Frontend complete where required.
- [ ] P04-M11-10-06 — Real integration complete; no production-blocking mock flow remains.
- [ ] P04-M11-10-07 — Loading/empty/error/validation states complete.
- [ ] P04-M11-10-08 — Security and tenant-isolation checks pass.
- [ ] P04-M11-10-09 — Unit/integration/E2E/manual QA required for this slice pass.
- [ ] P04-M11-10-10 — Documentation updated.
- [ ] P04-M11-10-11 — No unrelated future module was implemented.
- [ ] P04-M11-10-12 — Module accepted and marked Completed before the next module starts.

**Module Gate:** `[M11] Phone Number Management = COMPLETE ✅` only after every required checkbox above is verified.

---

# PHASE 05 — AI Calling MVP

- [ ] P05-GATE — Phase 05 is complete only when every required module below is accepted.

## Module 12 — Incoming AI Calls `M12`

**Target:** MVP

**Dependencies:** M06, M10, M11

### Submodule 12.01 — Scope & Requirements

- [ ] P05-M12-01-01 — Confirm the objective and boundaries of **Incoming AI Calls**.
- [ ] P05-M12-01-02 — Receive inbound call
- [ ] P05-M12-01-03 — Resolve called number
- [ ] P05-M12-01-04 — Resolve organization/business/agent
- [ ] P05-M12-01-05 — Route to ElevenLabs agent
- [ ] P05-M12-01-06 — Create local call record
- [ ] P05-M12-01-07 — Normalize call lifecycle events
- [ ] P05-M12-01-08 — Persist start/end status
- [ ] P05-M12-01-09 — Handle failed/unmapped calls
- [ ] P05-M12-01-10 — Explicitly document what is out of scope for this module so later-phase work is not pulled forward.

### Submodule 12.02 — Data & Persistence

- [ ] P05-M12-02-01 — Implement/confirm data requirement: `calls`.
- [ ] P05-M12-02-02 — Implement/confirm data requirement: `call_events`.
- [ ] P05-M12-02-03 — Create and test migrations for this module without destructive uncontrolled schema synchronization.
- [ ] P05-M12-02-04 — Confirm organization/business ownership keys and foreign-key behavior for tenant-owned records.

### Submodule 12.03 — Backend / Domain Logic

- [ ] P05-M12-03-01 — Create/update the NestJS module boundaries, services and domain logic for **Incoming AI Calls**.
- [ ] P05-M12-03-02 — Keep provider-specific implementation outside core business rules wherever the provider abstraction applies.
- [ ] P05-M12-03-03 — Add consistent error handling, logging and retry/idempotency behavior where required.

### Submodule 12.04 — API / Contracts

- [ ] P05-M12-04-01 — Implement/verify API contract: `Twilio inbound webhook`.
- [ ] P05-M12-04-02 — Implement/verify API contract: `Twilio status callback`.
- [ ] P05-M12-04-03 — Implement/verify API contract: `ElevenLabs call/conversation webhook endpoints as required`.
- [ ] P05-M12-04-04 — Add DTO/schema validation and consistent API error responses.

### Submodule 12.05 — Frontend / UX

- [ ] P05-M12-05-01 — Build/complete frontend requirement: Basic call appears in customer portal.
- [ ] P05-M12-05-02 — Build/complete frontend requirement: Call status visible.
- [ ] P05-M12-05-03 — Connect the UI to real APIs and remove temporary production-blocking mock data.
- [ ] P05-M12-05-04 — Verify responsive, loading, empty, validation, success and error states.

### Submodule 12.06 — Provider / External Integration

- [ ] P05-M12-06-01 — Integrate and verify: Twilio.
- [ ] P05-M12-06-02 — Integrate and verify: ElevenLabs.
- [ ] P05-M12-06-03 — Handle provider timeout, unavailable, invalid-response and retry scenarios where applicable.

### Submodule 12.07 — Security / Validation

- [ ] P05-M12-07-01 — Webhook verification.
- [ ] P05-M12-07-02 — Reject unknown/unmapped routes safely.
- [ ] P05-M12-07-03 — Tenant-safe call ownership.
- [ ] P05-M12-07-04 — Verify tenant isolation for all tenant-owned records and actions.

### Submodule 12.08 — Testing / QA

- [ ] P05-M12-08-01 — Test: Real phone call reaches correct agent.
- [ ] P05-M12-08-02 — Test: Correct greeting/business knowledge.
- [ ] P05-M12-08-03 — Test: Call completion stored.
- [ ] P05-M12-08-04 — Test: Unknown number handled.
- [ ] P05-M12-08-05 — Test: Failure event stored.
- [ ] P05-M12-08-06 — Run regression checks for directly affected existing modules.
- [ ] P05-M12-08-07 — Complete manual QA of the end-to-end user journey.

### Submodule 12.09 — Documentation / Operational Readiness

- [ ] P05-M12-09-01 — Update the Master Module Registry status and dependencies.
- [ ] P05-M12-09-02 — Document database/API/provider changes introduced by this module.
- [ ] P05-M12-09-03 — Update environment-variable/example configuration documentation if this module introduces new configuration.

### Submodule 12.10 — Acceptance / Definition of Done

- [ ] P05-M12-10-01 — Requirements approved.
- [ ] P05-M12-10-02 — Database/migrations complete where required.
- [ ] P05-M12-10-03 — Backend/domain logic complete.
- [ ] P05-M12-10-04 — API contracts complete where required.
- [ ] P05-M12-10-05 — Frontend complete where required.
- [ ] P05-M12-10-06 — Real integration complete; no production-blocking mock flow remains.
- [ ] P05-M12-10-07 — Loading/empty/error/validation states complete.
- [ ] P05-M12-10-08 — Security and tenant-isolation checks pass.
- [ ] P05-M12-10-09 — Unit/integration/E2E/manual QA required for this slice pass.
- [ ] P05-M12-10-10 — Documentation updated.
- [ ] P05-M12-10-11 — No unrelated future module was implemented.
- [ ] P05-M12-10-12 — Module accepted and marked Completed before the next module starts.

**Module Gate:** `[M12] Incoming AI Calls = COMPLETE ✅` only after every required checkbox above is verified.

## Module 13 — Outbound Calls `M13`

**Target:** Post-MVP

**Dependencies:** M11, M12

### Submodule 13.01 — Scope & Requirements

- [ ] P05-M13-01-01 — Confirm the objective and boundaries of **Outbound Calls**.
- [ ] P05-M13-01-02 — Manual outbound call
- [ ] P05-M13-01-03 — Select business/agent
- [ ] P05-M13-01-04 — Enter/select customer number
- [ ] P05-M13-01-05 — Create callback
- [ ] P05-M13-01-06 — Create reminder/follow-up foundation
- [ ] P05-M13-01-07 — Track outbound lifecycle
- [ ] P05-M13-01-08 — Explicitly document what is out of scope for this module so later-phase work is not pulled forward.

### Submodule 13.02 — Data & Persistence

- [ ] P05-M13-02-01 — Implement/confirm data requirement: `calls`.
- [ ] P05-M13-02-02 — Implement/confirm data requirement: `call_events`.
- [ ] P05-M13-02-03 — Implement/confirm data requirement: `optional outbound_call_requests`.
- [ ] P05-M13-02-04 — Create and test migrations for this module without destructive uncontrolled schema synchronization.
- [ ] P05-M13-02-05 — Confirm organization/business ownership keys and foreign-key behavior for tenant-owned records.

### Submodule 13.03 — Backend / Domain Logic

- [ ] P05-M13-03-01 — Create/update the NestJS module boundaries, services and domain logic for **Outbound Calls**.
- [ ] P05-M13-03-02 — Keep provider-specific implementation outside core business rules wherever the provider abstraction applies.
- [ ] P05-M13-03-03 — Add consistent error handling, logging and retry/idempotency behavior where required.

### Submodule 13.04 — API / Contracts

- [ ] P05-M13-04-01 — Implement/verify API contract: `POST /api/v1/calls/outbound`.
- [ ] P05-M13-04-02 — Add DTO/schema validation and consistent API error responses.

### Submodule 13.05 — Frontend / UX

- [ ] P05-M13-05-01 — Build/complete frontend requirement: Make-call form.
- [ ] P05-M13-05-02 — Build/complete frontend requirement: Call purpose.
- [ ] P05-M13-05-03 — Build/complete frontend requirement: Agent selector.
- [ ] P05-M13-05-04 — Build/complete frontend requirement: Outbound status.
- [ ] P05-M13-05-05 — Connect the UI to real APIs and remove temporary production-blocking mock data.
- [ ] P05-M13-05-06 — Verify responsive, loading, empty, validation, success and error states.

### Submodule 13.06 — Provider / External Integration

- [ ] P05-M13-06-01 — Integrate and verify: Twilio.
- [ ] P05-M13-06-02 — Integrate and verify: ElevenLabs.
- [ ] P05-M13-06-03 — Handle provider timeout, unavailable, invalid-response and retry scenarios where applicable.

### Submodule 13.07 — Security / Validation

- [ ] P05-M13-07-01 — Role/plan permissions.
- [ ] P05-M13-07-02 — Destination validation.
- [ ] P05-M13-07-03 — Abuse/rate controls.
- [ ] P05-M13-07-04 — Verify tenant isolation for all tenant-owned records and actions.

### Submodule 13.08 — Testing / QA

- [ ] P05-M13-08-01 — Test: Initiate outbound call.
- [ ] P05-M13-08-02 — Test: Correct agent used.
- [ ] P05-M13-08-03 — Test: Lifecycle stored.
- [ ] P05-M13-08-04 — Test: Invalid number rejected.
- [ ] P05-M13-08-05 — Test: Provider failure handled.
- [ ] P05-M13-08-06 — Run regression checks for directly affected existing modules.
- [ ] P05-M13-08-07 — Complete manual QA of the end-to-end user journey.

### Submodule 13.09 — Documentation / Operational Readiness

- [ ] P05-M13-09-01 — Update the Master Module Registry status and dependencies.
- [ ] P05-M13-09-02 — Document database/API/provider changes introduced by this module.
- [ ] P05-M13-09-03 — Update environment-variable/example configuration documentation if this module introduces new configuration.

### Submodule 13.10 — Acceptance / Definition of Done

- [ ] P05-M13-10-01 — Requirements approved.
- [ ] P05-M13-10-02 — Database/migrations complete where required.
- [ ] P05-M13-10-03 — Backend/domain logic complete.
- [ ] P05-M13-10-04 — API contracts complete where required.
- [ ] P05-M13-10-05 — Frontend complete where required.
- [ ] P05-M13-10-06 — Real integration complete; no production-blocking mock flow remains.
- [ ] P05-M13-10-07 — Loading/empty/error/validation states complete.
- [ ] P05-M13-10-08 — Security and tenant-isolation checks pass.
- [ ] P05-M13-10-09 — Unit/integration/E2E/manual QA required for this slice pass.
- [ ] P05-M13-10-10 — Documentation updated.
- [ ] P05-M13-10-11 — No unrelated future module was implemented.
- [ ] P05-M13-10-12 — Module accepted and marked Completed before the next module starts.

**Module Gate:** `[M13] Outbound Calls = COMPLETE ✅` only after every required checkbox above is verified.

## Module 14 — Call Management `M14`

**Target:** MVP

**Dependencies:** M12

### Submodule 14.01 — Scope & Requirements

- [ ] P05-M14-01-01 — Confirm the objective and boundaries of **Call Management**.
- [ ] P05-M14-01-02 — List calls
- [ ] P05-M14-01-03 — View call details
- [ ] P05-M14-01-04 — Filter calls
- [ ] P05-M14-01-05 — Show status
- [ ] P05-M14-01-06 — Show duration
- [ ] P05-M14-01-07 — Show caller/receiver
- [ ] P05-M14-01-08 — Show business/agent/provider
- [ ] P05-M14-01-09 — Pagination
- [ ] P05-M14-01-10 — Basic search
- [ ] P05-M14-01-11 — Explicitly document what is out of scope for this module so later-phase work is not pulled forward.

### Submodule 14.02 — Data & Persistence

- [ ] P05-M14-02-01 — Implement/confirm data requirement: `calls`.
- [ ] P05-M14-02-02 — Implement/confirm data requirement: `call_events`.
- [ ] P05-M14-02-03 — Create and test migrations for this module without destructive uncontrolled schema synchronization.
- [ ] P05-M14-02-04 — Confirm organization/business ownership keys and foreign-key behavior for tenant-owned records.

### Submodule 14.03 — Backend / Domain Logic

- [ ] P05-M14-03-01 — Create/update the NestJS module boundaries, services and domain logic for **Call Management**.
- [ ] P05-M14-03-02 — Keep provider-specific implementation outside core business rules wherever the provider abstraction applies.
- [ ] P05-M14-03-03 — Add consistent error handling, logging and retry/idempotency behavior where required.

### Submodule 14.04 — API / Contracts

- [ ] P05-M14-04-01 — Implement/verify API contract: `GET /api/v1/calls`.
- [ ] P05-M14-04-02 — Implement/verify API contract: `GET /api/v1/calls/:id`.
- [ ] P05-M14-04-03 — Add DTO/schema validation and consistent API error responses.

### Submodule 14.05 — Frontend / UX

- [ ] P05-M14-05-01 — Build/complete frontend requirement: Calls table.
- [ ] P05-M14-05-02 — Build/complete frontend requirement: Filters.
- [ ] P05-M14-05-03 — Build/complete frontend requirement: Call detail page.
- [ ] P05-M14-05-04 — Build/complete frontend requirement: Empty/loading/error states.
- [ ] P05-M14-05-05 — Connect the UI to real APIs and remove temporary production-blocking mock data.
- [ ] P05-M14-05-06 — Verify responsive, loading, empty, validation, success and error states.

### Submodule 14.06 — Provider / External Integration

- [ ] P05-M14-06-01 — Confirm this module has no direct external-provider dependency or that dependencies are already abstracted.

### Submodule 14.07 — Security / Validation

- [ ] P05-M14-07-01 — Tenant-scoped call access.
- [ ] P05-M14-07-02 — Role-based recording/transcript visibility if needed.
- [ ] P05-M14-07-03 — Verify tenant isolation for all tenant-owned records and actions.

### Submodule 14.08 — Testing / QA

- [ ] P05-M14-08-01 — Test: List only tenant calls.
- [ ] P05-M14-08-02 — Test: Filter/paginate.
- [ ] P05-M14-08-03 — Test: Open details.
- [ ] P05-M14-08-04 — Test: Cross-tenant call blocked.
- [ ] P05-M14-08-05 — Run regression checks for directly affected existing modules.
- [ ] P05-M14-08-06 — Complete manual QA of the end-to-end user journey.

### Submodule 14.09 — Documentation / Operational Readiness

- [ ] P05-M14-09-01 — Update the Master Module Registry status and dependencies.
- [ ] P05-M14-09-02 — Document database/API/provider changes introduced by this module.
- [ ] P05-M14-09-03 — Update environment-variable/example configuration documentation if this module introduces new configuration.

### Submodule 14.10 — Acceptance / Definition of Done

- [ ] P05-M14-10-01 — Requirements approved.
- [ ] P05-M14-10-02 — Database/migrations complete where required.
- [ ] P05-M14-10-03 — Backend/domain logic complete.
- [ ] P05-M14-10-04 — API contracts complete where required.
- [ ] P05-M14-10-05 — Frontend complete where required.
- [ ] P05-M14-10-06 — Real integration complete; no production-blocking mock flow remains.
- [ ] P05-M14-10-07 — Loading/empty/error/validation states complete.
- [ ] P05-M14-10-08 — Security and tenant-isolation checks pass.
- [ ] P05-M14-10-09 — Unit/integration/E2E/manual QA required for this slice pass.
- [ ] P05-M14-10-10 — Documentation updated.
- [ ] P05-M14-10-11 — No unrelated future module was implemented.
- [ ] P05-M14-10-12 — Module accepted and marked Completed before the next module starts.

**Module Gate:** `[M14] Call Management = COMPLETE ✅` only after every required checkbox above is verified.

## Module 15 — Transcript Management `M15`

**Target:** MVP

**Dependencies:** M12, M14

### Submodule 15.01 — Scope & Requirements

- [ ] P05-M15-01-01 — Confirm the objective and boundaries of **Transcript Management**.
- [ ] P05-M15-01-02 — Receive/fetch transcript
- [ ] P05-M15-01-03 — Store speaker-separated messages
- [ ] P05-M15-01-04 — Maintain sequence/timestamps
- [ ] P05-M15-01-05 — Display timeline
- [ ] P05-M15-01-06 — Search within transcript where supported
- [ ] P05-M15-01-07 — Handle partial/final transcript updates
- [ ] P05-M15-01-08 — Explicitly document what is out of scope for this module so later-phase work is not pulled forward.

### Submodule 15.02 — Data & Persistence

- [ ] P05-M15-02-01 — Implement/confirm data requirement: `call_messages`.
- [ ] P05-M15-02-02 — Create and test migrations for this module without destructive uncontrolled schema synchronization.
- [ ] P05-M15-02-03 — Confirm organization/business ownership keys and foreign-key behavior for tenant-owned records.

### Submodule 15.03 — Backend / Domain Logic

- [ ] P05-M15-03-01 — Create/update the NestJS module boundaries, services and domain logic for **Transcript Management**.
- [ ] P05-M15-03-02 — Keep provider-specific implementation outside core business rules wherever the provider abstraction applies.
- [ ] P05-M15-03-03 — Add consistent error handling, logging and retry/idempotency behavior where required.

### Submodule 15.04 — API / Contracts

- [ ] P05-M15-04-01 — Implement/verify API contract: `GET /api/v1/calls/:id/transcript`.
- [ ] P05-M15-04-02 — Implement/verify API contract: `Provider transcript webhook/sync method`.
- [ ] P05-M15-04-03 — Add DTO/schema validation and consistent API error responses.

### Submodule 15.05 — Frontend / UX

- [ ] P05-M15-05-01 — Build/complete frontend requirement: Transcript tab.
- [ ] P05-M15-05-02 — Build/complete frontend requirement: Customer/AI speaker distinction.
- [ ] P05-M15-05-03 — Build/complete frontend requirement: Timeline.
- [ ] P05-M15-05-04 — Build/complete frontend requirement: Loading/processing states.
- [ ] P05-M15-05-05 — Connect the UI to real APIs and remove temporary production-blocking mock data.
- [ ] P05-M15-05-06 — Verify responsive, loading, empty, validation, success and error states.

### Submodule 15.06 — Provider / External Integration

- [ ] P05-M15-06-01 — Integrate and verify: ElevenLabs transcript/conversation data.
- [ ] P05-M15-06-02 — Handle provider timeout, unavailable, invalid-response and retry scenarios where applicable.

### Submodule 15.07 — Security / Validation

- [ ] P05-M15-07-01 — Tenant-scoped transcript access.
- [ ] P05-M15-07-02 — PII-aware logging.
- [ ] P05-M15-07-03 — Verify tenant isolation for all tenant-owned records and actions.

### Submodule 15.08 — Testing / QA

- [ ] P05-M15-08-01 — Test: Transcript sync.
- [ ] P05-M15-08-02 — Test: Correct speaker order.
- [ ] P05-M15-08-03 — Test: Partial→final update.
- [ ] P05-M15-08-04 — Test: Cross-tenant access blocked.
- [ ] P05-M15-08-05 — Run regression checks for directly affected existing modules.
- [ ] P05-M15-08-06 — Complete manual QA of the end-to-end user journey.

### Submodule 15.09 — Documentation / Operational Readiness

- [ ] P05-M15-09-01 — Update the Master Module Registry status and dependencies.
- [ ] P05-M15-09-02 — Document database/API/provider changes introduced by this module.
- [ ] P05-M15-09-03 — Update environment-variable/example configuration documentation if this module introduces new configuration.

### Submodule 15.10 — Acceptance / Definition of Done

- [ ] P05-M15-10-01 — Requirements approved.
- [ ] P05-M15-10-02 — Database/migrations complete where required.
- [ ] P05-M15-10-03 — Backend/domain logic complete.
- [ ] P05-M15-10-04 — API contracts complete where required.
- [ ] P05-M15-10-05 — Frontend complete where required.
- [ ] P05-M15-10-06 — Real integration complete; no production-blocking mock flow remains.
- [ ] P05-M15-10-07 — Loading/empty/error/validation states complete.
- [ ] P05-M15-10-08 — Security and tenant-isolation checks pass.
- [ ] P05-M15-10-09 — Unit/integration/E2E/manual QA required for this slice pass.
- [ ] P05-M15-10-10 — Documentation updated.
- [ ] P05-M15-10-11 — No unrelated future module was implemented.
- [ ] P05-M15-10-12 — Module accepted and marked Completed before the next module starts.

**Module Gate:** `[M15] Transcript Management = COMPLETE ✅` only after every required checkbox above is verified.

## Module 16 — Call Summary & Analysis `M16`

**Target:** MVP

**Dependencies:** M15

### Submodule 16.01 — Scope & Requirements

- [ ] P05-M16-01-01 — Confirm the objective and boundaries of **Call Summary & Analysis**.
- [ ] P05-M16-01-02 — Generate/store summary
- [ ] P05-M16-01-03 — Intent
- [ ] P05-M16-01-04 — Outcome
- [ ] P05-M16-01-05 — Sentiment
- [ ] P05-M16-01-06 — Resolution status
- [ ] P05-M16-01-07 — Follow-up required
- [ ] P05-M16-01-08 — Lead status
- [ ] P05-M16-01-09 — Analysis processing state
- [ ] P05-M16-01-10 — Explicitly document what is out of scope for this module so later-phase work is not pulled forward.

### Submodule 16.02 — Data & Persistence

- [ ] P05-M16-02-01 — Implement/confirm data requirement: `call_analysis or fields on calls`.
- [ ] P05-M16-02-02 — Create and test migrations for this module without destructive uncontrolled schema synchronization.
- [ ] P05-M16-02-03 — Confirm organization/business ownership keys and foreign-key behavior for tenant-owned records.

### Submodule 16.03 — Backend / Domain Logic

- [ ] P05-M16-03-01 — Create/update the NestJS module boundaries, services and domain logic for **Call Summary & Analysis**.
- [ ] P05-M16-03-02 — Keep provider-specific implementation outside core business rules wherever the provider abstraction applies.
- [ ] P05-M16-03-03 — Add consistent error handling, logging and retry/idempotency behavior where required.

### Submodule 16.04 — API / Contracts

- [ ] P05-M16-04-01 — Implement/verify API contract: `GET /api/v1/calls/:id/analysis`.
- [ ] P05-M16-04-02 — Implement/verify API contract: `Internal analysis job endpoint/service if required`.
- [ ] P05-M16-04-03 — Add DTO/schema validation and consistent API error responses.

### Submodule 16.05 — Frontend / UX

- [ ] P05-M16-05-01 — Build/complete frontend requirement: Summary/analysis tab.
- [ ] P05-M16-05-02 — Build/complete frontend requirement: Intent/outcome badges.
- [ ] P05-M16-05-03 — Build/complete frontend requirement: Follow-up indicator.
- [ ] P05-M16-05-04 — Build/complete frontend requirement: Processing/error states.
- [ ] P05-M16-05-05 — Connect the UI to real APIs and remove temporary production-blocking mock data.
- [ ] P05-M16-05-06 — Verify responsive, loading, empty, validation, success and error states.

### Submodule 16.06 — Provider / External Integration

- [ ] P05-M16-06-01 — Integrate and verify: Provider analysis or selected LLM service.
- [ ] P05-M16-06-02 — Handle provider timeout, unavailable, invalid-response and retry scenarios where applicable.

### Submodule 16.07 — Security / Validation

- [ ] P05-M16-07-01 — Tenant-scoped analysis.
- [ ] P05-M16-07-02 — Avoid leaking sensitive transcript data in logs.
- [ ] P05-M16-07-03 — Verify tenant isolation for all tenant-owned records and actions.

### Submodule 16.08 — Testing / QA

- [ ] P05-M16-08-01 — Test: Completed call produces analysis.
- [ ] P05-M16-08-02 — Test: Failed analysis retry.
- [ ] P05-M16-08-03 — Test: UI displays result.
- [ ] P05-M16-08-04 — Test: Cross-tenant access blocked.
- [ ] P05-M16-08-05 — Run regression checks for directly affected existing modules.
- [ ] P05-M16-08-06 — Complete manual QA of the end-to-end user journey.

### Submodule 16.09 — Documentation / Operational Readiness

- [ ] P05-M16-09-01 — Update the Master Module Registry status and dependencies.
- [ ] P05-M16-09-02 — Document database/API/provider changes introduced by this module.
- [ ] P05-M16-09-03 — Update environment-variable/example configuration documentation if this module introduces new configuration.

### Submodule 16.10 — Acceptance / Definition of Done

- [ ] P05-M16-10-01 — Requirements approved.
- [ ] P05-M16-10-02 — Database/migrations complete where required.
- [ ] P05-M16-10-03 — Backend/domain logic complete.
- [ ] P05-M16-10-04 — API contracts complete where required.
- [ ] P05-M16-10-05 — Frontend complete where required.
- [ ] P05-M16-10-06 — Real integration complete; no production-blocking mock flow remains.
- [ ] P05-M16-10-07 — Loading/empty/error/validation states complete.
- [ ] P05-M16-10-08 — Security and tenant-isolation checks pass.
- [ ] P05-M16-10-09 — Unit/integration/E2E/manual QA required for this slice pass.
- [ ] P05-M16-10-10 — Documentation updated.
- [ ] P05-M16-10-11 — No unrelated future module was implemented.
- [ ] P05-M16-10-12 — Module accepted and marked Completed before the next module starts.

**Module Gate:** `[M16] Call Summary & Analysis = COMPLETE ✅` only after every required checkbox above is verified.

---

# PHASE 06 — Business Tools

- [ ] P06-GATE — Phase 06 is complete only when every required module below is accepted.

## Module 17 — Generic Tool Framework `M17`

**Target:** MVP

**Dependencies:** M05, M06

### Submodule 17.01 — Scope & Requirements

- [ ] P06-M17-01-01 — Confirm the objective and boundaries of **Generic Tool Framework**.
- [ ] P06-M17-01-02 — Define tool
- [ ] P06-M17-01-03 — Store tool schema/config
- [ ] P06-M17-01-04 — Assign tool to agent
- [ ] P06-M17-01-05 — Validate tool input
- [ ] P06-M17-01-06 — Execute tool
- [ ] P06-M17-01-07 — Normalize output
- [ ] P06-M17-01-08 — Record execution
- [ ] P06-M17-01-09 — Timeout handling
- [ ] P06-M17-01-10 — Retry policy where safe
- [ ] P06-M17-01-11 — Error handling
- [ ] P06-M17-01-12 — Explicitly document what is out of scope for this module so later-phase work is not pulled forward.

### Submodule 17.02 — Data & Persistence

- [ ] P06-M17-02-01 — Implement/confirm data requirement: `tools`.
- [ ] P06-M17-02-02 — Implement/confirm data requirement: `agent_tools`.
- [ ] P06-M17-02-03 — Implement/confirm data requirement: `tool_executions`.
- [ ] P06-M17-02-04 — Create and test migrations for this module without destructive uncontrolled schema synchronization.
- [ ] P06-M17-02-05 — Confirm organization/business ownership keys and foreign-key behavior for tenant-owned records.

### Submodule 17.03 — Backend / Domain Logic

- [ ] P06-M17-03-01 — Create/update the NestJS module boundaries, services and domain logic for **Generic Tool Framework**.
- [ ] P06-M17-03-02 — Keep provider-specific implementation outside core business rules wherever the provider abstraction applies.
- [ ] P06-M17-03-03 — Add consistent error handling, logging and retry/idempotency behavior where required.

### Submodule 17.04 — API / Contracts

- [ ] P06-M17-04-01 — Implement/verify API contract: `CRUD tool endpoints as required`.
- [ ] P06-M17-04-02 — Implement/verify API contract: `Provider-facing secure tool execution endpoint`.
- [ ] P06-M17-04-03 — Add DTO/schema validation and consistent API error responses.

### Submodule 17.05 — Frontend / UX

- [ ] P06-M17-05-01 — Build/complete frontend requirement: Tool list.
- [ ] P06-M17-05-02 — Build/complete frontend requirement: Create/configure tool.
- [ ] P06-M17-05-03 — Build/complete frontend requirement: Assign to agent.
- [ ] P06-M17-05-04 — Build/complete frontend requirement: Execution history.
- [ ] P06-M17-05-05 — Build/complete frontend requirement: Test tool.
- [ ] P06-M17-05-06 — Connect the UI to real APIs and remove temporary production-blocking mock data.
- [ ] P06-M17-05-07 — Verify responsive, loading, empty, validation, success and error states.

### Submodule 17.06 — Provider / External Integration

- [ ] P06-M17-06-01 — Integrate and verify: ElevenLabs tool/function calling.
- [ ] P06-M17-06-02 — Integrate and verify: External REST/webhook systems.
- [ ] P06-M17-06-03 — Handle provider timeout, unavailable, invalid-response and retry scenarios where applicable.

### Submodule 17.07 — Security / Validation

- [ ] P06-M17-07-01 — Encrypted credentials.
- [ ] P06-M17-07-02 — Allow-list/validation where appropriate.
- [ ] P06-M17-07-03 — Tenant-scoped tool access.
- [ ] P06-M17-07-04 — Audit executions.
- [ ] P06-M17-07-05 — Verify tenant isolation for all tenant-owned records and actions.

### Submodule 17.08 — Testing / QA

- [ ] P06-M17-08-01 — Test: Valid tool call.
- [ ] P06-M17-08-02 — Test: Invalid input rejected.
- [ ] P06-M17-08-03 — Test: Timeout.
- [ ] P06-M17-08-04 — Test: External error.
- [ ] P06-M17-08-05 — Test: Execution logged.
- [ ] P06-M17-08-06 — Test: Wrong-tenant tool blocked.
- [ ] P06-M17-08-07 — Run regression checks for directly affected existing modules.
- [ ] P06-M17-08-08 — Complete manual QA of the end-to-end user journey.

### Submodule 17.09 — Documentation / Operational Readiness

- [ ] P06-M17-09-01 — Update the Master Module Registry status and dependencies.
- [ ] P06-M17-09-02 — Document database/API/provider changes introduced by this module.
- [ ] P06-M17-09-03 — Update environment-variable/example configuration documentation if this module introduces new configuration.

### Submodule 17.10 — Acceptance / Definition of Done

- [ ] P06-M17-10-01 — Requirements approved.
- [ ] P06-M17-10-02 — Database/migrations complete where required.
- [ ] P06-M17-10-03 — Backend/domain logic complete.
- [ ] P06-M17-10-04 — API contracts complete where required.
- [ ] P06-M17-10-05 — Frontend complete where required.
- [ ] P06-M17-10-06 — Real integration complete; no production-blocking mock flow remains.
- [ ] P06-M17-10-07 — Loading/empty/error/validation states complete.
- [ ] P06-M17-10-08 — Security and tenant-isolation checks pass.
- [ ] P06-M17-10-09 — Unit/integration/E2E/manual QA required for this slice pass.
- [ ] P06-M17-10-10 — Documentation updated.
- [ ] P06-M17-10-11 — No unrelated future module was implemented.
- [ ] P06-M17-10-12 — Module accepted and marked Completed before the next module starts.

**Module Gate:** `[M17] Generic Tool Framework = COMPLETE ✅` only after every required checkbox above is verified.

## Module 18 — Appointment Booking `M18`

**Target:** Industry

**Dependencies:** M17

### Submodule 18.01 — Scope & Requirements

- [ ] P06-M18-01-01 — Confirm the objective and boundaries of **Appointment Booking**.
- [ ] P06-M18-01-02 — Check available slots
- [ ] P06-M18-01-03 — Book appointment
- [ ] P06-M18-01-04 — Reschedule appointment
- [ ] P06-M18-01-05 — Cancel appointment
- [ ] P06-M18-01-06 — Map customer/business/service
- [ ] P06-M18-01-07 — Return structured response to agent
- [ ] P06-M18-01-08 — Explicitly document what is out of scope for this module so later-phase work is not pulled forward.

### Submodule 18.02 — Data & Persistence

- [ ] P06-M18-02-01 — Implement/confirm data requirement: `appointments or integration mapping if our DB owns canonical booking`.
- [ ] P06-M18-02-02 — Implement/confirm data requirement: `tool_executions`.
- [ ] P06-M18-02-03 — Create and test migrations for this module without destructive uncontrolled schema synchronization.
- [ ] P06-M18-02-04 — Confirm organization/business ownership keys and foreign-key behavior for tenant-owned records.

### Submodule 18.03 — Backend / Domain Logic

- [ ] P06-M18-03-01 — Create/update the NestJS module boundaries, services and domain logic for **Appointment Booking**.
- [ ] P06-M18-03-02 — Keep provider-specific implementation outside core business rules wherever the provider abstraction applies.
- [ ] P06-M18-03-03 — Add consistent error handling, logging and retry/idempotency behavior where required.

### Submodule 18.04 — API / Contracts

- [ ] P06-M18-04-01 — Implement/verify API contract: `Tool endpoints for checkSlots/bookAppointment/rescheduleAppointment/cancelAppointment`.
- [ ] P06-M18-04-02 — Add DTO/schema validation and consistent API error responses.

### Submodule 18.05 — Frontend / UX

- [ ] P06-M18-05-01 — Build/complete frontend requirement: Appointment list/basic detail if owned in SaaS.
- [ ] P06-M18-05-02 — Build/complete frontend requirement: Integration settings.
- [ ] P06-M18-05-03 — Build/complete frontend requirement: Tool test UI.
- [ ] P06-M18-05-04 — Connect the UI to real APIs and remove temporary production-blocking mock data.
- [ ] P06-M18-05-05 — Verify responsive, loading, empty, validation, success and error states.

### Submodule 18.06 — Provider / External Integration

- [ ] P06-M18-06-01 — Integrate and verify: Calendar/booking provider or business API.
- [ ] P06-M18-06-02 — Handle provider timeout, unavailable, invalid-response and retry scenarios where applicable.

### Submodule 18.07 — Security / Validation

- [ ] P06-M18-07-01 — Tenant-specific credentials.
- [ ] P06-M18-07-02 — Double-booking safeguards.
- [ ] P06-M18-07-03 — Input validation.
- [ ] P06-M18-07-04 — Verify tenant isolation for all tenant-owned records and actions.

### Submodule 18.08 — Testing / QA

- [ ] P06-M18-08-01 — Test: Check slots.
- [ ] P06-M18-08-02 — Test: Book.
- [ ] P06-M18-08-03 — Test: Reschedule.
- [ ] P06-M18-08-04 — Test: Cancel.
- [ ] P06-M18-08-05 — Test: Conflict handled.
- [ ] P06-M18-08-06 — Test: Agent receives usable result.
- [ ] P06-M18-08-07 — Run regression checks for directly affected existing modules.
- [ ] P06-M18-08-08 — Complete manual QA of the end-to-end user journey.

### Submodule 18.09 — Documentation / Operational Readiness

- [ ] P06-M18-09-01 — Update the Master Module Registry status and dependencies.
- [ ] P06-M18-09-02 — Document database/API/provider changes introduced by this module.
- [ ] P06-M18-09-03 — Update environment-variable/example configuration documentation if this module introduces new configuration.

### Submodule 18.10 — Acceptance / Definition of Done

- [ ] P06-M18-10-01 — Requirements approved.
- [ ] P06-M18-10-02 — Database/migrations complete where required.
- [ ] P06-M18-10-03 — Backend/domain logic complete.
- [ ] P06-M18-10-04 — API contracts complete where required.
- [ ] P06-M18-10-05 — Frontend complete where required.
- [ ] P06-M18-10-06 — Real integration complete; no production-blocking mock flow remains.
- [ ] P06-M18-10-07 — Loading/empty/error/validation states complete.
- [ ] P06-M18-10-08 — Security and tenant-isolation checks pass.
- [ ] P06-M18-10-09 — Unit/integration/E2E/manual QA required for this slice pass.
- [ ] P06-M18-10-10 — Documentation updated.
- [ ] P06-M18-10-11 — No unrelated future module was implemented.
- [ ] P06-M18-10-12 — Module accepted and marked Completed before the next module starts.

**Module Gate:** `[M18] Appointment Booking = COMPLETE ✅` only after every required checkbox above is verified.

## Module 19 — Restaurant Reservations `M19`

**Target:** Industry

**Dependencies:** M17

### Submodule 19.01 — Scope & Requirements

- [ ] P06-M19-01-01 — Confirm the objective and boundaries of **Restaurant Reservations**.
- [ ] P06-M19-01-02 — Check table availability
- [ ] P06-M19-01-03 — Create reservation
- [ ] P06-M19-01-04 — Cancel reservation
- [ ] P06-M19-01-05 — Get reservation
- [ ] P06-M19-01-06 — Capture guest count/date/time/contact
- [ ] P06-M19-01-07 — Return structured result to agent
- [ ] P06-M19-01-08 — Explicitly document what is out of scope for this module so later-phase work is not pulled forward.

### Submodule 19.02 — Data & Persistence

- [ ] P06-M19-02-01 — Implement/confirm data requirement: `reservations or provider mapping if owned internally`.
- [ ] P06-M19-02-02 — Implement/confirm data requirement: `tool_executions`.
- [ ] P06-M19-02-03 — Create and test migrations for this module without destructive uncontrolled schema synchronization.
- [ ] P06-M19-02-04 — Confirm organization/business ownership keys and foreign-key behavior for tenant-owned records.

### Submodule 19.03 — Backend / Domain Logic

- [ ] P06-M19-03-01 — Create/update the NestJS module boundaries, services and domain logic for **Restaurant Reservations**.
- [ ] P06-M19-03-02 — Keep provider-specific implementation outside core business rules wherever the provider abstraction applies.
- [ ] P06-M19-03-03 — Add consistent error handling, logging and retry/idempotency behavior where required.

### Submodule 19.04 — API / Contracts

- [ ] P06-M19-04-01 — Implement/verify API contract: `Tool endpoints for checkAvailability/createReservation/cancelReservation/getReservation`.
- [ ] P06-M19-04-02 — Add DTO/schema validation and consistent API error responses.

### Submodule 19.05 — Frontend / UX

- [ ] P06-M19-05-01 — Build/complete frontend requirement: Reservation list/basic detail if owned in SaaS.
- [ ] P06-M19-05-02 — Build/complete frontend requirement: Integration settings.
- [ ] P06-M19-05-03 — Build/complete frontend requirement: Tool test UI.
- [ ] P06-M19-05-04 — Connect the UI to real APIs and remove temporary production-blocking mock data.
- [ ] P06-M19-05-05 — Verify responsive, loading, empty, validation, success and error states.

### Submodule 19.06 — Provider / External Integration

- [ ] P06-M19-06-01 — Integrate and verify: Restaurant reservation system or business API.
- [ ] P06-M19-06-02 — Handle provider timeout, unavailable, invalid-response and retry scenarios where applicable.

### Submodule 19.07 — Security / Validation

- [ ] P06-M19-07-01 — Tenant-specific credentials.
- [ ] P06-M19-07-02 — Date/time/party-size validation.
- [ ] P06-M19-07-03 — Duplicate reservation safeguards.
- [ ] P06-M19-07-04 — Verify tenant isolation for all tenant-owned records and actions.

### Submodule 19.08 — Testing / QA

- [ ] P06-M19-08-01 — Test: Availability.
- [ ] P06-M19-08-02 — Test: Create.
- [ ] P06-M19-08-03 — Test: Lookup.
- [ ] P06-M19-08-04 — Test: Cancel.
- [ ] P06-M19-08-05 — Test: No-availability path.
- [ ] P06-M19-08-06 — Test: Provider failure.
- [ ] P06-M19-08-07 — Run regression checks for directly affected existing modules.
- [ ] P06-M19-08-08 — Complete manual QA of the end-to-end user journey.

### Submodule 19.09 — Documentation / Operational Readiness

- [ ] P06-M19-09-01 — Update the Master Module Registry status and dependencies.
- [ ] P06-M19-09-02 — Document database/API/provider changes introduced by this module.
- [ ] P06-M19-09-03 — Update environment-variable/example configuration documentation if this module introduces new configuration.

### Submodule 19.10 — Acceptance / Definition of Done

- [ ] P06-M19-10-01 — Requirements approved.
- [ ] P06-M19-10-02 — Database/migrations complete where required.
- [ ] P06-M19-10-03 — Backend/domain logic complete.
- [ ] P06-M19-10-04 — API contracts complete where required.
- [ ] P06-M19-10-05 — Frontend complete where required.
- [ ] P06-M19-10-06 — Real integration complete; no production-blocking mock flow remains.
- [ ] P06-M19-10-07 — Loading/empty/error/validation states complete.
- [ ] P06-M19-10-08 — Security and tenant-isolation checks pass.
- [ ] P06-M19-10-09 — Unit/integration/E2E/manual QA required for this slice pass.
- [ ] P06-M19-10-10 — Documentation updated.
- [ ] P06-M19-10-11 — No unrelated future module was implemented.
- [ ] P06-M19-10-12 — Module accepted and marked Completed before the next module starts.

**Module Gate:** `[M19] Restaurant Reservations = COMPLETE ✅` only after every required checkbox above is verified.

---

# PHASE 07 — CRM & Intelligence

- [ ] P07-GATE — Phase 07 is complete only when every required module below is accepted.

## Module 20 — Customer / CRM `M20`

**Target:** Commercial

**Dependencies:** M04, M14

### Submodule 20.01 — Scope & Requirements

- [ ] P07-M20-01-01 — Confirm the objective and boundaries of **Customer / CRM**.
- [ ] P07-M20-01-02 — Customer profiles
- [ ] P07-M20-01-03 — Contact details
- [ ] P07-M20-01-04 — Previous calls
- [ ] P07-M20-01-05 — Previous bookings/reservations
- [ ] P07-M20-01-06 — Preferences
- [ ] P07-M20-01-07 — Notes
- [ ] P07-M20-01-08 — Lead status
- [ ] P07-M20-01-09 — Follow-up status
- [ ] P07-M20-01-10 — Search/filter customers
- [ ] P07-M20-01-11 — Explicitly document what is out of scope for this module so later-phase work is not pulled forward.

### Submodule 20.02 — Data & Persistence

- [ ] P07-M20-02-01 — Implement/confirm data requirement: `customers`.
- [ ] P07-M20-02-02 — Implement/confirm data requirement: `customer_notes`.
- [ ] P07-M20-02-03 — Implement/confirm data requirement: `customer_preferences`.
- [ ] P07-M20-02-04 — Create and test migrations for this module without destructive uncontrolled schema synchronization.
- [ ] P07-M20-02-05 — Confirm organization/business ownership keys and foreign-key behavior for tenant-owned records.

### Submodule 20.03 — Backend / Domain Logic

- [ ] P07-M20-03-01 — Create/update the NestJS module boundaries, services and domain logic for **Customer / CRM**.
- [ ] P07-M20-03-02 — Keep provider-specific implementation outside core business rules wherever the provider abstraction applies.
- [ ] P07-M20-03-03 — Add consistent error handling, logging and retry/idempotency behavior where required.

### Submodule 20.04 — API / Contracts

- [ ] P07-M20-04-01 — Implement/verify API contract: `CRUD/read customer endpoints`.
- [ ] P07-M20-04-02 — Implement/verify API contract: `Customer activity/history endpoints`.
- [ ] P07-M20-04-03 — Add DTO/schema validation and consistent API error responses.

### Submodule 20.05 — Frontend / UX

- [ ] P07-M20-05-01 — Build/complete frontend requirement: Customer list.
- [ ] P07-M20-05-02 — Build/complete frontend requirement: Customer detail.
- [ ] P07-M20-05-03 — Build/complete frontend requirement: Activity timeline.
- [ ] P07-M20-05-04 — Build/complete frontend requirement: Notes.
- [ ] P07-M20-05-05 — Build/complete frontend requirement: Lead/follow-up state.
- [ ] P07-M20-05-06 — Connect the UI to real APIs and remove temporary production-blocking mock data.
- [ ] P07-M20-05-07 — Verify responsive, loading, empty, validation, success and error states.

### Submodule 20.06 — Provider / External Integration

- [ ] P07-M20-06-01 — Integrate and verify: Calls.
- [ ] P07-M20-06-02 — Integrate and verify: Appointments/reservations.
- [ ] P07-M20-06-03 — Integrate and verify: Future CRM connectors.
- [ ] P07-M20-06-04 — Handle provider timeout, unavailable, invalid-response and retry scenarios where applicable.

### Submodule 20.07 — Security / Validation

- [ ] P07-M20-07-01 — Tenant-scoped customer data.
- [ ] P07-M20-07-02 — Role-based sensitive data access.
- [ ] P07-M20-07-03 — Verify tenant isolation for all tenant-owned records and actions.

### Submodule 20.08 — Testing / QA

- [ ] P07-M20-08-01 — Test: Create/update customer.
- [ ] P07-M20-08-02 — Test: Link call history.
- [ ] P07-M20-08-03 — Test: Notes.
- [ ] P07-M20-08-04 — Test: Cross-tenant customer blocked.
- [ ] P07-M20-08-05 — Run regression checks for directly affected existing modules.
- [ ] P07-M20-08-06 — Complete manual QA of the end-to-end user journey.

### Submodule 20.09 — Documentation / Operational Readiness

- [ ] P07-M20-09-01 — Update the Master Module Registry status and dependencies.
- [ ] P07-M20-09-02 — Document database/API/provider changes introduced by this module.
- [ ] P07-M20-09-03 — Update environment-variable/example configuration documentation if this module introduces new configuration.

### Submodule 20.10 — Acceptance / Definition of Done

- [ ] P07-M20-10-01 — Requirements approved.
- [ ] P07-M20-10-02 — Database/migrations complete where required.
- [ ] P07-M20-10-03 — Backend/domain logic complete.
- [ ] P07-M20-10-04 — API contracts complete where required.
- [ ] P07-M20-10-05 — Frontend complete where required.
- [ ] P07-M20-10-06 — Real integration complete; no production-blocking mock flow remains.
- [ ] P07-M20-10-07 — Loading/empty/error/validation states complete.
- [ ] P07-M20-10-08 — Security and tenant-isolation checks pass.
- [ ] P07-M20-10-09 — Unit/integration/E2E/manual QA required for this slice pass.
- [ ] P07-M20-10-10 — Documentation updated.
- [ ] P07-M20-10-11 — No unrelated future module was implemented.
- [ ] P07-M20-10-12 — Module accepted and marked Completed before the next module starts.

**Module Gate:** `[M20] Customer / CRM = COMPLETE ✅` only after every required checkbox above is verified.

## Module 21 — Knowledge Gap Detection `M21`

**Target:** Commercial

**Dependencies:** M15, M16, M07

### Submodule 21.01 — Scope & Requirements

- [ ] P07-M21-01-01 — Confirm the objective and boundaries of **Knowledge Gap Detection**.
- [ ] P07-M21-01-02 — Detect unanswered questions
- [ ] P07-M21-01-03 — Detect low-confidence/weak answers
- [ ] P07-M21-01-04 — Identify repeated questions
- [ ] P07-M21-01-05 — Create knowledge suggestions
- [ ] P07-M21-01-06 — Human approval/rejection
- [ ] P07-M21-01-07 — Apply approved knowledge update
- [ ] P07-M21-01-08 — Track suggestion lifecycle
- [ ] P07-M21-01-09 — Explicitly document what is out of scope for this module so later-phase work is not pulled forward.

### Submodule 21.02 — Data & Persistence

- [ ] P07-M21-02-01 — Implement/confirm data requirement: `knowledge_gap_suggestions or equivalent`.
- [ ] P07-M21-02-02 — Implement/confirm data requirement: `knowledge_sources`.
- [ ] P07-M21-02-03 — Implement/confirm data requirement: `audit_logs`.
- [ ] P07-M21-02-04 — Create and test migrations for this module without destructive uncontrolled schema synchronization.
- [ ] P07-M21-02-05 — Confirm organization/business ownership keys and foreign-key behavior for tenant-owned records.

### Submodule 21.03 — Backend / Domain Logic

- [ ] P07-M21-03-01 — Create/update the NestJS module boundaries, services and domain logic for **Knowledge Gap Detection**.
- [ ] P07-M21-03-02 — Keep provider-specific implementation outside core business rules wherever the provider abstraction applies.
- [ ] P07-M21-03-03 — Add consistent error handling, logging and retry/idempotency behavior where required.

### Submodule 21.04 — API / Contracts

- [ ] P07-M21-04-01 — Implement/verify API contract: `GET /api/v1/knowledge-gaps`.
- [ ] P07-M21-04-02 — Implement/verify API contract: `POST /api/v1/knowledge-gaps/:id/approve`.
- [ ] P07-M21-04-03 — Implement/verify API contract: `POST /api/v1/knowledge-gaps/:id/reject`.
- [ ] P07-M21-04-04 — Add DTO/schema validation and consistent API error responses.

### Submodule 21.05 — Frontend / UX

- [ ] P07-M21-05-01 — Build/complete frontend requirement: Knowledge gaps queue.
- [ ] P07-M21-05-02 — Build/complete frontend requirement: Evidence/transcript context.
- [ ] P07-M21-05-03 — Build/complete frontend requirement: Approve/reject/edit suggestion.
- [ ] P07-M21-05-04 — Build/complete frontend requirement: Status history.
- [ ] P07-M21-05-05 — Connect the UI to real APIs and remove temporary production-blocking mock data.
- [ ] P07-M21-05-06 — Verify responsive, loading, empty, validation, success and error states.

### Submodule 21.06 — Provider / External Integration

- [ ] P07-M21-06-01 — Integrate and verify: Call analysis.
- [ ] P07-M21-06-02 — Integrate and verify: Knowledge sync.
- [ ] P07-M21-06-03 — Handle provider timeout, unavailable, invalid-response and retry scenarios where applicable.

### Submodule 21.07 — Security / Validation

- [ ] P07-M21-07-01 — Tenant-scoped suggestions.
- [ ] P07-M21-07-02 — Human approval required before KB change.
- [ ] P07-M21-07-03 — Verify tenant isolation for all tenant-owned records and actions.

### Submodule 21.08 — Testing / QA

- [ ] P07-M21-08-01 — Test: Gap generated from call.
- [ ] P07-M21-08-02 — Test: Approval updates KB.
- [ ] P07-M21-08-03 — Test: Rejected suggestion does not change KB.
- [ ] P07-M21-08-04 — Test: Audit trail recorded.
- [ ] P07-M21-08-05 — Run regression checks for directly affected existing modules.
- [ ] P07-M21-08-06 — Complete manual QA of the end-to-end user journey.

### Submodule 21.09 — Documentation / Operational Readiness

- [ ] P07-M21-09-01 — Update the Master Module Registry status and dependencies.
- [ ] P07-M21-09-02 — Document database/API/provider changes introduced by this module.
- [ ] P07-M21-09-03 — Update environment-variable/example configuration documentation if this module introduces new configuration.

### Submodule 21.10 — Acceptance / Definition of Done

- [ ] P07-M21-10-01 — Requirements approved.
- [ ] P07-M21-10-02 — Database/migrations complete where required.
- [ ] P07-M21-10-03 — Backend/domain logic complete.
- [ ] P07-M21-10-04 — API contracts complete where required.
- [ ] P07-M21-10-05 — Frontend complete where required.
- [ ] P07-M21-10-06 — Real integration complete; no production-blocking mock flow remains.
- [ ] P07-M21-10-07 — Loading/empty/error/validation states complete.
- [ ] P07-M21-10-08 — Security and tenant-isolation checks pass.
- [ ] P07-M21-10-09 — Unit/integration/E2E/manual QA required for this slice pass.
- [ ] P07-M21-10-10 — Documentation updated.
- [ ] P07-M21-10-11 — No unrelated future module was implemented.
- [ ] P07-M21-10-12 — Module accepted and marked Completed before the next module starts.

**Module Gate:** `[M21] Knowledge Gap Detection = COMPLETE ✅` only after every required checkbox above is verified.

---

# PHASE 08 — Automation

- [ ] P08-GATE — Phase 08 is complete only when every required module below is accepted.

## Module 22 — n8n Automation `M22`

**Target:** Commercial

**Dependencies:** M12

### Submodule 22.01 — Scope & Requirements

- [ ] P08-M22-01-01 — Confirm the objective and boundaries of **n8n Automation**.
- [ ] P08-M22-01-02 — Emit provider-neutral business events
- [ ] P08-M22-01-03 — Trigger n8n webhook/workflow
- [ ] P08-M22-01-04 — Map payloads
- [ ] P08-M22-01-05 — Track automation run
- [ ] P08-M22-01-06 — Retry failed delivery
- [ ] P08-M22-01-07 — Support CALL_COMPLETED/CALL_FAILED/BOOKING_CREATED/LEAD_CREATED/FOLLOW_UP_REQUIRED/AGENT_ESCALATED
- [ ] P08-M22-01-08 — Explicitly document what is out of scope for this module so later-phase work is not pulled forward.

### Submodule 22.02 — Data & Persistence

- [ ] P08-M22-02-01 — Implement/confirm data requirement: `automations`.
- [ ] P08-M22-02-02 — Implement/confirm data requirement: `automation_runs`.
- [ ] P08-M22-02-03 — Create and test migrations for this module without destructive uncontrolled schema synchronization.
- [ ] P08-M22-02-04 — Confirm organization/business ownership keys and foreign-key behavior for tenant-owned records.

### Submodule 22.03 — Backend / Domain Logic

- [ ] P08-M22-03-01 — Create/update the NestJS module boundaries, services and domain logic for **n8n Automation**.
- [ ] P08-M22-03-02 — Keep provider-specific implementation outside core business rules wherever the provider abstraction applies.
- [ ] P08-M22-03-03 — Add consistent error handling, logging and retry/idempotency behavior where required.

### Submodule 22.04 — API / Contracts

- [ ] P08-M22-04-01 — Implement/verify API contract: `Automation CRUD/config endpoints as needed`.
- [ ] P08-M22-04-02 — Implement/verify API contract: `Secure outbound webhook delivery`.
- [ ] P08-M22-04-03 — Add DTO/schema validation and consistent API error responses.

### Submodule 22.05 — Frontend / UX

- [ ] P08-M22-05-01 — Build/complete frontend requirement: Automation list.
- [ ] P08-M22-05-02 — Build/complete frontend requirement: Enable/disable.
- [ ] P08-M22-05-03 — Build/complete frontend requirement: Trigger/action configuration.
- [ ] P08-M22-05-04 — Build/complete frontend requirement: Run history.
- [ ] P08-M22-05-05 — Build/complete frontend requirement: Failure/retry state.
- [ ] P08-M22-05-06 — Connect the UI to real APIs and remove temporary production-blocking mock data.
- [ ] P08-M22-05-07 — Verify responsive, loading, empty, validation, success and error states.

### Submodule 22.06 — Provider / External Integration

- [ ] P08-M22-06-01 — Integrate and verify: n8n.
- [ ] P08-M22-06-02 — Integrate and verify: Email/SMS/WhatsApp/CRM/Calendar/Slack/Sheets/custom webhooks.
- [ ] P08-M22-06-03 — Handle provider timeout, unavailable, invalid-response and retry scenarios where applicable.

### Submodule 22.07 — Security / Validation

- [ ] P08-M22-07-01 — Webhook signing/secrets.
- [ ] P08-M22-07-02 — Do not expose credentials.
- [ ] P08-M22-07-03 — n8n kept outside realtime audio loop.
- [ ] P08-M22-07-04 — Verify tenant isolation for all tenant-owned records and actions.

### Submodule 22.08 — Testing / QA

- [ ] P08-M22-08-01 — Test: Event triggers workflow.
- [ ] P08-M22-08-02 — Test: Failure logged.
- [ ] P08-M22-08-03 — Test: Retry works.
- [ ] P08-M22-08-04 — Test: Disabled automation not triggered.
- [ ] P08-M22-08-05 — Run regression checks for directly affected existing modules.
- [ ] P08-M22-08-06 — Complete manual QA of the end-to-end user journey.

### Submodule 22.09 — Documentation / Operational Readiness

- [ ] P08-M22-09-01 — Update the Master Module Registry status and dependencies.
- [ ] P08-M22-09-02 — Document database/API/provider changes introduced by this module.
- [ ] P08-M22-09-03 — Update environment-variable/example configuration documentation if this module introduces new configuration.

### Submodule 22.10 — Acceptance / Definition of Done

- [ ] P08-M22-10-01 — Requirements approved.
- [ ] P08-M22-10-02 — Database/migrations complete where required.
- [ ] P08-M22-10-03 — Backend/domain logic complete.
- [ ] P08-M22-10-04 — API contracts complete where required.
- [ ] P08-M22-10-05 — Frontend complete where required.
- [ ] P08-M22-10-06 — Real integration complete; no production-blocking mock flow remains.
- [ ] P08-M22-10-07 — Loading/empty/error/validation states complete.
- [ ] P08-M22-10-08 — Security and tenant-isolation checks pass.
- [ ] P08-M22-10-09 — Unit/integration/E2E/manual QA required for this slice pass.
- [ ] P08-M22-10-10 — Documentation updated.
- [ ] P08-M22-10-11 — No unrelated future module was implemented.
- [ ] P08-M22-10-12 — Module accepted and marked Completed before the next module starts.

**Module Gate:** `[M22] n8n Automation = COMPLETE ✅` only after every required checkbox above is verified.

## Module 23 — Notifications `M23`

**Target:** Commercial

**Dependencies:** M22

### Submodule 23.01 — Scope & Requirements

- [ ] P08-M23-01-01 — Confirm the objective and boundaries of **Notifications**.
- [ ] P08-M23-01-02 — In-app notifications
- [ ] P08-M23-01-03 — Email notifications
- [ ] P08-M23-01-04 — SMS notifications where configured
- [ ] P08-M23-01-05 — Failed call alert
- [ ] P08-M23-01-06 — Booking/lead alert
- [ ] P08-M23-01-07 — Escalation alert
- [ ] P08-M23-01-08 — Provider/billing alert foundation
- [ ] P08-M23-01-09 — Read/unread state
- [ ] P08-M23-01-10 — Explicitly document what is out of scope for this module so later-phase work is not pulled forward.

### Submodule 23.02 — Data & Persistence

- [ ] P08-M23-02-01 — Implement/confirm data requirement: `notifications`.
- [ ] P08-M23-02-02 — Implement/confirm data requirement: `notification_preferences optional`.
- [ ] P08-M23-02-03 — Create and test migrations for this module without destructive uncontrolled schema synchronization.
- [ ] P08-M23-02-04 — Confirm organization/business ownership keys and foreign-key behavior for tenant-owned records.

### Submodule 23.03 — Backend / Domain Logic

- [ ] P08-M23-03-01 — Create/update the NestJS module boundaries, services and domain logic for **Notifications**.
- [ ] P08-M23-03-02 — Keep provider-specific implementation outside core business rules wherever the provider abstraction applies.
- [ ] P08-M23-03-03 — Add consistent error handling, logging and retry/idempotency behavior where required.

### Submodule 23.04 — API / Contracts

- [ ] P08-M23-04-01 — Implement/verify API contract: `GET /api/v1/notifications`.
- [ ] P08-M23-04-02 — Implement/verify API contract: `PATCH /api/v1/notifications/:id/read`.
- [ ] P08-M23-04-03 — Implement/verify API contract: `Preference endpoints if needed`.
- [ ] P08-M23-04-04 — Add DTO/schema validation and consistent API error responses.

### Submodule 23.05 — Frontend / UX

- [ ] P08-M23-05-01 — Build/complete frontend requirement: Notification center.
- [ ] P08-M23-05-02 — Build/complete frontend requirement: Unread badge.
- [ ] P08-M23-05-03 — Build/complete frontend requirement: Preferences.
- [ ] P08-M23-05-04 — Build/complete frontend requirement: Empty/loading/error states.
- [ ] P08-M23-05-05 — Connect the UI to real APIs and remove temporary production-blocking mock data.
- [ ] P08-M23-05-06 — Verify responsive, loading, empty, validation, success and error states.

### Submodule 23.06 — Provider / External Integration

- [ ] P08-M23-06-01 — Integrate and verify: Email provider.
- [ ] P08-M23-06-02 — Integrate and verify: SMS provider.
- [ ] P08-M23-06-03 — Handle provider timeout, unavailable, invalid-response and retry scenarios where applicable.

### Submodule 23.07 — Security / Validation

- [ ] P08-M23-07-01 — Tenant/user recipient scoping.
- [ ] P08-M23-07-02 — Do not leak another tenant's event.
- [ ] P08-M23-07-03 — Verify tenant isolation for all tenant-owned records and actions.

### Submodule 23.08 — Testing / QA

- [ ] P08-M23-08-01 — Test: Notification created.
- [ ] P08-M23-08-02 — Test: Correct recipient.
- [ ] P08-M23-08-03 — Test: Read state.
- [ ] P08-M23-08-04 — Test: Channel failure logged.
- [ ] P08-M23-08-05 — Run regression checks for directly affected existing modules.
- [ ] P08-M23-08-06 — Complete manual QA of the end-to-end user journey.

### Submodule 23.09 — Documentation / Operational Readiness

- [ ] P08-M23-09-01 — Update the Master Module Registry status and dependencies.
- [ ] P08-M23-09-02 — Document database/API/provider changes introduced by this module.
- [ ] P08-M23-09-03 — Update environment-variable/example configuration documentation if this module introduces new configuration.

### Submodule 23.10 — Acceptance / Definition of Done

- [ ] P08-M23-10-01 — Requirements approved.
- [ ] P08-M23-10-02 — Database/migrations complete where required.
- [ ] P08-M23-10-03 — Backend/domain logic complete.
- [ ] P08-M23-10-04 — API contracts complete where required.
- [ ] P08-M23-10-05 — Frontend complete where required.
- [ ] P08-M23-10-06 — Real integration complete; no production-blocking mock flow remains.
- [ ] P08-M23-10-07 — Loading/empty/error/validation states complete.
- [ ] P08-M23-10-08 — Security and tenant-isolation checks pass.
- [ ] P08-M23-10-09 — Unit/integration/E2E/manual QA required for this slice pass.
- [ ] P08-M23-10-10 — Documentation updated.
- [ ] P08-M23-10-11 — No unrelated future module was implemented.
- [ ] P08-M23-10-12 — Module accepted and marked Completed before the next module starts.

**Module Gate:** `[M23] Notifications = COMPLETE ✅` only after every required checkbox above is verified.

---

# PHASE 09 — Commercial SaaS

- [ ] P09-GATE — Phase 09 is complete only when every required module below is accepted.

## Module 24 — Analytics `M24`

**Target:** Commercial

**Dependencies:** M14, M16

### Submodule 24.01 — Scope & Requirements

- [ ] P09-M24-01-01 — Confirm the objective and boundaries of **Analytics**.
- [ ] P09-M24-01-02 — Call analytics
- [ ] P09-M24-01-03 — Agent analytics
- [ ] P09-M24-01-04 — Business analytics
- [ ] P09-M24-01-05 — Conversion analytics
- [ ] P09-M24-01-06 — Cost analytics
- [ ] P09-M24-01-07 — Date range filters
- [ ] P09-M24-01-08 — Tenant/business/agent filters
- [ ] P09-M24-01-09 — Dashboard aggregates
- [ ] P09-M24-01-10 — Explicitly document what is out of scope for this module so later-phase work is not pulled forward.

### Submodule 24.02 — Data & Persistence

- [ ] P09-M24-02-01 — Implement/confirm data requirement: `analytics aggregates or materialized summaries`.
- [ ] P09-M24-02-02 — Implement/confirm data requirement: `usage/call derived metrics`.
- [ ] P09-M24-02-03 — Create and test migrations for this module without destructive uncontrolled schema synchronization.
- [ ] P09-M24-02-04 — Confirm organization/business ownership keys and foreign-key behavior for tenant-owned records.

### Submodule 24.03 — Backend / Domain Logic

- [ ] P09-M24-03-01 — Create/update the NestJS module boundaries, services and domain logic for **Analytics**.
- [ ] P09-M24-03-02 — Keep provider-specific implementation outside core business rules wherever the provider abstraction applies.
- [ ] P09-M24-03-03 — Add consistent error handling, logging and retry/idempotency behavior where required.

### Submodule 24.04 — API / Contracts

- [ ] P09-M24-04-01 — Implement/verify API contract: `GET /api/v1/analytics/overview`.
- [ ] P09-M24-04-02 — Implement/verify API contract: `GET /api/v1/analytics/calls`.
- [ ] P09-M24-04-03 — Implement/verify API contract: `GET /api/v1/analytics/agents`.
- [ ] P09-M24-04-04 — Implement/verify API contract: `GET /api/v1/analytics/costs`.
- [ ] P09-M24-04-05 — Add DTO/schema validation and consistent API error responses.

### Submodule 24.05 — Frontend / UX

- [ ] P09-M24-05-01 — Build/complete frontend requirement: Analytics dashboard.
- [ ] P09-M24-05-02 — Build/complete frontend requirement: Charts/tables.
- [ ] P09-M24-05-03 — Build/complete frontend requirement: Date filters.
- [ ] P09-M24-05-04 — Build/complete frontend requirement: Business/agent selectors.
- [ ] P09-M24-05-05 — Build/complete frontend requirement: Export later if approved.
- [ ] P09-M24-05-06 — Connect the UI to real APIs and remove temporary production-blocking mock data.
- [ ] P09-M24-05-07 — Verify responsive, loading, empty, validation, success and error states.

### Submodule 24.06 — Provider / External Integration

- [ ] P09-M24-06-01 — Integrate and verify: Call data.
- [ ] P09-M24-06-02 — Integrate and verify: Provider usage/cost data when available.
- [ ] P09-M24-06-03 — Handle provider timeout, unavailable, invalid-response and retry scenarios where applicable.

### Submodule 24.07 — Security / Validation

- [ ] P09-M24-07-01 — Tenant-scoped aggregation.
- [ ] P09-M24-07-02 — Admin cost visibility separated from customer visibility.
- [ ] P09-M24-07-03 — Verify tenant isolation for all tenant-owned records and actions.

### Submodule 24.08 — Testing / QA

- [ ] P09-M24-08-01 — Test: Metrics match source calls.
- [ ] P09-M24-08-02 — Test: Date filters.
- [ ] P09-M24-08-03 — Test: Tenant isolation.
- [ ] P09-M24-08-04 — Test: Empty dataset.
- [ ] P09-M24-08-05 — Run regression checks for directly affected existing modules.
- [ ] P09-M24-08-06 — Complete manual QA of the end-to-end user journey.

### Submodule 24.09 — Documentation / Operational Readiness

- [ ] P09-M24-09-01 — Update the Master Module Registry status and dependencies.
- [ ] P09-M24-09-02 — Document database/API/provider changes introduced by this module.
- [ ] P09-M24-09-03 — Update environment-variable/example configuration documentation if this module introduces new configuration.

### Submodule 24.10 — Acceptance / Definition of Done

- [ ] P09-M24-10-01 — Requirements approved.
- [ ] P09-M24-10-02 — Database/migrations complete where required.
- [ ] P09-M24-10-03 — Backend/domain logic complete.
- [ ] P09-M24-10-04 — API contracts complete where required.
- [ ] P09-M24-10-05 — Frontend complete where required.
- [ ] P09-M24-10-06 — Real integration complete; no production-blocking mock flow remains.
- [ ] P09-M24-10-07 — Loading/empty/error/validation states complete.
- [ ] P09-M24-10-08 — Security and tenant-isolation checks pass.
- [ ] P09-M24-10-09 — Unit/integration/E2E/manual QA required for this slice pass.
- [ ] P09-M24-10-10 — Documentation updated.
- [ ] P09-M24-10-11 — No unrelated future module was implemented.
- [ ] P09-M24-10-12 — Module accepted and marked Completed before the next module starts.

**Module Gate:** `[M24] Analytics = COMPLETE ✅` only after every required checkbox above is verified.

## Module 25 — Subscription Plans `M25`

**Target:** Commercial

**Dependencies:** M03

### Submodule 25.01 — Scope & Requirements

- [ ] P09-M25-01-01 — Confirm the objective and boundaries of **Subscription Plans**.
- [ ] P09-M25-01-02 — Define plans
- [ ] P09-M25-01-03 — Define plan features/entitlements
- [ ] P09-M25-01-04 — Assign subscription
- [ ] P09-M25-01-05 — Trial support foundation
- [ ] P09-M25-01-06 — Enforce agent/business/minute/number limits
- [ ] P09-M25-01-07 — Feature gates
- [ ] P09-M25-01-08 — Plan comparison metadata
- [ ] P09-M25-01-09 — Explicitly document what is out of scope for this module so later-phase work is not pulled forward.

### Submodule 25.02 — Data & Persistence

- [ ] P09-M25-02-01 — Implement/confirm data requirement: `plans`.
- [ ] P09-M25-02-02 — Implement/confirm data requirement: `plan_features`.
- [ ] P09-M25-02-03 — Implement/confirm data requirement: `subscriptions`.
- [ ] P09-M25-02-04 — Implement/confirm data requirement: `subscription_items or entitlements`.
- [ ] P09-M25-02-05 — Create and test migrations for this module without destructive uncontrolled schema synchronization.
- [ ] P09-M25-02-06 — Confirm organization/business ownership keys and foreign-key behavior for tenant-owned records.

### Submodule 25.03 — Backend / Domain Logic

- [ ] P09-M25-03-01 — Create/update the NestJS module boundaries, services and domain logic for **Subscription Plans**.
- [ ] P09-M25-03-02 — Keep provider-specific implementation outside core business rules wherever the provider abstraction applies.
- [ ] P09-M25-03-03 — Add consistent error handling, logging and retry/idempotency behavior where required.

### Submodule 25.04 — API / Contracts

- [ ] P09-M25-04-01 — Implement/verify API contract: `GET /api/v1/plans`.
- [ ] P09-M25-04-02 — Implement/verify API contract: `GET /api/v1/subscription`.
- [ ] P09-M25-04-03 — Implement/verify API contract: `Internal/admin plan management endpoints`.
- [ ] P09-M25-04-04 — Add DTO/schema validation and consistent API error responses.

### Submodule 25.05 — Frontend / UX

- [ ] P09-M25-05-01 — Build/complete frontend requirement: Pricing/plan view.
- [ ] P09-M25-05-02 — Build/complete frontend requirement: Current subscription.
- [ ] P09-M25-05-03 — Build/complete frontend requirement: Feature-limit messages.
- [ ] P09-M25-05-04 — Build/complete frontend requirement: Upgrade CTA.
- [ ] P09-M25-05-05 — Connect the UI to real APIs and remove temporary production-blocking mock data.
- [ ] P09-M25-05-06 — Verify responsive, loading, empty, validation, success and error states.

### Submodule 25.06 — Provider / External Integration

- [ ] P09-M25-06-01 — Confirm this module has no direct external-provider dependency or that dependencies are already abstracted.

### Submodule 25.07 — Security / Validation

- [ ] P09-M25-07-01 — Server-side entitlement enforcement.
- [ ] P09-M25-07-02 — Admin-only plan mutations.
- [ ] P09-M25-07-03 — Verify tenant isolation for all tenant-owned records and actions.

### Submodule 25.08 — Testing / QA

- [ ] P09-M25-08-01 — Test: Plan features resolve correctly.
- [ ] P09-M25-08-02 — Test: Limit enforcement.
- [ ] P09-M25-08-03 — Test: Unauthorized feature blocked.
- [ ] P09-M25-08-04 — Test: Trial entitlement.
- [ ] P09-M25-08-05 — Run regression checks for directly affected existing modules.
- [ ] P09-M25-08-06 — Complete manual QA of the end-to-end user journey.

### Submodule 25.09 — Documentation / Operational Readiness

- [ ] P09-M25-09-01 — Update the Master Module Registry status and dependencies.
- [ ] P09-M25-09-02 — Document database/API/provider changes introduced by this module.
- [ ] P09-M25-09-03 — Update environment-variable/example configuration documentation if this module introduces new configuration.

### Submodule 25.10 — Acceptance / Definition of Done

- [ ] P09-M25-10-01 — Requirements approved.
- [ ] P09-M25-10-02 — Database/migrations complete where required.
- [ ] P09-M25-10-03 — Backend/domain logic complete.
- [ ] P09-M25-10-04 — API contracts complete where required.
- [ ] P09-M25-10-05 — Frontend complete where required.
- [ ] P09-M25-10-06 — Real integration complete; no production-blocking mock flow remains.
- [ ] P09-M25-10-07 — Loading/empty/error/validation states complete.
- [ ] P09-M25-10-08 — Security and tenant-isolation checks pass.
- [ ] P09-M25-10-09 — Unit/integration/E2E/manual QA required for this slice pass.
- [ ] P09-M25-10-10 — Documentation updated.
- [ ] P09-M25-10-11 — No unrelated future module was implemented.
- [ ] P09-M25-10-12 — Module accepted and marked Completed before the next module starts.

**Module Gate:** `[M25] Subscription Plans = COMPLETE ✅` only after every required checkbox above is verified.

## Module 26 — Usage Metering `M26`

**Target:** Commercial

**Dependencies:** M12, M25

### Submodule 26.01 — Scope & Requirements

- [ ] P09-M26-01-01 — Confirm the objective and boundaries of **Usage Metering**.
- [ ] P09-M26-01-02 — Track calls
- [ ] P09-M26-01-03 — Track call minutes
- [ ] P09-M26-01-04 — Track Twilio usage
- [ ] P09-M26-01-05 — Track ElevenLabs usage
- [ ] P09-M26-01-06 — Track LLM usage when applicable
- [ ] P09-M26-01-07 — Track storage/knowledge usage
- [ ] P09-M26-01-08 — Track voice-clone usage
- [ ] P09-M26-01-09 — Track phone numbers
- [ ] P09-M26-01-10 — Aggregate by tenant and billing period
- [ ] P09-M26-01-11 — Explicitly document what is out of scope for this module so later-phase work is not pulled forward.

### Submodule 26.02 — Data & Persistence

- [ ] P09-M26-02-01 — Implement/confirm data requirement: `usage_records`.
- [ ] P09-M26-02-02 — Implement/confirm data requirement: `usage_aggregates`.
- [ ] P09-M26-02-03 — Implement/confirm data requirement: `provider_usage_records`.
- [ ] P09-M26-02-04 — Create and test migrations for this module without destructive uncontrolled schema synchronization.
- [ ] P09-M26-02-05 — Confirm organization/business ownership keys and foreign-key behavior for tenant-owned records.

### Submodule 26.03 — Backend / Domain Logic

- [ ] P09-M26-03-01 — Create/update the NestJS module boundaries, services and domain logic for **Usage Metering**.
- [ ] P09-M26-03-02 — Keep provider-specific implementation outside core business rules wherever the provider abstraction applies.
- [ ] P09-M26-03-03 — Add consistent error handling, logging and retry/idempotency behavior where required.

### Submodule 26.04 — API / Contracts

- [ ] P09-M26-04-01 — Implement/verify API contract: `GET /api/v1/usage`.
- [ ] P09-M26-04-02 — Implement/verify API contract: `GET /api/v1/usage/current-period`.
- [ ] P09-M26-04-03 — Implement/verify API contract: `Internal provider reconciliation endpoints`.
- [ ] P09-M26-04-04 — Add DTO/schema validation and consistent API error responses.

### Submodule 26.05 — Frontend / UX

- [ ] P09-M26-05-01 — Build/complete frontend requirement: Usage dashboard.
- [ ] P09-M26-05-02 — Build/complete frontend requirement: Included/used/remaining.
- [ ] P09-M26-05-03 — Build/complete frontend requirement: Usage breakdown.
- [ ] P09-M26-05-04 — Build/complete frontend requirement: Limit warnings.
- [ ] P09-M26-05-05 — Connect the UI to real APIs and remove temporary production-blocking mock data.
- [ ] P09-M26-05-06 — Verify responsive, loading, empty, validation, success and error states.

### Submodule 26.06 — Provider / External Integration

- [ ] P09-M26-06-01 — Integrate and verify: Twilio usage.
- [ ] P09-M26-06-02 — Integrate and verify: ElevenLabs usage.
- [ ] P09-M26-06-03 — Integrate and verify: Storage metrics.
- [ ] P09-M26-06-04 — Integrate and verify: Future LLM providers.
- [ ] P09-M26-06-05 — Handle provider timeout, unavailable, invalid-response and retry scenarios where applicable.

### Submodule 26.07 — Security / Validation

- [ ] P09-M26-07-01 — Tenant-scoped usage.
- [ ] P09-M26-07-02 — Provider raw cost restricted appropriately.
- [ ] P09-M26-07-03 — Verify tenant isolation for all tenant-owned records and actions.

### Submodule 26.08 — Testing / QA

- [ ] P09-M26-08-01 — Test: Idempotent usage ingestion.
- [ ] P09-M26-08-02 — Test: Aggregation accuracy.
- [ ] P09-M26-08-03 — Test: Billing-period rollover.
- [ ] P09-M26-08-04 — Test: Provider reconciliation.
- [ ] P09-M26-08-05 — Run regression checks for directly affected existing modules.
- [ ] P09-M26-08-06 — Complete manual QA of the end-to-end user journey.

### Submodule 26.09 — Documentation / Operational Readiness

- [ ] P09-M26-09-01 — Update the Master Module Registry status and dependencies.
- [ ] P09-M26-09-02 — Document database/API/provider changes introduced by this module.
- [ ] P09-M26-09-03 — Update environment-variable/example configuration documentation if this module introduces new configuration.

### Submodule 26.10 — Acceptance / Definition of Done

- [ ] P09-M26-10-01 — Requirements approved.
- [ ] P09-M26-10-02 — Database/migrations complete where required.
- [ ] P09-M26-10-03 — Backend/domain logic complete.
- [ ] P09-M26-10-04 — API contracts complete where required.
- [ ] P09-M26-10-05 — Frontend complete where required.
- [ ] P09-M26-10-06 — Real integration complete; no production-blocking mock flow remains.
- [ ] P09-M26-10-07 — Loading/empty/error/validation states complete.
- [ ] P09-M26-10-08 — Security and tenant-isolation checks pass.
- [ ] P09-M26-10-09 — Unit/integration/E2E/manual QA required for this slice pass.
- [ ] P09-M26-10-10 — Documentation updated.
- [ ] P09-M26-10-11 — No unrelated future module was implemented.
- [ ] P09-M26-10-12 — Module accepted and marked Completed before the next module starts.

**Module Gate:** `[M26] Usage Metering = COMPLETE ✅` only after every required checkbox above is verified.

## Module 27 — Billing `M27`

**Target:** Commercial

**Dependencies:** M25, M26

### Submodule 27.01 — Scope & Requirements

- [ ] P09-M27-01-01 — Confirm the objective and boundaries of **Billing**.
- [ ] P09-M27-01-02 — Create customer billing profile
- [ ] P09-M27-01-03 — Monthly/annual subscription
- [ ] P09-M27-01-04 — Trial
- [ ] P09-M27-01-05 — Upgrade/downgrade
- [ ] P09-M27-01-06 — Payment methods
- [ ] P09-M27-01-07 — Invoices
- [ ] P09-M27-01-08 — Usage overage
- [ ] P09-M27-01-09 — Failed payment handling
- [ ] P09-M27-01-10 — Grace period
- [ ] P09-M27-01-11 — Credits/coupons foundation
- [ ] P09-M27-01-12 — Refund/enterprise invoice paths as approved
- [ ] P09-M27-01-13 — Explicitly document what is out of scope for this module so later-phase work is not pulled forward.

### Submodule 27.02 — Data & Persistence

- [ ] P09-M27-02-01 — Implement/confirm data requirement: `subscriptions`.
- [ ] P09-M27-02-02 — Implement/confirm data requirement: `invoices`.
- [ ] P09-M27-02-03 — Implement/confirm data requirement: `billing_events`.
- [ ] P09-M27-02-04 — Implement/confirm data requirement: `provider customer/subscription mappings`.
- [ ] P09-M27-02-05 — Create and test migrations for this module without destructive uncontrolled schema synchronization.
- [ ] P09-M27-02-06 — Confirm organization/business ownership keys and foreign-key behavior for tenant-owned records.

### Submodule 27.03 — Backend / Domain Logic

- [ ] P09-M27-03-01 — Create/update the NestJS module boundaries, services and domain logic for **Billing**.
- [ ] P09-M27-03-02 — Keep provider-specific implementation outside core business rules wherever the provider abstraction applies.
- [ ] P09-M27-03-03 — Add consistent error handling, logging and retry/idempotency behavior where required.

### Submodule 27.04 — API / Contracts

- [ ] P09-M27-04-01 — Implement/verify API contract: `Billing checkout/session endpoints`.
- [ ] P09-M27-04-02 — Implement/verify API contract: `Customer portal endpoint`.
- [ ] P09-M27-04-03 — Implement/verify API contract: `Stripe/provider webhook endpoints`.
- [ ] P09-M27-04-04 — Add DTO/schema validation and consistent API error responses.

### Submodule 27.05 — Frontend / UX

- [ ] P09-M27-05-01 — Build/complete frontend requirement: Billing overview.
- [ ] P09-M27-05-02 — Build/complete frontend requirement: Plan change.
- [ ] P09-M27-05-03 — Build/complete frontend requirement: Payment method.
- [ ] P09-M27-05-04 — Build/complete frontend requirement: Invoices.
- [ ] P09-M27-05-05 — Build/complete frontend requirement: Payment-failure state.
- [ ] P09-M27-05-06 — Connect the UI to real APIs and remove temporary production-blocking mock data.
- [ ] P09-M27-05-07 — Verify responsive, loading, empty, validation, success and error states.

### Submodule 27.06 — Provider / External Integration

- [ ] P09-M27-06-01 — Integrate and verify: Stripe or approved billing provider.
- [ ] P09-M27-06-02 — Handle provider timeout, unavailable, invalid-response and retry scenarios where applicable.

### Submodule 27.07 — Security / Validation

- [ ] P09-M27-07-01 — Webhook signature verification.
- [ ] P09-M27-07-02 — No raw card storage.
- [ ] P09-M27-07-03 — Idempotent billing events.
- [ ] P09-M27-07-04 — Admin/customer authorization.
- [ ] P09-M27-07-05 — Verify tenant isolation for all tenant-owned records and actions.

### Submodule 27.08 — Testing / QA

- [ ] P09-M27-08-01 — Test: Checkout.
- [ ] P09-M27-08-02 — Test: Subscription activation.
- [ ] P09-M27-08-03 — Test: Upgrade/downgrade.
- [ ] P09-M27-08-04 — Test: Failed payment.
- [ ] P09-M27-08-05 — Test: Webhook replay/idempotency.
- [ ] P09-M27-08-06 — Test: Invoice display.
- [ ] P09-M27-08-07 — Run regression checks for directly affected existing modules.
- [ ] P09-M27-08-08 — Complete manual QA of the end-to-end user journey.

### Submodule 27.09 — Documentation / Operational Readiness

- [ ] P09-M27-09-01 — Update the Master Module Registry status and dependencies.
- [ ] P09-M27-09-02 — Document database/API/provider changes introduced by this module.
- [ ] P09-M27-09-03 — Update environment-variable/example configuration documentation if this module introduces new configuration.

### Submodule 27.10 — Acceptance / Definition of Done

- [ ] P09-M27-10-01 — Requirements approved.
- [ ] P09-M27-10-02 — Database/migrations complete where required.
- [ ] P09-M27-10-03 — Backend/domain logic complete.
- [ ] P09-M27-10-04 — API contracts complete where required.
- [ ] P09-M27-10-05 — Frontend complete where required.
- [ ] P09-M27-10-06 — Real integration complete; no production-blocking mock flow remains.
- [ ] P09-M27-10-07 — Loading/empty/error/validation states complete.
- [ ] P09-M27-10-08 — Security and tenant-isolation checks pass.
- [ ] P09-M27-10-09 — Unit/integration/E2E/manual QA required for this slice pass.
- [ ] P09-M27-10-10 — Documentation updated.
- [ ] P09-M27-10-11 — No unrelated future module was implemented.
- [ ] P09-M27-10-12 — Module accepted and marked Completed before the next module starts.

**Module Gate:** `[M27] Billing = COMPLETE ✅` only after every required checkbox above is verified.

---

# PHASE 10 — Admin & Production

- [ ] P10-GATE — Phase 10 is complete only when every required module below is accepted.

## Module 28 — Admin Portal `M28`

**Target:** Commercial

**Dependencies:** M02, M03, M14, M25, M26, M27

### Submodule 28.01 — Scope & Requirements

- [ ] P10-M28-01-01 — Confirm the objective and boundaries of **Admin Portal**.
- [ ] P10-M28-01-02 — Executive dashboard
- [ ] P10-M28-01-03 — Organizations
- [ ] P10-M28-01-04 — Businesses
- [ ] P10-M28-01-05 — Users
- [ ] P10-M28-01-06 — Agents
- [ ] P10-M28-01-07 — Voices
- [ ] P10-M28-01-08 — Knowledge
- [ ] P10-M28-01-09 — Phone numbers
- [ ] P10-M28-01-10 — Calls
- [ ] P10-M28-01-11 — Providers
- [ ] P10-M28-01-12 — Usage
- [ ] P10-M28-01-13 — Plans
- [ ] P10-M28-01-14 — Subscriptions
- [ ] P10-M28-01-15 — Billing
- [ ] P10-M28-01-16 — Revenue/provider costs
- [ ] P10-M28-01-17 — System health
- [ ] P10-M28-01-18 — Support tools
- [ ] P10-M28-01-19 — Explicitly document what is out of scope for this module so later-phase work is not pulled forward.

### Submodule 28.02 — Data & Persistence

- [ ] P10-M28-02-01 — Implement/confirm data requirement: `Uses existing domain tables plus admin/support metadata`.
- [ ] P10-M28-02-02 — Create and test migrations for this module without destructive uncontrolled schema synchronization.
- [ ] P10-M28-02-03 — Confirm organization/business ownership keys and foreign-key behavior for tenant-owned records.

### Submodule 28.03 — Backend / Domain Logic

- [ ] P10-M28-03-01 — Create/update the NestJS module boundaries, services and domain logic for **Admin Portal**.
- [ ] P10-M28-03-02 — Keep provider-specific implementation outside core business rules wherever the provider abstraction applies.
- [ ] P10-M28-03-03 — Add consistent error handling, logging and retry/idempotency behavior where required.

### Submodule 28.04 — API / Contracts

- [ ] P10-M28-04-01 — Implement/verify API contract: `Admin-scoped endpoints or admin authorization over existing APIs`.
- [ ] P10-M28-04-02 — Add DTO/schema validation and consistent API error responses.

### Submodule 28.05 — Frontend / UX

- [ ] P10-M28-05-01 — Build/complete frontend requirement: Admin layout/navigation.
- [ ] P10-M28-05-02 — Build/complete frontend requirement: Management tables.
- [ ] P10-M28-05-03 — Build/complete frontend requirement: Detail views.
- [ ] P10-M28-05-04 — Build/complete frontend requirement: Provider/system views.
- [ ] P10-M28-05-05 — Build/complete frontend requirement: Support actions.
- [ ] P10-M28-05-06 — Connect the UI to real APIs and remove temporary production-blocking mock data.
- [ ] P10-M28-05-07 — Verify responsive, loading, empty, validation, success and error states.

### Submodule 28.06 — Provider / External Integration

- [ ] P10-M28-06-01 — Confirm this module has no direct external-provider dependency or that dependencies are already abstracted.

### Submodule 28.07 — Security / Validation

- [ ] P10-M28-07-01 — Strict admin authorization.
- [ ] P10-M28-07-02 — Audit every destructive/support action.
- [ ] P10-M28-07-03 — Customer portal roles cannot access admin routes.
- [ ] P10-M28-07-04 — Verify tenant isolation for all tenant-owned records and actions.

### Submodule 28.08 — Testing / QA

- [ ] P10-M28-08-01 — Test: Non-admin blocked.
- [ ] P10-M28-08-02 — Test: Admin list/detail flows.
- [ ] P10-M28-08-03 — Test: Support action audited.
- [ ] P10-M28-08-04 — Test: Cross-tenant admin view works only with explicit admin authority.
- [ ] P10-M28-08-05 — Run regression checks for directly affected existing modules.
- [ ] P10-M28-08-06 — Complete manual QA of the end-to-end user journey.

### Submodule 28.09 — Documentation / Operational Readiness

- [ ] P10-M28-09-01 — Update the Master Module Registry status and dependencies.
- [ ] P10-M28-09-02 — Document database/API/provider changes introduced by this module.
- [ ] P10-M28-09-03 — Update environment-variable/example configuration documentation if this module introduces new configuration.

### Submodule 28.10 — Acceptance / Definition of Done

- [ ] P10-M28-10-01 — Requirements approved.
- [ ] P10-M28-10-02 — Database/migrations complete where required.
- [ ] P10-M28-10-03 — Backend/domain logic complete.
- [ ] P10-M28-10-04 — API contracts complete where required.
- [ ] P10-M28-10-05 — Frontend complete where required.
- [ ] P10-M28-10-06 — Real integration complete; no production-blocking mock flow remains.
- [ ] P10-M28-10-07 — Loading/empty/error/validation states complete.
- [ ] P10-M28-10-08 — Security and tenant-isolation checks pass.
- [ ] P10-M28-10-09 — Unit/integration/E2E/manual QA required for this slice pass.
- [ ] P10-M28-10-10 — Documentation updated.
- [ ] P10-M28-10-11 — No unrelated future module was implemented.
- [ ] P10-M28-10-12 — Module accepted and marked Completed before the next module starts.

**Module Gate:** `[M28] Admin Portal = COMPLETE ✅` only after every required checkbox above is verified.

## Module 29 — Security, Audit & Monitoring `M29`

**Target:** Commercial

**Dependencies:** M28

### Submodule 29.01 — Scope & Requirements

- [ ] P10-M29-01-01 — Confirm the objective and boundaries of **Security, Audit & Monitoring**.
- [ ] P10-M29-01-02 — Tenant-isolation review
- [ ] P10-M29-01-03 — RBAC review
- [ ] P10-M29-01-04 — Rate limiting
- [ ] P10-M29-01-05 — Webhook verification
- [ ] P10-M29-01-06 — Secrets management
- [ ] P10-M29-01-07 — Provider credential protection
- [ ] P10-M29-01-08 — Audit logs
- [ ] P10-M29-01-09 — Retention rules
- [ ] P10-M29-01-10 — Data deletion workflow
- [ ] P10-M29-01-11 — Backup/restore plan
- [ ] P10-M29-01-12 — Operational monitoring
- [ ] P10-M29-01-13 — Security alerts
- [ ] P10-M29-01-14 — Explicitly document what is out of scope for this module so later-phase work is not pulled forward.

### Submodule 29.02 — Data & Persistence

- [ ] P10-M29-02-01 — Implement/confirm data requirement: `audit_logs`.
- [ ] P10-M29-02-02 — Implement/confirm data requirement: `provider_logs`.
- [ ] P10-M29-02-03 — Implement/confirm data requirement: `system_events`.
- [ ] P10-M29-02-04 — Create and test migrations for this module without destructive uncontrolled schema synchronization.
- [ ] P10-M29-02-05 — Confirm organization/business ownership keys and foreign-key behavior for tenant-owned records.

### Submodule 29.03 — Backend / Domain Logic

- [ ] P10-M29-03-01 — Create/update the NestJS module boundaries, services and domain logic for **Security, Audit & Monitoring**.
- [ ] P10-M29-03-02 — Keep provider-specific implementation outside core business rules wherever the provider abstraction applies.
- [ ] P10-M29-03-03 — Add consistent error handling, logging and retry/idempotency behavior where required.

### Submodule 29.04 — API / Contracts

- [ ] P10-M29-04-01 — Implement/verify API contract: `Admin audit/system endpoints as appropriate`.
- [ ] P10-M29-04-02 — Add DTO/schema validation and consistent API error responses.

### Submodule 29.05 — Frontend / UX

- [ ] P10-M29-05-01 — Build/complete frontend requirement: Audit log viewer.
- [ ] P10-M29-05-02 — Build/complete frontend requirement: System health/alerts.
- [ ] P10-M29-05-03 — Build/complete frontend requirement: Security-related admin settings where appropriate.
- [ ] P10-M29-05-04 — Connect the UI to real APIs and remove temporary production-blocking mock data.
- [ ] P10-M29-05-05 — Verify responsive, loading, empty, validation, success and error states.

### Submodule 29.06 — Provider / External Integration

- [ ] P10-M29-06-01 — Integrate and verify: Monitoring/logging platform.
- [ ] P10-M29-06-02 — Integrate and verify: Backup/storage services.
- [ ] P10-M29-06-03 — Handle provider timeout, unavailable, invalid-response and retry scenarios where applicable.

### Submodule 29.07 — Security / Validation

- [ ] P10-M29-07-01 — Least privilege.
- [ ] P10-M29-07-02 — Encryption in transit.
- [ ] P10-M29-07-03 — Sensitive credential encryption.
- [ ] P10-M29-07-04 — Voice-consent controls.
- [ ] P10-M29-07-05 — Verify tenant isolation for all tenant-owned records and actions.

### Submodule 29.08 — Testing / QA

- [ ] P10-M29-08-01 — Test: Tenant escape tests.
- [ ] P10-M29-08-02 — Test: RBAC matrix tests.
- [ ] P10-M29-08-03 — Test: Webhook spoof rejection.
- [ ] P10-M29-08-04 — Test: Rate-limit tests.
- [ ] P10-M29-08-05 — Test: Backup restore drill.
- [ ] P10-M29-08-06 — Test: Audit completeness.
- [ ] P10-M29-08-07 — Run regression checks for directly affected existing modules.
- [ ] P10-M29-08-08 — Complete manual QA of the end-to-end user journey.

### Submodule 29.09 — Documentation / Operational Readiness

- [ ] P10-M29-09-01 — Update the Master Module Registry status and dependencies.
- [ ] P10-M29-09-02 — Document database/API/provider changes introduced by this module.
- [ ] P10-M29-09-03 — Update environment-variable/example configuration documentation if this module introduces new configuration.

### Submodule 29.10 — Acceptance / Definition of Done

- [ ] P10-M29-10-01 — Requirements approved.
- [ ] P10-M29-10-02 — Database/migrations complete where required.
- [ ] P10-M29-10-03 — Backend/domain logic complete.
- [ ] P10-M29-10-04 — API contracts complete where required.
- [ ] P10-M29-10-05 — Frontend complete where required.
- [ ] P10-M29-10-06 — Real integration complete; no production-blocking mock flow remains.
- [ ] P10-M29-10-07 — Loading/empty/error/validation states complete.
- [ ] P10-M29-10-08 — Security and tenant-isolation checks pass.
- [ ] P10-M29-10-09 — Unit/integration/E2E/manual QA required for this slice pass.
- [ ] P10-M29-10-10 — Documentation updated.
- [ ] P10-M29-10-11 — No unrelated future module was implemented.
- [ ] P10-M29-10-12 — Module accepted and marked Completed before the next module starts.

**Module Gate:** `[M29] Security, Audit & Monitoring = COMPLETE ✅` only after every required checkbox above is verified.

---

# PHASE 11 — Multi-Provider Future

- [ ] P11-GATE — Phase 11 is complete only when every required module below is accepted.

## Module 30 — Retell Voice Agent Provider `M30`

**Target:** Future

**Dependencies:** M05, M07, M08, M17

### Submodule 30.01 — Scope & Requirements

- [ ] P11-M30-01-01 — Confirm the objective and boundaries of **Retell Voice Agent Provider**.
- [ ] P11-M30-01-02 — Implement Retell behind VoiceAgentProvider
- [ ] P11-M30-01-03 — Create/update/delete provider agent
- [ ] P11-M30-01-04 — Map voice/knowledge/tools
- [ ] P11-M30-01-05 — Normalize call/provider events
- [ ] P11-M30-01-06 — Store provider mapping
- [ ] P11-M30-01-07 — Provider health/retry
- [ ] P11-M30-01-08 — Explicitly document what is out of scope for this module so later-phase work is not pulled forward.

### Submodule 30.02 — Data & Persistence

- [ ] P11-M30-02-01 — Implement/confirm data requirement: `agent_provider_mappings`.
- [ ] P11-M30-02-02 — Implement/confirm data requirement: `provider_logs`.
- [ ] P11-M30-02-03 — Create and test migrations for this module without destructive uncontrolled schema synchronization.
- [ ] P11-M30-02-04 — Confirm organization/business ownership keys and foreign-key behavior for tenant-owned records.

### Submodule 30.03 — Backend / Domain Logic

- [ ] P11-M30-03-01 — Create/update the NestJS module boundaries, services and domain logic for **Retell Voice Agent Provider**.
- [ ] P11-M30-03-02 — Keep provider-specific implementation outside core business rules wherever the provider abstraction applies.
- [ ] P11-M30-03-03 — Add consistent error handling, logging and retry/idempotency behavior where required.

### Submodule 30.04 — API / Contracts

- [ ] P11-M30-04-01 — Implement/verify API contract: `Internal provider adapter; no SaaS-wide API redesign`.
- [ ] P11-M30-04-02 — Add DTO/schema validation and consistent API error responses.

### Submodule 30.05 — Frontend / UX

- [ ] P11-M30-05-01 — Build/complete frontend requirement: Provider selection/status only where product scope allows.
- [ ] P11-M30-05-02 — Connect the UI to real APIs and remove temporary production-blocking mock data.
- [ ] P11-M30-05-03 — Verify responsive, loading, empty, validation, success and error states.

### Submodule 30.06 — Provider / External Integration

- [ ] P11-M30-06-01 — Integrate and verify: Retell AI.
- [ ] P11-M30-06-02 — Handle provider timeout, unavailable, invalid-response and retry scenarios where applicable.

### Submodule 30.07 — Security / Validation

- [ ] P11-M30-07-01 — Server-side credentials.
- [ ] P11-M30-07-02 — Webhook verification.
- [ ] P11-M30-07-03 — Tenant-safe mapping.
- [ ] P11-M30-07-04 — Verify tenant isolation for all tenant-owned records and actions.

### Submodule 30.08 — Testing / QA

- [ ] P11-M30-08-01 — Test: Same provider contract tests as ElevenLabs.
- [ ] P11-M30-08-02 — Test: Agent migration/config sync test.
- [ ] P11-M30-08-03 — Test: Failure normalization.
- [ ] P11-M30-08-04 — Run regression checks for directly affected existing modules.
- [ ] P11-M30-08-05 — Complete manual QA of the end-to-end user journey.

### Submodule 30.09 — Documentation / Operational Readiness

- [ ] P11-M30-09-01 — Update the Master Module Registry status and dependencies.
- [ ] P11-M30-09-02 — Document database/API/provider changes introduced by this module.
- [ ] P11-M30-09-03 — Update environment-variable/example configuration documentation if this module introduces new configuration.

### Submodule 30.10 — Acceptance / Definition of Done

- [ ] P11-M30-10-01 — Requirements approved.
- [ ] P11-M30-10-02 — Database/migrations complete where required.
- [ ] P11-M30-10-03 — Backend/domain logic complete.
- [ ] P11-M30-10-04 — API contracts complete where required.
- [ ] P11-M30-10-05 — Frontend complete where required.
- [ ] P11-M30-10-06 — Real integration complete; no production-blocking mock flow remains.
- [ ] P11-M30-10-07 — Loading/empty/error/validation states complete.
- [ ] P11-M30-10-08 — Security and tenant-isolation checks pass.
- [ ] P11-M30-10-09 — Unit/integration/E2E/manual QA required for this slice pass.
- [ ] P11-M30-10-10 — Documentation updated.
- [ ] P11-M30-10-11 — No unrelated future module was implemented.
- [ ] P11-M30-10-12 — Module accepted and marked Completed before the next module starts.

**Module Gate:** `[M30] Retell Voice Agent Provider = COMPLETE ✅` only after every required checkbox above is verified.

## Module 31 — OpenAI Realtime Provider `M31`

**Target:** Future

**Dependencies:** M05, M10, M17

### Submodule 31.01 — Scope & Requirements

- [ ] P11-M31-01-01 — Confirm the objective and boundaries of **OpenAI Realtime Provider**.
- [ ] P11-M31-01-02 — Refactor preserved openai-realtime and voice-stream code into VoiceAgentProvider
- [ ] P11-M31-01-03 — Maintain realtime WebSocket/session bridge
- [ ] P11-M31-01-04 — Support audio input/output
- [ ] P11-M31-01-05 — Interruption/turn handling
- [ ] P11-M31-01-06 — Tool calling
- [ ] P11-M31-01-07 — Normalize session/call events
- [ ] P11-M31-01-08 — Observability and retry/reconnect strategy
- [ ] P11-M31-01-09 — Explicitly document what is out of scope for this module so later-phase work is not pulled forward.

### Submodule 31.02 — Data & Persistence

- [ ] P11-M31-02-01 — Implement/confirm data requirement: `agent_provider_mappings`.
- [ ] P11-M31-02-02 — Implement/confirm data requirement: `provider_logs`.
- [ ] P11-M31-02-03 — Implement/confirm data requirement: `call events`.
- [ ] P11-M31-02-04 — Create and test migrations for this module without destructive uncontrolled schema synchronization.
- [ ] P11-M31-02-05 — Confirm organization/business ownership keys and foreign-key behavior for tenant-owned records.

### Submodule 31.03 — Backend / Domain Logic

- [ ] P11-M31-03-01 — Create/update the NestJS module boundaries, services and domain logic for **OpenAI Realtime Provider**.
- [ ] P11-M31-03-02 — Keep provider-specific implementation outside core business rules wherever the provider abstraction applies.
- [ ] P11-M31-03-03 — Add consistent error handling, logging and retry/idempotency behavior where required.

### Submodule 31.04 — API / Contracts

- [ ] P11-M31-04-01 — Implement/verify API contract: `Realtime/WebSocket endpoints and internal provider methods`.
- [ ] P11-M31-04-02 — Add DTO/schema validation and consistent API error responses.

### Submodule 31.05 — Frontend / UX

- [ ] P11-M31-05-01 — Build/complete frontend requirement: Provider selection/status if enabled.
- [ ] P11-M31-05-02 — Build/complete frontend requirement: Latency/error diagnostics for admin.
- [ ] P11-M31-05-03 — Connect the UI to real APIs and remove temporary production-blocking mock data.
- [ ] P11-M31-05-04 — Verify responsive, loading, empty, validation, success and error states.

### Submodule 31.06 — Provider / External Integration

- [ ] P11-M31-06-01 — Integrate and verify: OpenAI Realtime.
- [ ] P11-M31-06-02 — Integrate and verify: Twilio or telephony provider.
- [ ] P11-M31-06-03 — Handle provider timeout, unavailable, invalid-response and retry scenarios where applicable.

### Submodule 31.07 — Security / Validation

- [ ] P11-M31-07-01 — Provider secret server-side.
- [ ] P11-M31-07-02 — WebSocket authentication/validation.
- [ ] P11-M31-07-03 — Audio/session isolation per tenant/call.
- [ ] P11-M31-07-04 — Verify tenant isolation for all tenant-owned records and actions.

### Submodule 31.08 — Testing / QA

- [ ] P11-M31-08-01 — Test: Realtime connection.
- [ ] P11-M31-08-02 — Test: Bidirectional audio.
- [ ] P11-M31-08-03 — Test: Interruption.
- [ ] P11-M31-08-04 — Test: Tool call.
- [ ] P11-M31-08-05 — Test: Disconnect/reconnect.
- [ ] P11-M31-08-06 — Test: Concurrent-call isolation.
- [ ] P11-M31-08-07 — Run regression checks for directly affected existing modules.
- [ ] P11-M31-08-08 — Complete manual QA of the end-to-end user journey.

### Submodule 31.09 — Documentation / Operational Readiness

- [ ] P11-M31-09-01 — Update the Master Module Registry status and dependencies.
- [ ] P11-M31-09-02 — Document database/API/provider changes introduced by this module.
- [ ] P11-M31-09-03 — Update environment-variable/example configuration documentation if this module introduces new configuration.

### Submodule 31.10 — Acceptance / Definition of Done

- [ ] P11-M31-10-01 — Requirements approved.
- [ ] P11-M31-10-02 — Database/migrations complete where required.
- [ ] P11-M31-10-03 — Backend/domain logic complete.
- [ ] P11-M31-10-04 — API contracts complete where required.
- [ ] P11-M31-10-05 — Frontend complete where required.
- [ ] P11-M31-10-06 — Real integration complete; no production-blocking mock flow remains.
- [ ] P11-M31-10-07 — Loading/empty/error/validation states complete.
- [ ] P11-M31-10-08 — Security and tenant-isolation checks pass.
- [ ] P11-M31-10-09 — Unit/integration/E2E/manual QA required for this slice pass.
- [ ] P11-M31-10-10 — Documentation updated.
- [ ] P11-M31-10-11 — No unrelated future module was implemented.
- [ ] P11-M31-10-12 — Module accepted and marked Completed before the next module starts.

**Module Gate:** `[M31] OpenAI Realtime Provider = COMPLETE ✅` only after every required checkbox above is verified.

## Module 32 — Telnyx Telephony Provider `M32`

**Target:** Future

**Dependencies:** M10, M11

### Submodule 32.01 — Scope & Requirements

- [ ] P11-M32-01-01 — Confirm the objective and boundaries of **Telnyx Telephony Provider**.
- [ ] P11-M32-01-02 — Implement Telnyx behind TelephonyProvider
- [ ] P11-M32-01-03 — Search/provision/configure/release numbers
- [ ] P11-M32-01-04 — Inbound/outbound routing
- [ ] P11-M32-01-05 — Webhook normalization
- [ ] P11-M32-01-06 — Provider mapping
- [ ] P11-M32-01-07 — Explicitly document what is out of scope for this module so later-phase work is not pulled forward.

### Submodule 32.02 — Data & Persistence

- [ ] P11-M32-02-01 — Implement/confirm data requirement: `phone number/provider mappings`.
- [ ] P11-M32-02-02 — Implement/confirm data requirement: `provider logs`.
- [ ] P11-M32-02-03 — Create and test migrations for this module without destructive uncontrolled schema synchronization.
- [ ] P11-M32-02-04 — Confirm organization/business ownership keys and foreign-key behavior for tenant-owned records.

### Submodule 32.03 — Backend / Domain Logic

- [ ] P11-M32-03-01 — Create/update the NestJS module boundaries, services and domain logic for **Telnyx Telephony Provider**.
- [ ] P11-M32-03-02 — Keep provider-specific implementation outside core business rules wherever the provider abstraction applies.
- [ ] P11-M32-03-03 — Add consistent error handling, logging and retry/idempotency behavior where required.

### Submodule 32.04 — API / Contracts

- [ ] P11-M32-04-01 — Implement/verify API contract: `Telnyx webhook endpoints and internal adapter`.
- [ ] P11-M32-04-02 — Add DTO/schema validation and consistent API error responses.

### Submodule 32.05 — Frontend / UX

- [ ] P11-M32-05-01 — Build/complete frontend requirement: Provider option/status when enabled.
- [ ] P11-M32-05-02 — Connect the UI to real APIs and remove temporary production-blocking mock data.
- [ ] P11-M32-05-03 — Verify responsive, loading, empty, validation, success and error states.

### Submodule 32.06 — Provider / External Integration

- [ ] P11-M32-06-01 — Integrate and verify: Telnyx.
- [ ] P11-M32-06-02 — Handle provider timeout, unavailable, invalid-response and retry scenarios where applicable.

### Submodule 32.07 — Security / Validation

- [ ] P11-M32-07-01 — Webhook verification.
- [ ] P11-M32-07-02 — Server-side credentials.
- [ ] P11-M32-07-03 — Verify tenant isolation for all tenant-owned records and actions.

### Submodule 32.08 — Testing / QA

- [ ] P11-M32-08-01 — Test: TelephonyProvider contract suite.
- [ ] P11-M32-08-02 — Test: Inbound routing.
- [ ] P11-M32-08-03 — Test: Number provisioning.
- [ ] P11-M32-08-04 — Test: Failure handling.
- [ ] P11-M32-08-05 — Run regression checks for directly affected existing modules.
- [ ] P11-M32-08-06 — Complete manual QA of the end-to-end user journey.

### Submodule 32.09 — Documentation / Operational Readiness

- [ ] P11-M32-09-01 — Update the Master Module Registry status and dependencies.
- [ ] P11-M32-09-02 — Document database/API/provider changes introduced by this module.
- [ ] P11-M32-09-03 — Update environment-variable/example configuration documentation if this module introduces new configuration.

### Submodule 32.10 — Acceptance / Definition of Done

- [ ] P11-M32-10-01 — Requirements approved.
- [ ] P11-M32-10-02 — Database/migrations complete where required.
- [ ] P11-M32-10-03 — Backend/domain logic complete.
- [ ] P11-M32-10-04 — API contracts complete where required.
- [ ] P11-M32-10-05 — Frontend complete where required.
- [ ] P11-M32-10-06 — Real integration complete; no production-blocking mock flow remains.
- [ ] P11-M32-10-07 — Loading/empty/error/validation states complete.
- [ ] P11-M32-10-08 — Security and tenant-isolation checks pass.
- [ ] P11-M32-10-09 — Unit/integration/E2E/manual QA required for this slice pass.
- [ ] P11-M32-10-10 — Documentation updated.
- [ ] P11-M32-10-11 — No unrelated future module was implemented.
- [ ] P11-M32-10-12 — Module accepted and marked Completed before the next module starts.

**Module Gate:** `[M32] Telnyx Telephony Provider = COMPLETE ✅` only after every required checkbox above is verified.

---

# PHASE 12 — Platform Expansion

- [ ] P12-GATE — Phase 12 is complete only when every required module below is accepted.

## Module 33 — Developer / Integration Portal `M33`

**Target:** Future

**Dependencies:** M03, M17, M29

### Submodule 33.01 — Scope & Requirements

- [ ] P12-M33-01-01 — Confirm the objective and boundaries of **Developer / Integration Portal**.
- [ ] P12-M33-01-02 — API keys
- [ ] P12-M33-01-03 — API documentation
- [ ] P12-M33-01-04 — Webhook endpoints
- [ ] P12-M33-01-05 — Webhook secrets
- [ ] P12-M33-01-06 — Webhook logs
- [ ] P12-M33-01-07 — API usage
- [ ] P12-M33-01-08 — Rate limits
- [ ] P12-M33-01-09 — OAuth/service-account foundation
- [ ] P12-M33-01-10 — Sandbox/changelog
- [ ] P12-M33-01-11 — Explicitly document what is out of scope for this module so later-phase work is not pulled forward.

### Submodule 33.02 — Data & Persistence

- [ ] P12-M33-02-01 — Implement/confirm data requirement: `api_keys`.
- [ ] P12-M33-02-02 — Implement/confirm data requirement: `webhook_endpoints`.
- [ ] P12-M33-02-03 — Implement/confirm data requirement: `webhook_deliveries`.
- [ ] P12-M33-02-04 — Implement/confirm data requirement: `developer_apps as approved`.
- [ ] P12-M33-02-05 — Create and test migrations for this module without destructive uncontrolled schema synchronization.
- [ ] P12-M33-02-06 — Confirm organization/business ownership keys and foreign-key behavior for tenant-owned records.

### Submodule 33.03 — Backend / Domain Logic

- [ ] P12-M33-03-01 — Create/update the NestJS module boundaries, services and domain logic for **Developer / Integration Portal**.
- [ ] P12-M33-03-02 — Keep provider-specific implementation outside core business rules wherever the provider abstraction applies.
- [ ] P12-M33-03-03 — Add consistent error handling, logging and retry/idempotency behavior where required.

### Submodule 33.04 — API / Contracts

- [ ] P12-M33-04-01 — Implement/verify API contract: `Public API access management endpoints`.
- [ ] P12-M33-04-02 — Add DTO/schema validation and consistent API error responses.

### Submodule 33.05 — Frontend / UX

- [ ] P12-M33-05-01 — Build/complete frontend requirement: Developer dashboard.
- [ ] P12-M33-05-02 — Build/complete frontend requirement: API key management.
- [ ] P12-M33-05-03 — Build/complete frontend requirement: Webhook configuration/logs.
- [ ] P12-M33-05-04 — Build/complete frontend requirement: Docs navigation.
- [ ] P12-M33-05-05 — Connect the UI to real APIs and remove temporary production-blocking mock data.
- [ ] P12-M33-05-06 — Verify responsive, loading, empty, validation, success and error states.

### Submodule 33.06 — Provider / External Integration

- [ ] P12-M33-06-01 — Confirm this module has no direct external-provider dependency or that dependencies are already abstracted.

### Submodule 33.07 — Security / Validation

- [ ] P12-M33-07-01 — Hashed/revocable API keys.
- [ ] P12-M33-07-02 — Scoped permissions.
- [ ] P12-M33-07-03 — Rate limits.
- [ ] P12-M33-07-04 — Webhook signing.
- [ ] P12-M33-07-05 — Audit.
- [ ] P12-M33-07-06 — Verify tenant isolation for all tenant-owned records and actions.

### Submodule 33.08 — Testing / QA

- [ ] P12-M33-08-01 — Test: Create/revoke key.
- [ ] P12-M33-08-02 — Test: Scope enforcement.
- [ ] P12-M33-08-03 — Test: Webhook signing.
- [ ] P12-M33-08-04 — Test: Rate limit.
- [ ] P12-M33-08-05 — Run regression checks for directly affected existing modules.
- [ ] P12-M33-08-06 — Complete manual QA of the end-to-end user journey.

### Submodule 33.09 — Documentation / Operational Readiness

- [ ] P12-M33-09-01 — Update the Master Module Registry status and dependencies.
- [ ] P12-M33-09-02 — Document database/API/provider changes introduced by this module.
- [ ] P12-M33-09-03 — Update environment-variable/example configuration documentation if this module introduces new configuration.

### Submodule 33.10 — Acceptance / Definition of Done

- [ ] P12-M33-10-01 — Requirements approved.
- [ ] P12-M33-10-02 — Database/migrations complete where required.
- [ ] P12-M33-10-03 — Backend/domain logic complete.
- [ ] P12-M33-10-04 — API contracts complete where required.
- [ ] P12-M33-10-05 — Frontend complete where required.
- [ ] P12-M33-10-06 — Real integration complete; no production-blocking mock flow remains.
- [ ] P12-M33-10-07 — Loading/empty/error/validation states complete.
- [ ] P12-M33-10-08 — Security and tenant-isolation checks pass.
- [ ] P12-M33-10-09 — Unit/integration/E2E/manual QA required for this slice pass.
- [ ] P12-M33-10-10 — Documentation updated.
- [ ] P12-M33-10-11 — No unrelated future module was implemented.
- [ ] P12-M33-10-12 — Module accepted and marked Completed before the next module starts.

**Module Gate:** `[M33] Developer / Integration Portal = COMPLETE ✅` only after every required checkbox above is verified.

## Module 34 — Documentation / Help Center `M34`

**Target:** Future

**Dependencies:** M01

### Submodule 34.01 — Scope & Requirements

- [ ] P12-M34-01-01 — Confirm the objective and boundaries of **Documentation / Help Center**.
- [ ] P12-M34-01-02 — Getting started
- [ ] P12-M34-01-03 — Business setup docs
- [ ] P12-M34-01-04 — Agent setup docs
- [ ] P12-M34-01-05 — Knowledge docs
- [ ] P12-M34-01-06 — Voice/clone docs
- [ ] P12-M34-01-07 — Twilio docs
- [ ] P12-M34-01-08 — Testing/activation
- [ ] P12-M34-01-09 — Calls/analytics
- [ ] P12-M34-01-10 — Automation
- [ ] P12-M34-01-11 — Billing
- [ ] P12-M34-01-12 — Troubleshooting
- [ ] P12-M34-01-13 — FAQ
- [ ] P12-M34-01-14 — Release notes
- [ ] P12-M34-01-15 — Explicitly document what is out of scope for this module so later-phase work is not pulled forward.

### Submodule 34.02 — Data & Persistence

- [ ] P12-M34-02-01 — Implement/confirm data requirement: `Documentation content source/versioning`.
- [ ] P12-M34-02-02 — Create and test migrations for this module without destructive uncontrolled schema synchronization.
- [ ] P12-M34-02-03 — Confirm organization/business ownership keys and foreign-key behavior for tenant-owned records.

### Submodule 34.03 — Backend / Domain Logic

- [ ] P12-M34-03-01 — Create/update the NestJS module boundaries, services and domain logic for **Documentation / Help Center**.
- [ ] P12-M34-03-02 — Keep provider-specific implementation outside core business rules wherever the provider abstraction applies.
- [ ] P12-M34-03-03 — Add consistent error handling, logging and retry/idempotency behavior where required.

### Submodule 34.04 — API / Contracts

- [ ] P12-M34-04-01 — Confirm whether public/customer APIs are required; avoid creating unnecessary endpoints.

### Submodule 34.05 — Frontend / UX

- [ ] P12-M34-05-01 — Build/complete frontend requirement: Searchable help center.
- [ ] P12-M34-05-02 — Build/complete frontend requirement: Article navigation.
- [ ] P12-M34-05-03 — Build/complete frontend requirement: Responsive docs layout.
- [ ] P12-M34-05-04 — Connect the UI to real APIs and remove temporary production-blocking mock data.
- [ ] P12-M34-05-05 — Verify responsive, loading, empty, validation, success and error states.

### Submodule 34.06 — Provider / External Integration

- [ ] P12-M34-06-01 — Integrate and verify: Optional docs/CMS/search platform.
- [ ] P12-M34-06-02 — Handle provider timeout, unavailable, invalid-response and retry scenarios where applicable.

### Submodule 34.07 — Security / Validation

- [ ] P12-M34-07-01 — Do not publish secrets/internal operational details.
- [ ] P12-M34-07-02 — Verify tenant isolation for all tenant-owned records and actions.

### Submodule 34.08 — Testing / QA

- [ ] P12-M34-08-01 — Test: Broken-link check.
- [ ] P12-M34-08-02 — Test: Search/navigation.
- [ ] P12-M34-08-03 — Test: Responsive rendering.
- [ ] P12-M34-08-04 — Run regression checks for directly affected existing modules.
- [ ] P12-M34-08-05 — Complete manual QA of the end-to-end user journey.

### Submodule 34.09 — Documentation / Operational Readiness

- [ ] P12-M34-09-01 — Update the Master Module Registry status and dependencies.
- [ ] P12-M34-09-02 — Document database/API/provider changes introduced by this module.
- [ ] P12-M34-09-03 — Update environment-variable/example configuration documentation if this module introduces new configuration.

### Submodule 34.10 — Acceptance / Definition of Done

- [ ] P12-M34-10-01 — Requirements approved.
- [ ] P12-M34-10-02 — Database/migrations complete where required.
- [ ] P12-M34-10-03 — Backend/domain logic complete.
- [ ] P12-M34-10-04 — API contracts complete where required.
- [ ] P12-M34-10-05 — Frontend complete where required.
- [ ] P12-M34-10-06 — Real integration complete; no production-blocking mock flow remains.
- [ ] P12-M34-10-07 — Loading/empty/error/validation states complete.
- [ ] P12-M34-10-08 — Security and tenant-isolation checks pass.
- [ ] P12-M34-10-09 — Unit/integration/E2E/manual QA required for this slice pass.
- [ ] P12-M34-10-10 — Documentation updated.
- [ ] P12-M34-10-11 — No unrelated future module was implemented.
- [ ] P12-M34-10-12 — Module accepted and marked Completed before the next module starts.

**Module Gate:** `[M34] Documentation / Help Center = COMPLETE ✅` only after every required checkbox above is verified.

## Module 35 — Operations / Support Console `M35`

**Target:** Future

**Dependencies:** M28, M29

### Submodule 35.01 — Scope & Requirements

- [ ] P12-M35-01-01 — Confirm the objective and boundaries of **Operations / Support Console**.
- [ ] P12-M35-01-02 — Live/active calls
- [ ] P12-M35-01-03 — Call failures
- [ ] P12-M35-01-04 — Provider incidents
- [ ] P12-M35-01-05 — Webhook failures
- [ ] P12-M35-01-06 — Queue/worker health
- [ ] P12-M35-01-07 — Agent sync failures
- [ ] P12-M35-01-08 — Knowledge sync failures
- [ ] P12-M35-01-09 — Tool failures
- [ ] P12-M35-01-10 — Latency alerts
- [ ] P12-M35-01-11 — Cost alerts
- [ ] P12-M35-01-12 — Escalations
- [ ] P12-M35-01-13 — Incident timeline
- [ ] P12-M35-01-14 — Explicitly document what is out of scope for this module so later-phase work is not pulled forward.

### Submodule 35.02 — Data & Persistence

- [ ] P12-M35-02-01 — Implement/confirm data requirement: `system_events`.
- [ ] P12-M35-02-02 — Implement/confirm data requirement: `provider_logs`.
- [ ] P12-M35-02-03 — Implement/confirm data requirement: `operational metrics`.
- [ ] P12-M35-02-04 — Create and test migrations for this module without destructive uncontrolled schema synchronization.
- [ ] P12-M35-02-05 — Confirm organization/business ownership keys and foreign-key behavior for tenant-owned records.

### Submodule 35.03 — Backend / Domain Logic

- [ ] P12-M35-03-01 — Create/update the NestJS module boundaries, services and domain logic for **Operations / Support Console**.
- [ ] P12-M35-03-02 — Keep provider-specific implementation outside core business rules wherever the provider abstraction applies.
- [ ] P12-M35-03-03 — Add consistent error handling, logging and retry/idempotency behavior where required.

### Submodule 35.04 — API / Contracts

- [ ] P12-M35-04-01 — Implement/verify API contract: `Admin/ops monitoring endpoints`.
- [ ] P12-M35-04-02 — Implement/verify API contract: `Realtime stream/polling where justified`.
- [ ] P12-M35-04-03 — Add DTO/schema validation and consistent API error responses.

### Submodule 35.05 — Frontend / UX

- [ ] P12-M35-05-01 — Build/complete frontend requirement: Ops dashboard.
- [ ] P12-M35-05-02 — Build/complete frontend requirement: Live calls.
- [ ] P12-M35-05-03 — Build/complete frontend requirement: Incident view.
- [ ] P12-M35-05-04 — Build/complete frontend requirement: Failure queues.
- [ ] P12-M35-05-05 — Build/complete frontend requirement: Retry actions.
- [ ] P12-M35-05-06 — Connect the UI to real APIs and remove temporary production-blocking mock data.
- [ ] P12-M35-05-07 — Verify responsive, loading, empty, validation, success and error states.

### Submodule 35.06 — Provider / External Integration

- [ ] P12-M35-06-01 — Integrate and verify: Monitoring platform.
- [ ] P12-M35-06-02 — Integrate and verify: Queue system.
- [ ] P12-M35-06-03 — Integrate and verify: Providers.
- [ ] P12-M35-06-04 — Handle provider timeout, unavailable, invalid-response and retry scenarios where applicable.

### Submodule 35.07 — Security / Validation

- [ ] P12-M35-07-01 — Ops-only access.
- [ ] P12-M35-07-02 — All remediation actions audited.
- [ ] P12-M35-07-03 — Verify tenant isolation for all tenant-owned records and actions.

### Submodule 35.08 — Testing / QA

- [ ] P12-M35-08-01 — Test: Unauthorized access blocked.
- [ ] P12-M35-08-02 — Test: Alert visibility.
- [ ] P12-M35-08-03 — Test: Retry action audit.
- [ ] P12-M35-08-04 — Test: Live data refresh.
- [ ] P12-M35-08-05 — Run regression checks for directly affected existing modules.
- [ ] P12-M35-08-06 — Complete manual QA of the end-to-end user journey.

### Submodule 35.09 — Documentation / Operational Readiness

- [ ] P12-M35-09-01 — Update the Master Module Registry status and dependencies.
- [ ] P12-M35-09-02 — Document database/API/provider changes introduced by this module.
- [ ] P12-M35-09-03 — Update environment-variable/example configuration documentation if this module introduces new configuration.

### Submodule 35.10 — Acceptance / Definition of Done

- [ ] P12-M35-10-01 — Requirements approved.
- [ ] P12-M35-10-02 — Database/migrations complete where required.
- [ ] P12-M35-10-03 — Backend/domain logic complete.
- [ ] P12-M35-10-04 — API contracts complete where required.
- [ ] P12-M35-10-05 — Frontend complete where required.
- [ ] P12-M35-10-06 — Real integration complete; no production-blocking mock flow remains.
- [ ] P12-M35-10-07 — Loading/empty/error/validation states complete.
- [ ] P12-M35-10-08 — Security and tenant-isolation checks pass.
- [ ] P12-M35-10-09 — Unit/integration/E2E/manual QA required for this slice pass.
- [ ] P12-M35-10-10 — Documentation updated.
- [ ] P12-M35-10-11 — No unrelated future module was implemented.
- [ ] P12-M35-10-12 — Module accepted and marked Completed before the next module starts.

**Module Gate:** `[M35] Operations / Support Console = COMPLETE ✅` only after every required checkbox above is verified.

## Module 36 — Partner / Reseller / White-Label Portal `M36`

**Target:** Future

**Dependencies:** M25, M27, M28

### Submodule 36.01 — Scope & Requirements

- [ ] P12-M36-01-01 — Confirm the objective and boundaries of **Partner / Reseller / White-Label Portal**.
- [ ] P12-M36-01-02 — Partner accounts
- [ ] P12-M36-01-03 — Customer/sub-organization management
- [ ] P12-M36-01-04 — Business/agent provisioning
- [ ] P12-M36-01-05 — Usage
- [ ] P12-M36-01-06 — Wholesale pricing
- [ ] P12-M36-01-07 — Revenue share
- [ ] P12-M36-01-08 — Commissions
- [ ] P12-M36-01-09 — Invoices
- [ ] P12-M36-01-10 — Branding
- [ ] P12-M36-01-11 — Custom domain
- [ ] P12-M36-01-12 — White-label settings
- [ ] P12-M36-01-13 — Partner support/API
- [ ] P12-M36-01-14 — Explicitly document what is out of scope for this module so later-phase work is not pulled forward.

### Submodule 36.02 — Data & Persistence

- [ ] P12-M36-02-01 — Implement/confirm data requirement: `partners`.
- [ ] P12-M36-02-02 — Implement/confirm data requirement: `partner_members`.
- [ ] P12-M36-02-03 — Implement/confirm data requirement: `partner_tenants`.
- [ ] P12-M36-02-04 — Implement/confirm data requirement: `partner_branding`.
- [ ] P12-M36-02-05 — Implement/confirm data requirement: `commission/revenue-share records`.
- [ ] P12-M36-02-06 — Create and test migrations for this module without destructive uncontrolled schema synchronization.
- [ ] P12-M36-02-07 — Confirm organization/business ownership keys and foreign-key behavior for tenant-owned records.

### Submodule 36.03 — Backend / Domain Logic

- [ ] P12-M36-03-01 — Create/update the NestJS module boundaries, services and domain logic for **Partner / Reseller / White-Label Portal**.
- [ ] P12-M36-03-02 — Keep provider-specific implementation outside core business rules wherever the provider abstraction applies.
- [ ] P12-M36-03-03 — Add consistent error handling, logging and retry/idempotency behavior where required.

### Submodule 36.04 — API / Contracts

- [ ] P12-M36-04-01 — Implement/verify API contract: `Partner-scoped account/provisioning/billing endpoints`.
- [ ] P12-M36-04-02 — Add DTO/schema validation and consistent API error responses.

### Submodule 36.05 — Frontend / UX

- [ ] P12-M36-05-01 — Build/complete frontend requirement: Partner dashboard.
- [ ] P12-M36-05-02 — Build/complete frontend requirement: Customer accounts.
- [ ] P12-M36-05-03 — Build/complete frontend requirement: Brand settings.
- [ ] P12-M36-05-04 — Build/complete frontend requirement: Usage/revenue.
- [ ] P12-M36-05-05 — Build/complete frontend requirement: Support.
- [ ] P12-M36-05-06 — Connect the UI to real APIs and remove temporary production-blocking mock data.
- [ ] P12-M36-05-07 — Verify responsive, loading, empty, validation, success and error states.

### Submodule 36.06 — Provider / External Integration

- [ ] P12-M36-06-01 — Integrate and verify: Billing.
- [ ] P12-M36-06-02 — Integrate and verify: Custom domains/email branding.
- [ ] P12-M36-06-03 — Handle provider timeout, unavailable, invalid-response and retry scenarios where applicable.

### Submodule 36.07 — Security / Validation

- [ ] P12-M36-07-01 — Partner cannot access unrelated partners.
- [ ] P12-M36-07-02 — White-label custom-domain verification.
- [ ] P12-M36-07-03 — Financial data permissions.
- [ ] P12-M36-07-04 — Verify tenant isolation for all tenant-owned records and actions.

### Submodule 36.08 — Testing / QA

- [ ] P12-M36-08-01 — Test: Partner creates customer.
- [ ] P12-M36-08-02 — Test: Tenant isolation.
- [ ] P12-M36-08-03 — Test: Branding config.
- [ ] P12-M36-08-04 — Test: Commission/usage visibility.
- [ ] P12-M36-08-05 — Run regression checks for directly affected existing modules.
- [ ] P12-M36-08-06 — Complete manual QA of the end-to-end user journey.

### Submodule 36.09 — Documentation / Operational Readiness

- [ ] P12-M36-09-01 — Update the Master Module Registry status and dependencies.
- [ ] P12-M36-09-02 — Document database/API/provider changes introduced by this module.
- [ ] P12-M36-09-03 — Update environment-variable/example configuration documentation if this module introduces new configuration.

### Submodule 36.10 — Acceptance / Definition of Done

- [ ] P12-M36-10-01 — Requirements approved.
- [ ] P12-M36-10-02 — Database/migrations complete where required.
- [ ] P12-M36-10-03 — Backend/domain logic complete.
- [ ] P12-M36-10-04 — API contracts complete where required.
- [ ] P12-M36-10-05 — Frontend complete where required.
- [ ] P12-M36-10-06 — Real integration complete; no production-blocking mock flow remains.
- [ ] P12-M36-10-07 — Loading/empty/error/validation states complete.
- [ ] P12-M36-10-08 — Security and tenant-isolation checks pass.
- [ ] P12-M36-10-09 — Unit/integration/E2E/manual QA required for this slice pass.
- [ ] P12-M36-10-10 — Documentation updated.
- [ ] P12-M36-10-11 — No unrelated future module was implemented.
- [ ] P12-M36-10-12 — Module accepted and marked Completed before the next module starts.

**Module Gate:** `[M36] Partner / Reseller / White-Label Portal = COMPLETE ✅` only after every required checkbox above is verified.

## Module 37 — Public Status Page `M37`

**Target:** Future

**Dependencies:** M29

### Submodule 37.01 — Scope & Requirements

- [ ] P12-M37-01-01 — Confirm the objective and boundaries of **Public Status Page**.
- [ ] P12-M37-01-02 — Current component status
- [ ] P12-M37-01-03 — Incident history
- [ ] P12-M37-01-04 — Scheduled maintenance
- [ ] P12-M37-01-05 — Provider degradation
- [ ] P12-M37-01-06 — Subscribe to updates
- [ ] P12-M37-01-07 — Explicitly document what is out of scope for this module so later-phase work is not pulled forward.

### Submodule 37.02 — Data & Persistence

- [ ] P12-M37-02-01 — Implement/confirm data requirement: `public incidents/components/subscriptions as required`.
- [ ] P12-M37-02-02 — Create and test migrations for this module without destructive uncontrolled schema synchronization.
- [ ] P12-M37-02-03 — Confirm organization/business ownership keys and foreign-key behavior for tenant-owned records.

### Submodule 37.03 — Backend / Domain Logic

- [ ] P12-M37-03-01 — Create/update the NestJS module boundaries, services and domain logic for **Public Status Page**.
- [ ] P12-M37-03-02 — Keep provider-specific implementation outside core business rules wherever the provider abstraction applies.
- [ ] P12-M37-03-03 — Add consistent error handling, logging and retry/idempotency behavior where required.

### Submodule 37.04 — API / Contracts

- [ ] P12-M37-04-01 — Implement/verify API contract: `Public read-only status endpoint`.
- [ ] P12-M37-04-02 — Implement/verify API contract: `Admin incident management endpoint`.
- [ ] P12-M37-04-03 — Add DTO/schema validation and consistent API error responses.

### Submodule 37.05 — Frontend / UX

- [ ] P12-M37-05-01 — Build/complete frontend requirement: Public status overview.
- [ ] P12-M37-05-02 — Build/complete frontend requirement: Incident detail/history.
- [ ] P12-M37-05-03 — Build/complete frontend requirement: Subscription form.
- [ ] P12-M37-05-04 — Connect the UI to real APIs and remove temporary production-blocking mock data.
- [ ] P12-M37-05-05 — Verify responsive, loading, empty, validation, success and error states.

### Submodule 37.06 — Provider / External Integration

- [ ] P12-M37-06-01 — Integrate and verify: Monitoring/incident system.
- [ ] P12-M37-06-02 — Integrate and verify: Email notification service.
- [ ] P12-M37-06-03 — Handle provider timeout, unavailable, invalid-response and retry scenarios where applicable.

### Submodule 37.07 — Security / Validation

- [ ] P12-M37-07-01 — No sensitive internal diagnostics exposed.
- [ ] P12-M37-07-02 — Verify tenant isolation for all tenant-owned records and actions.

### Submodule 37.08 — Testing / QA

- [ ] P12-M37-08-01 — Test: Public status rendering.
- [ ] P12-M37-08-02 — Test: Incident publish/unpublish.
- [ ] P12-M37-08-03 — Test: Subscription notification.
- [ ] P12-M37-08-04 — Run regression checks for directly affected existing modules.
- [ ] P12-M37-08-05 — Complete manual QA of the end-to-end user journey.

### Submodule 37.09 — Documentation / Operational Readiness

- [ ] P12-M37-09-01 — Update the Master Module Registry status and dependencies.
- [ ] P12-M37-09-02 — Document database/API/provider changes introduced by this module.
- [ ] P12-M37-09-03 — Update environment-variable/example configuration documentation if this module introduces new configuration.

### Submodule 37.10 — Acceptance / Definition of Done

- [ ] P12-M37-10-01 — Requirements approved.
- [ ] P12-M37-10-02 — Database/migrations complete where required.
- [ ] P12-M37-10-03 — Backend/domain logic complete.
- [ ] P12-M37-10-04 — API contracts complete where required.
- [ ] P12-M37-10-05 — Frontend complete where required.
- [ ] P12-M37-10-06 — Real integration complete; no production-blocking mock flow remains.
- [ ] P12-M37-10-07 — Loading/empty/error/validation states complete.
- [ ] P12-M37-10-08 — Security and tenant-isolation checks pass.
- [ ] P12-M37-10-09 — Unit/integration/E2E/manual QA required for this slice pass.
- [ ] P12-M37-10-10 — Documentation updated.
- [ ] P12-M37-10-11 — No unrelated future module was implemented.
- [ ] P12-M37-10-12 — Module accepted and marked Completed before the next module starts.

**Module Gate:** `[M37] Public Status Page = COMPLETE ✅` only after every required checkbox above is verified.

## Module 38 — Business Mobile App `M38`

**Target:** Future

**Dependencies:** M14, M20, M23

### Submodule 38.01 — Scope & Requirements

- [ ] P12-M38-01-01 — Confirm the objective and boundaries of **Business Mobile App**.
- [ ] P12-M38-01-02 — Mobile dashboard
- [ ] P12-M38-01-03 — Call history
- [ ] P12-M38-01-04 — Transcript/summary
- [ ] P12-M38-01-05 — Lead/customer view
- [ ] P12-M38-01-06 — Appointments/reservations
- [ ] P12-M38-01-07 — Escalations
- [ ] P12-M38-01-08 — Agent on/off quick action
- [ ] P12-M38-01-09 — Quick knowledge update
- [ ] P12-M38-01-10 — Notifications
- [ ] P12-M38-01-11 — Usage
- [ ] P12-M38-01-12 — Explicitly document what is out of scope for this module so later-phase work is not pulled forward.

### Submodule 38.02 — Data & Persistence

- [ ] P12-M38-02-01 — Implement/confirm data requirement: `Uses existing SaaS APIs; minimal mobile-specific state`.
- [ ] P12-M38-02-02 — Create and test migrations for this module without destructive uncontrolled schema synchronization.
- [ ] P12-M38-02-03 — Confirm organization/business ownership keys and foreign-key behavior for tenant-owned records.

### Submodule 38.03 — Backend / Domain Logic

- [ ] P12-M38-03-01 — Create/update the NestJS module boundaries, services and domain logic for **Business Mobile App**.
- [ ] P12-M38-03-02 — Keep provider-specific implementation outside core business rules wherever the provider abstraction applies.
- [ ] P12-M38-03-03 — Add consistent error handling, logging and retry/idempotency behavior where required.

### Submodule 38.04 — API / Contracts

- [ ] P12-M38-04-01 — Implement/verify API contract: `Reuse versioned SaaS APIs; add mobile-specific aggregation only if justified`.
- [ ] P12-M38-04-02 — Add DTO/schema validation and consistent API error responses.

### Submodule 38.05 — Frontend / UX

- [ ] P12-M38-05-01 — Build/complete frontend requirement: React Native/Expo mobile navigation.
- [ ] P12-M38-05-02 — Build/complete frontend requirement: Push notification handling.
- [ ] P12-M38-05-03 — Build/complete frontend requirement: Offline/error states.
- [ ] P12-M38-05-04 — Connect the UI to real APIs and remove temporary production-blocking mock data.
- [ ] P12-M38-05-05 — Verify responsive, loading, empty, validation, success and error states.

### Submodule 38.06 — Provider / External Integration

- [ ] P12-M38-06-01 — Integrate and verify: Push notification service.
- [ ] P12-M38-06-02 — Integrate and verify: Same NestJS API.
- [ ] P12-M38-06-03 — Handle provider timeout, unavailable, invalid-response and retry scenarios where applicable.

### Submodule 38.07 — Security / Validation

- [ ] P12-M38-07-01 — Secure mobile token storage.
- [ ] P12-M38-07-02 — Session revocation.
- [ ] P12-M38-07-03 — Device-level permissions.
- [ ] P12-M38-07-04 — Verify tenant isolation for all tenant-owned records and actions.

### Submodule 38.08 — Testing / QA

- [ ] P12-M38-08-01 — Test: iOS/Android auth.
- [ ] P12-M38-08-02 — Test: Push notification.
- [ ] P12-M38-08-03 — Test: Call detail.
- [ ] P12-M38-08-04 — Test: Agent toggle.
- [ ] P12-M38-08-05 — Test: Network failure.
- [ ] P12-M38-08-06 — Run regression checks for directly affected existing modules.
- [ ] P12-M38-08-07 — Complete manual QA of the end-to-end user journey.

### Submodule 38.09 — Documentation / Operational Readiness

- [ ] P12-M38-09-01 — Update the Master Module Registry status and dependencies.
- [ ] P12-M38-09-02 — Document database/API/provider changes introduced by this module.
- [ ] P12-M38-09-03 — Update environment-variable/example configuration documentation if this module introduces new configuration.

### Submodule 38.10 — Acceptance / Definition of Done

- [ ] P12-M38-10-01 — Requirements approved.
- [ ] P12-M38-10-02 — Database/migrations complete where required.
- [ ] P12-M38-10-03 — Backend/domain logic complete.
- [ ] P12-M38-10-04 — API contracts complete where required.
- [ ] P12-M38-10-05 — Frontend complete where required.
- [ ] P12-M38-10-06 — Real integration complete; no production-blocking mock flow remains.
- [ ] P12-M38-10-07 — Loading/empty/error/validation states complete.
- [ ] P12-M38-10-08 — Security and tenant-isolation checks pass.
- [ ] P12-M38-10-09 — Unit/integration/E2E/manual QA required for this slice pass.
- [ ] P12-M38-10-10 — Documentation updated.
- [ ] P12-M38-10-11 — No unrelated future module was implemented.
- [ ] P12-M38-10-12 — Module accepted and marked Completed before the next module starts.

**Module Gate:** `[M38] Business Mobile App = COMPLETE ✅` only after every required checkbox above is verified.

## Module 39 — Embeddable Web Voice / Chat Widget `M39`

**Target:** Future

**Dependencies:** M05, M07, M17

### Submodule 39.01 — Scope & Requirements

- [ ] P12-M39-01-01 — Confirm the objective and boundaries of **Embeddable Web Voice / Chat Widget**.
- [ ] P12-M39-01-02 — Embeddable widget
- [ ] P12-M39-01-03 — Voice mode
- [ ] P12-M39-01-04 — Chat mode
- [ ] P12-M39-01-05 — Voice+chat mode
- [ ] P12-M39-01-06 — Agent/business configuration
- [ ] P12-M39-01-07 — Lead/booking tools
- [ ] P12-M39-01-08 — Theme/config options
- [ ] P12-M39-01-09 — Installation snippet
- [ ] P12-M39-01-10 — Explicitly document what is out of scope for this module so later-phase work is not pulled forward.

### Submodule 39.02 — Data & Persistence

- [ ] P12-M39-02-01 — Implement/confirm data requirement: `widget_configs`.
- [ ] P12-M39-02-02 — Implement/confirm data requirement: `widget_sessions/leads as approved`.
- [ ] P12-M39-02-03 — Create and test migrations for this module without destructive uncontrolled schema synchronization.
- [ ] P12-M39-02-04 — Confirm organization/business ownership keys and foreign-key behavior for tenant-owned records.

### Submodule 39.03 — Backend / Domain Logic

- [ ] P12-M39-03-01 — Create/update the NestJS module boundaries, services and domain logic for **Embeddable Web Voice / Chat Widget**.
- [ ] P12-M39-03-02 — Keep provider-specific implementation outside core business rules wherever the provider abstraction applies.
- [ ] P12-M39-03-03 — Add consistent error handling, logging and retry/idempotency behavior where required.

### Submodule 39.04 — API / Contracts

- [ ] P12-M39-04-01 — Implement/verify API contract: `Public widget session endpoint`.
- [ ] P12-M39-04-02 — Implement/verify API contract: `Secure agent bootstrap/token endpoint`.
- [ ] P12-M39-04-03 — Add DTO/schema validation and consistent API error responses.

### Submodule 39.05 — Frontend / UX

- [ ] P12-M39-05-01 — Build/complete frontend requirement: Compact embeddable widget.
- [ ] P12-M39-05-02 — Build/complete frontend requirement: Launcher.
- [ ] P12-M39-05-03 — Build/complete frontend requirement: Conversation UI.
- [ ] P12-M39-05-04 — Build/complete frontend requirement: Voice controls.
- [ ] P12-M39-05-05 — Connect the UI to real APIs and remove temporary production-blocking mock data.
- [ ] P12-M39-05-06 — Verify responsive, loading, empty, validation, success and error states.

### Submodule 39.06 — Provider / External Integration

- [ ] P12-M39-06-01 — Integrate and verify: VoiceAgentProvider.
- [ ] P12-M39-06-02 — Integrate and verify: Tools.
- [ ] P12-M39-06-03 — Integrate and verify: CDN/static distribution.
- [ ] P12-M39-06-04 — Handle provider timeout, unavailable, invalid-response and retry scenarios where applicable.

### Submodule 39.07 — Security / Validation

- [ ] P12-M39-07-01 — Domain allow-list.
- [ ] P12-M39-07-02 — Short-lived widget tokens.
- [ ] P12-M39-07-03 — Rate limiting.
- [ ] P12-M39-07-04 — No private tenant config exposed.
- [ ] P12-M39-07-05 — Verify tenant isolation for all tenant-owned records and actions.

### Submodule 39.08 — Testing / QA

- [ ] P12-M39-08-01 — Test: Embed on sample site.
- [ ] P12-M39-08-02 — Test: Allowed/disallowed domain.
- [ ] P12-M39-08-03 — Test: Voice/chat session.
- [ ] P12-M39-08-04 — Test: Tool action.
- [ ] P12-M39-08-05 — Test: Mobile responsiveness.
- [ ] P12-M39-08-06 — Run regression checks for directly affected existing modules.
- [ ] P12-M39-08-07 — Complete manual QA of the end-to-end user journey.

### Submodule 39.09 — Documentation / Operational Readiness

- [ ] P12-M39-09-01 — Update the Master Module Registry status and dependencies.
- [ ] P12-M39-09-02 — Document database/API/provider changes introduced by this module.
- [ ] P12-M39-09-03 — Update environment-variable/example configuration documentation if this module introduces new configuration.

### Submodule 39.10 — Acceptance / Definition of Done

- [ ] P12-M39-10-01 — Requirements approved.
- [ ] P12-M39-10-02 — Database/migrations complete where required.
- [ ] P12-M39-10-03 — Backend/domain logic complete.
- [ ] P12-M39-10-04 — API contracts complete where required.
- [ ] P12-M39-10-05 — Frontend complete where required.
- [ ] P12-M39-10-06 — Real integration complete; no production-blocking mock flow remains.
- [ ] P12-M39-10-07 — Loading/empty/error/validation states complete.
- [ ] P12-M39-10-08 — Security and tenant-isolation checks pass.
- [ ] P12-M39-10-09 — Unit/integration/E2E/manual QA required for this slice pass.
- [ ] P12-M39-10-10 — Documentation updated.
- [ ] P12-M39-10-11 — No unrelated future module was implemented.
- [ ] P12-M39-10-12 — Module accepted and marked Completed before the next module starts.

**Module Gate:** `[M39] Embeddable Web Voice / Chat Widget = COMPLETE ✅` only after every required checkbox above is verified.

## Module 40 — Public Demo / Trial Sandbox `M40`

**Target:** Future

**Dependencies:** M01, M05, M07, M08

### Submodule 40.01 — Scope & Requirements

- [ ] P12-M40-01-01 — Confirm the objective and boundaries of **Public Demo / Trial Sandbox**.
- [ ] P12-M40-01-02 — Select demo industry
- [ ] P12-M40-01-03 — Choose demo agent
- [ ] P12-M40-01-04 — Browser voice demo
- [ ] P12-M40-01-05 — Demo phone number flow where used
- [ ] P12-M40-01-06 — Isolated demo knowledge
- [ ] P12-M40-01-07 — Rate limits
- [ ] P12-M40-01-08 — Trial/signup conversion
- [ ] P12-M40-01-09 — Explicitly document what is out of scope for this module so later-phase work is not pulled forward.

### Submodule 40.02 — Data & Persistence

- [ ] P12-M40-02-01 — Implement/confirm data requirement: `demo_agents`.
- [ ] P12-M40-02-02 — Implement/confirm data requirement: `demo_sessions or isolated seeded configuration`.
- [ ] P12-M40-02-03 — Create and test migrations for this module without destructive uncontrolled schema synchronization.
- [ ] P12-M40-02-04 — Confirm organization/business ownership keys and foreign-key behavior for tenant-owned records.

### Submodule 40.03 — Backend / Domain Logic

- [ ] P12-M40-03-01 — Create/update the NestJS module boundaries, services and domain logic for **Public Demo / Trial Sandbox**.
- [ ] P12-M40-03-02 — Keep provider-specific implementation outside core business rules wherever the provider abstraction applies.
- [ ] P12-M40-03-03 — Add consistent error handling, logging and retry/idempotency behavior where required.

### Submodule 40.04 — API / Contracts

- [ ] P12-M40-04-01 — Implement/verify API contract: `Demo session/start endpoints`.
- [ ] P12-M40-04-02 — Implement/verify API contract: `Rate-limit/abuse controls`.
- [ ] P12-M40-04-03 — Add DTO/schema validation and consistent API error responses.

### Submodule 40.05 — Frontend / UX

- [ ] P12-M40-05-01 — Build/complete frontend requirement: Industry selector.
- [ ] P12-M40-05-02 — Build/complete frontend requirement: Demo agent card.
- [ ] P12-M40-05-03 — Build/complete frontend requirement: Browser voice experience.
- [ ] P12-M40-05-04 — Build/complete frontend requirement: CTA to start trial.
- [ ] P12-M40-05-05 — Connect the UI to real APIs and remove temporary production-blocking mock data.
- [ ] P12-M40-05-06 — Verify responsive, loading, empty, validation, success and error states.

### Submodule 40.06 — Provider / External Integration

- [ ] P12-M40-06-01 — Integrate and verify: VoiceAgentProvider.
- [ ] P12-M40-06-02 — Integrate and verify: Marketing website.
- [ ] P12-M40-06-03 — Handle provider timeout, unavailable, invalid-response and retry scenarios where applicable.

### Submodule 40.07 — Security / Validation

- [ ] P12-M40-07-01 — Isolate demo data from customer tenants.
- [ ] P12-M40-07-02 — Aggressive abuse/rate limits.
- [ ] P12-M40-07-03 — No privileged tools.
- [ ] P12-M40-07-04 — Verify tenant isolation for all tenant-owned records and actions.

### Submodule 40.08 — Testing / QA

- [ ] P12-M40-08-01 — Test: Demo session.
- [ ] P12-M40-08-02 — Test: Rate limiting.
- [ ] P12-M40-08-03 — Test: No tenant data exposure.
- [ ] P12-M40-08-04 — Test: Signup handoff.
- [ ] P12-M40-08-05 — Run regression checks for directly affected existing modules.
- [ ] P12-M40-08-06 — Complete manual QA of the end-to-end user journey.

### Submodule 40.09 — Documentation / Operational Readiness

- [ ] P12-M40-09-01 — Update the Master Module Registry status and dependencies.
- [ ] P12-M40-09-02 — Document database/API/provider changes introduced by this module.
- [ ] P12-M40-09-03 — Update environment-variable/example configuration documentation if this module introduces new configuration.

### Submodule 40.10 — Acceptance / Definition of Done

- [ ] P12-M40-10-01 — Requirements approved.
- [ ] P12-M40-10-02 — Database/migrations complete where required.
- [ ] P12-M40-10-03 — Backend/domain logic complete.
- [ ] P12-M40-10-04 — API contracts complete where required.
- [ ] P12-M40-10-05 — Frontend complete where required.
- [ ] P12-M40-10-06 — Real integration complete; no production-blocking mock flow remains.
- [ ] P12-M40-10-07 — Loading/empty/error/validation states complete.
- [ ] P12-M40-10-08 — Security and tenant-isolation checks pass.
- [ ] P12-M40-10-09 — Unit/integration/E2E/manual QA required for this slice pass.
- [ ] P12-M40-10-10 — Documentation updated.
- [ ] P12-M40-10-11 — No unrelated future module was implemented.
- [ ] P12-M40-10-12 — Module accepted and marked Completed before the next module starts.

**Module Gate:** `[M40] Public Demo / Trial Sandbox = COMPLETE ✅` only after every required checkbox above is verified.

---

# Final Execution Order

- [ ] ORDER-01 — M00 Existing Project Audit & SaaS Foundation — Target: MVP — Dependencies: None
- [ ] ORDER-02 — M01 Authentication — Target: MVP — Dependencies: M00
- [ ] ORDER-03 — M02 Organizations / Tenants — Target: MVP — Dependencies: M01
- [ ] ORDER-04 — M03 Users, Team & Roles — Target: MVP — Dependencies: M02
- [ ] ORDER-05 — M04 Business Management — Target: MVP — Dependencies: M02, M03
- [ ] ORDER-06 — M05 AI Agent Management — Target: MVP — Dependencies: M04
- [ ] ORDER-07 — M06 ElevenLabs Voice Agent Provider — Target: MVP — Dependencies: M05
- [ ] ORDER-08 — M07 Knowledge Base — Target: MVP — Dependencies: M05, M06
- [ ] ORDER-09 — M08 Voice Library — Target: MVP — Dependencies: M05, M06
- [ ] ORDER-10 — M09 Voice Cloning — Target: MVP/Premium — Dependencies: M05, M06, M08
- [ ] ORDER-11 — M10 Twilio Telephony Provider — Target: MVP — Dependencies: M00
- [ ] ORDER-12 — M11 Phone Number Management — Target: MVP — Dependencies: M04, M05, M10
- [ ] ORDER-13 — M12 Incoming AI Calls — Target: MVP — Dependencies: M06, M10, M11
- [ ] ORDER-14 — M13 Outbound Calls — Target: Post-MVP — Dependencies: M11, M12
- [ ] ORDER-15 — M14 Call Management — Target: MVP — Dependencies: M12
- [ ] ORDER-16 — M15 Transcript Management — Target: MVP — Dependencies: M12, M14
- [ ] ORDER-17 — M16 Call Summary & Analysis — Target: MVP — Dependencies: M15
- [ ] ORDER-18 — M17 Generic Tool Framework — Target: MVP — Dependencies: M05, M06
- [ ] ORDER-19 — M18 Appointment Booking — Target: Industry — Dependencies: M17
- [ ] ORDER-20 — M19 Restaurant Reservations — Target: Industry — Dependencies: M17
- [ ] ORDER-21 — M20 Customer / CRM — Target: Commercial — Dependencies: M04, M14
- [ ] ORDER-22 — M21 Knowledge Gap Detection — Target: Commercial — Dependencies: M15, M16, M07
- [ ] ORDER-23 — M22 n8n Automation — Target: Commercial — Dependencies: M12
- [ ] ORDER-24 — M23 Notifications — Target: Commercial — Dependencies: M22
- [ ] ORDER-25 — M24 Analytics — Target: Commercial — Dependencies: M14, M16
- [ ] ORDER-26 — M25 Subscription Plans — Target: Commercial — Dependencies: M03
- [ ] ORDER-27 — M26 Usage Metering — Target: Commercial — Dependencies: M12, M25
- [ ] ORDER-28 — M27 Billing — Target: Commercial — Dependencies: M25, M26
- [ ] ORDER-29 — M28 Admin Portal — Target: Commercial — Dependencies: M02, M03, M14, M25, M26, M27
- [ ] ORDER-30 — M29 Security, Audit & Monitoring — Target: Commercial — Dependencies: M28
- [ ] ORDER-31 — M30 Retell Voice Agent Provider — Target: Future — Dependencies: M05, M07, M08, M17
- [ ] ORDER-32 — M31 OpenAI Realtime Provider — Target: Future — Dependencies: M05, M10, M17
- [ ] ORDER-33 — M32 Telnyx Telephony Provider — Target: Future — Dependencies: M10, M11
- [ ] ORDER-34 — M33 Developer / Integration Portal — Target: Future — Dependencies: M03, M17, M29
- [ ] ORDER-35 — M34 Documentation / Help Center — Target: Future — Dependencies: M01
- [ ] ORDER-36 — M35 Operations / Support Console — Target: Future — Dependencies: M28, M29
- [ ] ORDER-37 — M36 Partner / Reseller / White-Label Portal — Target: Future — Dependencies: M25, M27, M28
- [ ] ORDER-38 — M37 Public Status Page — Target: Future — Dependencies: M29
- [ ] ORDER-39 — M38 Business Mobile App — Target: Future — Dependencies: M14, M20, M23
- [ ] ORDER-40 — M39 Embeddable Web Voice / Chat Widget — Target: Future — Dependencies: M05, M07, M17
- [ ] ORDER-41 — M40 Public Demo / Trial Sandbox — Target: Future — Dependencies: M01, M05, M07, M08

## MVP Market-Test Gate

- [ ] MVP-GATE-M00 — M00 Existing Project Audit & SaaS Foundation completed and accepted.
- [ ] MVP-GATE-M01 — M01 Authentication completed and accepted.
- [ ] MVP-GATE-M02 — M02 Organizations / Tenants completed and accepted.
- [ ] MVP-GATE-M03 — M03 Users, Team & Roles completed and accepted.
- [ ] MVP-GATE-M04 — M04 Business Management completed and accepted.
- [ ] MVP-GATE-M05 — M05 AI Agent Management completed and accepted.
- [ ] MVP-GATE-M06 — M06 ElevenLabs Voice Agent Provider completed and accepted.
- [ ] MVP-GATE-M07 — M07 Knowledge Base completed and accepted.
- [ ] MVP-GATE-M08 — M08 Voice Library completed and accepted.
- [ ] MVP-GATE-M09 — M09 Voice Cloning completed and accepted.
- [ ] MVP-GATE-M10 — M10 Twilio Telephony Provider completed and accepted.
- [ ] MVP-GATE-M11 — M11 Phone Number Management completed and accepted.
- [ ] MVP-GATE-M12 — M12 Incoming AI Calls completed and accepted.
- [ ] MVP-GATE-M14 — M14 Call Management completed and accepted.
- [ ] MVP-GATE-M15 — M15 Transcript Management completed and accepted.
- [ ] MVP-GATE-M16 — M16 Call Summary & Analysis completed and accepted.
- [ ] MVP-GATE-M17 — M17 Generic Tool Framework completed and accepted.
- [ ] MVP-GATE-INDUSTRY — At least one industry action slice (M18 Appointment Booking or M19 Restaurant Reservations) is completed if the first pilot requires real booking/reservation actions.
- [ ] MVP-GATE-E2E — Full journey passes: Register → Organization → Business → Agent → Provider Sync → Knowledge → Voice → Phone Number → Test → Activate → Real Call → Call History → Transcript → Summary.

## Commercial Launch Gate

- [ ] COMMERCIAL-GATE-M20 — M20 Customer / CRM completed to the approved launch scope.
- [ ] COMMERCIAL-GATE-M22 — M22 n8n Automation completed to the approved launch scope.
- [ ] COMMERCIAL-GATE-M23 — M23 Notifications completed to the approved launch scope.
- [ ] COMMERCIAL-GATE-M24 — M24 Analytics completed to the approved launch scope.
- [ ] COMMERCIAL-GATE-M25 — M25 Subscription Plans completed to the approved launch scope.
- [ ] COMMERCIAL-GATE-M26 — M26 Usage Metering completed to the approved launch scope.
- [ ] COMMERCIAL-GATE-M27 — M27 Billing completed to the approved launch scope.
- [ ] COMMERCIAL-GATE-M28 — M28 Admin Portal completed to the approved launch scope.
- [ ] COMMERCIAL-GATE-M29 — M29 Security, Audit & Monitoring completed to the approved launch scope.
- [ ] COMMERCIAL-GATE-P1 — Marketing Website launch scope completed.
- [ ] COMMERCIAL-GATE-P6 — Basic Help Center / onboarding documentation available.

## Future Scale Gate

- [ ] FUTURE-GATE-M30 — M30 Retell Voice Agent Provider completed only when business priority justifies it.
- [ ] FUTURE-GATE-M31 — M31 OpenAI Realtime Provider completed only when business priority justifies it.
- [ ] FUTURE-GATE-M32 — M32 Telnyx Telephony Provider completed only when business priority justifies it.
- [ ] FUTURE-GATE-M33 — M33 Developer / Integration Portal completed only when business priority justifies it.
- [ ] FUTURE-GATE-M34 — M34 Documentation / Help Center completed only when business priority justifies it.
- [ ] FUTURE-GATE-M35 — M35 Operations / Support Console completed only when business priority justifies it.
- [ ] FUTURE-GATE-M36 — M36 Partner / Reseller / White-Label Portal completed only when business priority justifies it.
- [ ] FUTURE-GATE-M37 — M37 Public Status Page completed only when business priority justifies it.
- [ ] FUTURE-GATE-M38 — M38 Business Mobile App completed only when business priority justifies it.
- [ ] FUTURE-GATE-M39 — M39 Embeddable Web Voice / Chat Widget completed only when business priority justifies it.
- [ ] FUTURE-GATE-M40 — M40 Public Demo / Trial Sandbox completed only when business priority justifies it.

---

# Vertical Slice Rule — Final Reminder

```text
ONE MODULE
→ Requirements
→ Database
→ Backend
→ API
→ Frontend
→ Integration
→ Security
→ Testing
→ QA
→ Documentation
→ COMPLETE ✅
→ NEXT MODULE
```

Do not mark a module complete because only its API, database, or UI exists. Completion means the approved end-to-end user/business outcome works and has been verified.