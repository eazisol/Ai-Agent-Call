# AI Receptionist SaaS — Vertical Slice Development Roadmap & Master Checklist

**Source:** AI Receptionist SaaS Master Project Specification
**Methodology:** Vertical Slice / Feature-Based Incremental Development
**Rule:** Do not start the next module until the current module passes its acceptance criteria and Definition of Done.

**Roadmap Update v3 (25 August 2026):** Added a mandatory per-module Manual QA Handoff guide under every `XX.05 — Documentation & Acceptance` submodule, plus `VS-GLOBAL-16`. M00–M03 receive this requirement retroactively as documentation backfill.

**Roadmap Update v4 (27 August 2026):** Refined **M07 Knowledge Base**, **M08 Voice Library**, and **M09 Voice Cloning** around the locked ownership model: **Business owns reusable assets; Agents receive assignments/configuration**. No physical duplication of the same knowledge source or cloned voice per agent. Documentation/roadmap refinement only — M07/M08/M09 remain Not Started; no production code, migrations, or APIs from this update.

> Checklist syntax: `- [ ] ID — detailed task`. Change `[ ]` to `[x]` only after the item is verified.

## Streamlined Execution Model — v2

This roadmap keeps all high-level phases/modules and feature-specific checklist requirements, but merges the repeated 10-submodule template into **5 execution submodules per module**:

1. **Scope & Technical Design** — former Scope & Requirements.
2. **Backend, Persistence & API** — former Data & Persistence + Backend / Domain Logic + API / Contracts.
3. **Frontend & Integrations** — former Frontend / UX + Provider / External Integration.
4. **Security & QA** — former Security / Validation + Testing / QA.
5. **Documentation & Acceptance** — former Documentation / Operational Readiness + mandatory Manual QA Handoff guide + final module gate.

**ID rule:** Checklist task IDs align with the 5 execution submodules: `01` Scope & Technical Design, `02` Backend/Persistence/API, `03` Frontend & Integrations, `04` Security & QA, `05` Documentation & Acceptance. Sequence within each submodule is `NN` (01, 02, …). Module gate remains `Pxx-Myy-GATE`.

**Acceptance simplification:** The former repeated `XX.10 — Acceptance / Definition of Done` checklist is no longer duplicated inside every module. Its requirements are enforced by `VS-GLOBAL-01` through `VS-GLOBAL-16` plus the module-specific gate. Historical completed-module acceptance remains preserved, while the Manual QA Handoff requirement introduced in v3 is backfilled as documented below.

**Working rule:** Finish all 5 submodules, create the module-specific Manual QA Handoff guide, and pass the Global Vertical Slice Gate before starting the next module.

## Mandatory Manual QA Handoff Standard — v3

Every module must produce a dedicated **Manual QA Handoff** document during **Submodule `XX.05 — Documentation & Acceptance`**. The purpose is to give a Manual QA Engineer/Tester enough product and technical context to test the completed module independently, reproduce defects clearly, and perform regression checks without having to reverse-engineer the implementation.

**Canonical path:** `docs/module-<number>/M<number>_<Module_Name>_manual-qa-guide.md` (module code + slugified module title; e.g. `docs/module-2/M02_Organizations_Tenants_manual-qa-guide.md`).

The Manual QA Handoff document must be written for a tester and must include, where applicable:

- **Module overview** — what the module is, why it exists, and its role in the EaziAICall product.
- **Delivered scope** — what was actually implemented and what remains explicitly out of scope.
- **Dependencies and prerequisites** — required earlier modules, services, feature flags, environment setup, provider configuration, and safe test-data needs.
- **Roles and permissions** — which roles can view/create/update/delete/execute each relevant action.
- **User-facing surfaces** — routes, pages, forms, dialogs, states, navigation entry points, and responsive expectations.
- **Backend/API surface** — relevant endpoints/contracts and the tester-visible behavior they support; do not expose secrets.
- **Data and integrations** — relevant persisted records, ownership/tenant rules, external providers, async jobs/webhooks, and expected sync/status behavior.
- **End-to-end workflows** — step-by-step happy-path journeys from entry point to successful completion.
- **Negative and edge cases** — invalid data, expired/duplicate actions, provider/network failures, retries, unavailable dependencies, and destructive-action safeguards.
- **Security and tenant-isolation checks** — unauthorized access, role restrictions, cross-tenant access, sensitive-data handling, and provider-secret exposure checks where applicable.
- **UI state coverage** — loading, empty, success, validation, error, processing, disabled, retry, and confirmation states where applicable.
- **Manual test cases** — numbered test cases with Preconditions, Steps, Expected Result, and Pass/Fail/Evidence fields.
- **Regression scope** — previously completed modules and critical flows that must be rechecked because this module can affect them.
- **Known limitations / accepted constraints** — intentional limitations that should not be filed as bugs.
- **Bug-reporting guide** — defect title, environment, severity/priority suggestion, prerequisites, reproducible steps, expected result, actual result, screenshots/video/log evidence, affected role/tenant, and regression impact.
- **QA sign-off checklist** — tester name/date/build or commit reference, test summary, open-blocker count, evidence links, final Pass / Pass with Known Issues / Fail recommendation.

The document must contain **no passwords, tokens, API keys, SMTP credentials, provider secrets, or production-sensitive test data**.

**Acceptance rule:** A module cannot newly pass its final module gate until its Manual QA Handoff guide exists, reflects the final implemented behavior, and is referenced from the module documentation/README where practical.

**Retrospective rule for already-completed modules:** M00–M03 Manual QA Handoff guides were backfilled on 25 August 2026 using the module-named file convention (`M0N_<Module_Name>_manual-qa-guide.md`). M04+ must create their guide during `XX.05 — Documentation & Acceptance` before the module gate passes.

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
- [ ] VS-GLOBAL-16 — Module Manual QA Handoff guide exists at the canonical path, reflects final implemented behavior, and is linked from module documentation where practical.


## Overall Development Phases & Modules

- [x] P00 — **Foundation**
  - [x] M00 — Existing Project Audit & SaaS Foundation (MVP)
- [x] P01 — **SaaS Core**
  - [x] M01 — Authentication (MVP)
  - [x] M02 — Organizations / Tenants (MVP)
  - [x] M03 — Users, Team & Roles (MVP)
  - [x] M04 — Business Management (MVP)
- [ ] P02 — **AI Agent Core**
  - [x] M05 — AI Agent Management (MVP) — COMPLETE 27 August 2026
  - [~] M06 — ElevenLabs Voice Agent Provider (MVP) — 06.01 complete 27 August 2026
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

- [x] P00-GATE — Phase 00 is complete only when every required module below is accepted.


## Module 00 — Existing Project Audit & SaaS Foundation `M00`

**Target:** MVP

**Dependencies:** None


### Submodule 00.01 — Scope & Technical Design

- [x] P00-M00-01-01 — Confirm the objective and boundaries of **Existing Project Audit & SaaS Foundation**.
- [x] P00-M00-01-02 — Create a safe Git checkpoint of the current working repository before architecture changes.
- [x] P00-M00-01-03 — Audit the existing NestJS backend, Next.js frontend, PostgreSQL schema, Docker setup, Twilio integration, OpenAI Realtime code, voice-stream/WebSocket code, n8n integration, dashboard, calls pages and settings.
- [x] P00-M00-01-04 — Classify current files and modules as Keep, Refactor, Move, Park-for-Future or Remove-with-Approval.
- [x] P00-M00-01-05 — Prepare the multi-tenant foundation without rebuilding the project from zero.
- [x] P00-M00-01-06 — Prepare provider-abstraction folders/interfaces for telephony and voice-agent providers.
- [x] P00-M00-01-07 — Establish a migration-first database workflow and remove production dependence on TypeORM synchronize:true.
- [x] P00-M00-01-08 — Validate local and Docker startup for frontend, backend, PostgreSQL and Redis.
- [x] P00-M00-01-09 — Define S3-compatible object-storage configuration and ownership boundaries.
- [x] P00-M00-01-10 — Add health checks, structured error handling and baseline logging.
- [x] P00-M00-01-11 — Document environment-variable strategy for local, development, staging and production.
- [x] P00-M00-01-12 — Explicitly document what is out of scope for this module so later-phase work is not pulled forward.

### Submodule 00.02 — Backend, Persistence & API

- [x] P00-M00-02-01 — Implement/confirm data requirement: `Inventory existing tables and decide which are retained, migrated or extended.`.
- [x] P00-M00-02-02 — Implement/confirm data requirement: `Create migration baseline without destroying existing development data.`.
- [x] P00-M00-02-03 — Implement/confirm data requirement: `Document tenant-key strategy for future organization_id/business_id ownership.`.
- [x] P00-M00-02-04 — Create and test migrations for this module without destructive uncontrolled schema synchronization.
- [x] P00-M00-02-05 — Confirm organization/business ownership keys and foreign-key behavior for tenant-owned records.

- [x] P00-M00-02-06 — Create/update the NestJS module boundaries, services and domain logic for **Existing Project Audit & SaaS Foundation**.
- [x] P00-M00-02-07 — Keep provider-specific implementation outside core business rules wherever the provider abstraction applies.
- [x] P00-M00-02-08 — Add consistent error handling, logging and retry/idempotency behavior where required.

- [x] P00-M00-02-09 — Implement/verify API contract: `Add/verify backend health endpoint.`.
- [x] P00-M00-02-10 — Implement/verify API contract: `Confirm frontend-to-backend base URL strategy for local and containers.`.
- [x] P00-M00-02-11 — Implement/verify API contract: `Document webhook routes already present and routes to preserve.`.
- [x] P00-M00-02-12 — Add DTO/schema validation and consistent API error responses.

### Submodule 00.03 — Frontend & Integrations

- [x] P00-M00-03-01 — Build/complete frontend requirement: Verify existing Dashboard, Calls and Settings routes build successfully..
- [x] P00-M00-03-02 — Build/complete frontend requirement: Document current reusable frontend components and layouts..
- [x] P00-M00-03-03 — Connect the UI to real APIs and remove temporary production-blocking mock data.
- [x] P00-M00-03-04 — Verify responsive, loading, empty, validation, success and error states.

- [x] P00-M00-03-05 — Integrate and verify: Verify PostgreSQL connection..
- [x] P00-M00-03-06 — Integrate and verify: Verify Redis connection..
- [x] P00-M00-03-07 — Integrate and verify: Verify Docker Compose service networking..
- [x] P00-M00-03-08 — Integrate and verify: Preserve Twilio and OpenAI provider code for later refactor..
- [x] P00-M00-03-09 — Handle provider timeout, unavailable, invalid-response and retry scenarios where applicable.

### Submodule 00.04 — Security & QA

- [x] P00-M00-04-01 — Confirm secrets are environment-based and not committed..
- [x] P00-M00-04-02 — Identify unsafe debug/development settings that cannot remain in production..
- [x] P00-M00-04-03 — Verify tenant isolation for all tenant-owned records and actions.

- [x] P00-M00-04-04 — Test: Backend production build succeeds..
- [x] P00-M00-04-05 — Test: Frontend production build succeeds..
- [x] P00-M00-04-06 — Test: Docker stack starts..
- [x] P00-M00-04-07 — Test: Health checks pass..
- [x] P00-M00-04-08 — Test: Existing core call-related functionality is not unintentionally broken..
- [x] P00-M00-04-09 — Run regression checks for directly affected existing modules.
- [x] P00-M00-04-10 — Complete manual QA of the end-to-end user journey.

### Submodule 00.05 — Documentation & Acceptance

- [x] P00-M00-05-01 — Update the Master Module Registry status and dependencies.
- [x] P00-M00-05-02 — Document database/API/provider changes introduced by this module.
- [x] P00-M00-05-03 — Update environment-variable/example configuration documentation if this module introduces new configuration.
- [x] P00-M00-05-04 — Do not add future business features during M00. This is a controlled foundation slice only.
- [x] P00-M00-05-05 — Create/update the **Manual QA Handoff** guide for **Existing Project Audit & SaaS Foundation** at `docs/module-0/M00_Existing_Project_Audit_and_SaaS_Foundation_manual-qa-guide.md`


- [x] P00-M00-GATE — Final acceptance: all module-specific checklist items above are verified, `VS-GLOBAL-01` through `VS-GLOBAL-16` pass, documentation/registry are current, and the module is accepted before the next module starts.

**Module Gate:** `[M00] Existing Project Audit & SaaS Foundation = COMPLETE ✅` — verified 24 August 2026.
---

# PHASE 01 — SaaS Core

- [x] P01-GATE — Phase 01 is complete only when every required module below is accepted.


## Module 01 — Authentication `M01`

**Target:** MVP

**Dependencies:** M00


### Submodule 01.01 — Scope & Technical Design

- [x] P01-M01-01-01 — Confirm the objective and boundaries of **Authentication**.
- [x] P01-M01-01-02 — Register account
- [x] P01-M01-01-03 — Login
- [x] P01-M01-01-04 — Logout
- [x] P01-M01-01-05 — Forgot password
- [x] P01-M01-01-06 — Reset password
- [x] P01-M01-01-07 — Email verification
- [x] P01-M01-01-08 — Current-user session endpoint
- [x] P01-M01-01-09 — Protected routes/session restoration
- [x] P01-M01-01-10 — Explicitly document what is out of scope for this module so later-phase work is not pulled forward.

### Submodule 01.02 — Backend, Persistence & API

- [x] P01-M01-02-01 — Implement/confirm data requirement: `users`.
- [x] P01-M01-02-02 — Implement/confirm data requirement: `sessions or refresh_tokens`.
- [x] P01-M01-02-03 — Implement/confirm data requirement: `email_verification_tokens`.
- [x] P01-M01-02-04 — Implement/confirm data requirement: `password_reset_tokens`.
- [x] P01-M01-02-05 — Create and test migrations for this module without destructive uncontrolled schema synchronization.
- [x] P01-M01-02-06 — Confirm organization/business ownership keys and foreign-key behavior for tenant-owned records.

- [x] P01-M01-02-07 — Create/update the NestJS module boundaries, services and domain logic for **Authentication**.
- [x] P01-M01-02-08 — Keep provider-specific implementation outside core business rules wherever the provider abstraction applies.
- [x] P01-M01-02-09 — Add consistent error handling, logging and retry/idempotency behavior where required.

- [x] P01-M01-02-10 — Implement/verify API contract: `POST /api/v1/auth/register`.
- [x] P01-M01-02-11 — Implement/verify API contract: `POST /api/v1/auth/login`.
- [x] P01-M01-02-12 — Implement/verify API contract: `POST /api/v1/auth/logout`.
- [x] P01-M01-02-13 — Implement/verify API contract: `POST /api/v1/auth/forgot-password`.
- [x] P01-M01-02-14 — Implement/verify API contract: `POST /api/v1/auth/reset-password`.
- [x] P01-M01-02-15 — Implement/verify API contract: `POST /api/v1/auth/verify-email`.
- [x] P01-M01-02-16 — Implement/verify API contract: `GET /api/v1/auth/me`.
- [x] P01-M01-02-17 — Add DTO/schema validation and consistent API error responses.

### Submodule 01.03 — Frontend & Integrations

- [x] P01-M01-03-01 — Build/complete frontend requirement: Register page.
- [x] P01-M01-03-02 — Build/complete frontend requirement: Login page.
- [x] P01-M01-03-03 — Build/complete frontend requirement: Forgot-password page.
- [x] P01-M01-03-04 — Build/complete frontend requirement: Reset-password page.
- [x] P01-M01-03-05 — Build/complete frontend requirement: Email-verification states.
- [x] P01-M01-03-06 — Build/complete frontend requirement: Protected-app redirect/session loading.
- [x] P01-M01-03-07 — Connect the UI to real APIs and remove temporary production-blocking mock data.
- [x] P01-M01-03-08 — Verify responsive, loading, empty, validation, success and error states.

- [x] P01-M01-03-09 — Integrate and verify: Email delivery provider for verification/reset messages when enabled..
- [x] P01-M01-03-10 — Handle provider timeout, unavailable, invalid-response and retry scenarios where applicable.

### Submodule 01.04 — Security & QA

- [x] P01-M01-04-01 — Secure password hashing.
- [x] P01-M01-04-02 — Access/refresh token or session expiry.
- [x] P01-M01-04-03 — Auth rate limiting.
- [x] P01-M01-04-04 — Token invalidation/logout.
- [x] P01-M01-04-05 — No sensitive auth data in client logs.
- [x] P01-M01-04-06 — Verify tenant isolation for all tenant-owned records and actions.

- [x] P01-M01-04-07 — Test: Register→verify→login→protected page→logout E2E.
- [x] P01-M01-04-08 — Test: Duplicate email rejection.
- [x] P01-M01-04-09 — Test: Invalid credentials.
- [x] P01-M01-04-10 — Test: Expired/invalid reset token.
- [x] P01-M01-04-11 — Test: Unauthenticated protected-route rejection.
- [x] P01-M01-04-12 — Run regression checks for directly affected existing modules.
- [x] P01-M01-04-13 — Complete manual QA of the end-to-end user journey.

### Submodule 01.05 — Documentation & Acceptance

- [x] P01-M01-05-01 — Update the Master Module Registry status and dependencies.
- [x] P01-M01-05-02 — Document database/API/provider changes introduced by this module.
- [x] P01-M01-05-03 — Update environment-variable/example configuration documentation if this module introduces new configuration.
- [x] P01-M01-05-04 — Create/update the **Manual QA Handoff** guide for **Authentication** at `docs/module-1/M01_Authentication_manual-qa-guide.md`


- [x] P01-M01-GATE — Final acceptance: all module-specific checklist items above are verified, `VS-GLOBAL-01` through `VS-GLOBAL-16` pass, documentation/registry are current, and the module is accepted before the next module starts.

**Module Gate:** `[M01] Authentication = COMPLETE ✅` — verified 25 August 2026.

## Module 02 — Organizations / Tenants `M02`

**Target:** MVP

**Dependencies:** M01


### Submodule 02.01 — Scope & Technical Design

- [x] P01-M02-01-01 — Confirm the objective and boundaries of **Organizations / Tenants**.
- [x] P01-M02-01-02 — Create organization/workspace
- [x] P01-M02-01-03 — Read organization
- [x] P01-M02-01-04 — Update organization settings
- [x] P01-M02-01-05 — List organizations for current user
- [x] P01-M02-01-06 — Switch active workspace
- [x] P01-M02-01-07 — Organization membership ownership
- [x] P01-M02-01-08 — Tenant isolation
- [x] P01-M02-01-09 — Explicitly document what is out of scope for this module so later-phase work is not pulled forward.

### Submodule 02.02 — Backend, Persistence & API

- [x] P01-M02-02-01 — Implement/confirm data requirement: `organizations`.
- [x] P01-M02-02-02 — Implement/confirm data requirement: `organization_members`.
- [x] P01-M02-02-03 — Create and test migrations for this module without destructive uncontrolled schema synchronization.
- [x] P01-M02-02-04 — Confirm organization/business ownership keys and foreign-key behavior for tenant-owned records.

- [x] P01-M02-02-05 — Create/update the NestJS module boundaries, services and domain logic for **Organizations / Tenants**.
- [x] P01-M02-02-06 — Keep provider-specific implementation outside core business rules wherever the provider abstraction applies.
- [x] P01-M02-02-07 — Add consistent error handling, logging and retry/idempotency behavior where required.

- [x] P01-M02-02-08 — Implement/verify API contract: `POST /api/v1/organizations`.
- [x] P01-M02-02-09 — Implement/verify API contract: `GET /api/v1/organizations`.
- [x] P01-M02-02-10 — Implement/verify API contract: `GET /api/v1/organizations/:id`.
- [x] P01-M02-02-11 — Implement/verify API contract: `PATCH /api/v1/organizations/:id`.
- [x] P01-M02-02-12 — Add DTO/schema validation and consistent API error responses.

### Submodule 02.03 — Frontend & Integrations

- [x] P01-M02-03-01 — Build/complete frontend requirement: Organization creation onboarding.
- [x] P01-M02-03-02 — Build/complete frontend requirement: Workspace selector.
- [x] P01-M02-03-03 — Build/complete frontend requirement: Organization settings page.
- [x] P01-M02-03-04 — Build/complete frontend requirement: No-organization empty state.
- [x] P01-M02-03-05 — Connect the UI to real APIs and remove temporary production-blocking mock data.
- [x] P01-M02-03-06 — Verify responsive, loading, empty, validation, success and error states.

- [x] P01-M02-03-07 — Confirm this module has no direct external-provider dependency or that dependencies are already abstracted.

### Submodule 02.04 — Security & QA

- [x] P01-M02-04-01 — Every organization query scoped to authenticated membership.
- [x] P01-M02-04-02 — Cross-tenant access denied.
- [x] P01-M02-04-03 — Owner-only settings protected where applicable.
- [x] P01-M02-04-04 — Verify tenant isolation for all tenant-owned records and actions.

- [x] P01-M02-04-05 — Test: User creates first organization.
- [x] P01-M02-04-06 — Test: Member can access own tenant.
- [x] P01-M02-04-07 — Test: Organization A cannot read/update Organization B.
- [x] P01-M02-04-08 — Test: Workspace switching preserves isolation.
- [x] P01-M02-04-09 — Run regression checks for directly affected existing modules.
- [x] P01-M02-04-10 — Complete manual QA of the end-to-end user journey.

### Submodule 02.05 — Documentation & Acceptance

- [x] P01-M02-05-01 — Update the Master Module Registry status and dependencies.
- [x] P01-M02-05-02 — Document database/API/provider changes introduced by this module.
- [x] P01-M02-05-03 — Update environment-variable/example configuration documentation if this module introduces new configuration.
- [x] P01-M02-05-04 — Create/update the **Manual QA Handoff** guide for **Organizations / Tenants** at `docs/module-2/M02_Organizations_Tenants_manual-qa-guide.md`


- [x] P01-M02-GATE — Final acceptance: all module-specific checklist items above are verified, `VS-GLOBAL-01` through `VS-GLOBAL-16` pass, documentation/registry are current, and the module is accepted before the next module starts.

**Module Gate:** `[M02] Organizations / Tenants = COMPLETE ✅` — verified 25 August 2026.

## Module 03 — Users, Team & Roles `M03`

**Target:** MVP

**Dependencies:** M01, M02


### Submodule 03.01 — Scope & Technical Design

- [x] P01-M03-01-01 — Confirm the objective and boundaries of **Users, Team & Roles**.
- [x] P01-M03-01-02 — Invite team member
- [x] P01-M03-01-03 — Accept invitation
- [x] P01-M03-01-04 — List members
- [x] P01-M03-01-05 — Owner/Admin/Manager/Viewer roles
- [x] P01-M03-01-06 — Change role
- [x] P01-M03-01-07 — Remove member
- [x] P01-M03-01-08 — Pending invitations
- [x] P01-M03-01-09 — RBAC permission checks
- [x] P01-M03-01-10 — Explicitly document what is out of scope for this module so later-phase work is not pulled forward.

### Submodule 03.02 — Backend, Persistence & API

- [x] P01-M03-02-01 — Implement/confirm data requirement: `organization_members`.
- [x] P01-M03-02-02 — Implement/confirm data requirement: `invitations`.
- [x] P01-M03-02-03 — Implement/confirm data requirement: `roles/permission mapping if persisted`.
- [x] P01-M03-02-04 — Create and test migrations for this module without destructive uncontrolled schema synchronization.
- [x] P01-M03-02-05 — Confirm organization/business ownership keys and foreign-key behavior for tenant-owned records.

- [x] P01-M03-02-06 — Create/update the NestJS module boundaries, services and domain logic for **Users, Team & Roles**.
- [x] P01-M03-02-07 — Keep provider-specific implementation outside core business rules wherever the provider abstraction applies.
- [x] P01-M03-02-08 — Add consistent error handling, logging and retry/idempotency behavior where required.

- [x] P01-M03-02-09 — Implement/verify API contract: `GET /api/v1/organizations/:id/members`.
- [x] P01-M03-02-10 — Implement/verify API contract: `POST /api/v1/organizations/:id/invitations`.
- [x] P01-M03-02-11 — Implement/verify API contract: `PATCH /api/v1/organizations/:id/members/:memberId`.
- [x] P01-M03-02-12 — Implement/verify API contract: `DELETE /api/v1/organizations/:id/members/:memberId`.
- [x] P01-M03-02-13 — Add DTO/schema validation and consistent API error responses.

### Submodule 03.03 — Frontend & Integrations

- [x] P01-M03-03-01 — Build/complete frontend requirement: Team list.
- [x] P01-M03-03-02 — Build/complete frontend requirement: Invite-member modal/page.
- [x] P01-M03-03-03 — Build/complete frontend requirement: Pending invitations.
- [x] P01-M03-03-04 — Build/complete frontend requirement: Role selector.
- [x] P01-M03-03-05 — Build/complete frontend requirement: Remove-member confirmation.
- [x] P01-M03-03-06 — Connect the UI to real APIs and remove temporary production-blocking mock data.
- [x] P01-M03-03-07 — Verify responsive, loading, empty, validation, success and error states.

- [x] P01-M03-03-08 — Integrate and verify: Email invitation delivery..
- [x] P01-M03-03-09 — Handle provider timeout, unavailable, invalid-response and retry scenarios where applicable.

### Submodule 03.04 — Security & QA

- [x] P01-M03-04-01 — Prevent privilege escalation.
- [x] P01-M03-04-02 — Prevent removing final owner without ownership transfer flow.
- [x] P01-M03-04-03 — Tenant-scoped membership checks.
- [x] P01-M03-04-04 — Verify tenant isolation for all tenant-owned records and actions.

- [x] P01-M03-04-05 — Test: Owner invites member.
- [x] P01-M03-04-06 — Test: Invite accepted.
- [x] P01-M03-04-07 — Test: Role enforcement.
- [x] P01-M03-04-08 — Test: Unauthorized role change blocked.
- [x] P01-M03-04-09 — Test: Removed member loses tenant access.
- [x] P01-M03-04-10 — Run regression checks for directly affected existing modules.
- [x] P01-M03-04-11 — Complete manual QA of the end-to-end user journey.

### Submodule 03.05 — Documentation & Acceptance

- [x] P01-M03-05-01 — Update the Master Module Registry status and dependencies.
- [x] P01-M03-05-02 — Document database/API/provider changes introduced by this module.
- [x] P01-M03-05-03 — Update environment-variable/example configuration documentation if this module introduces new configuration.
- [x] P01-M03-05-04 — Create/update the **Manual QA Handoff** guide for **Users, Team & Roles** at `docs/module-3/M03_Users_Team_and_Roles_manual-qa-guide.md`


- [x] P01-M03-GATE — Final acceptance: all module-specific checklist items above are verified, `VS-GLOBAL-01` through `VS-GLOBAL-16` pass, documentation/registry are current, and the module is accepted before the next module starts.

**Module Gate:** `[M03] Users, Team & Roles = COMPLETE ✅` — verified 25 August 2026.

## Module 04 — Business Management `M04`

**Target:** MVP

**Dependencies:** M02, M03


### Submodule 04.01 — Scope & Technical Design

- [x] P01-M04-01-01 — Confirm the objective and boundaries of **Business Management**.
- [x] P01-M04-01-02 — List businesses
- [x] P01-M04-01-03 — Create business
- [x] P01-M04-01-04 — View business
- [x] P01-M04-01-05 — Update business
- [x] P01-M04-01-06 — Archive/delete according to policy
- [x] P01-M04-01-07 — Industry selection
- [x] P01-M04-01-08 — Contact information
- [x] P01-M04-01-09 — Business hours
- [x] P01-M04-01-10 — Timezone
- [x] P01-M04-01-11 — Default language
- [x] P01-M04-01-12 — Business status/settings
- [x] P01-M04-01-13 — Explicitly document what is out of scope for this module so later-phase work is not pulled forward.

### Submodule 04.02 — Backend, Persistence & API

- [x] P01-M04-02-01 — Implement/confirm data requirement: `businesses`.
- [x] P01-M04-02-02 — Implement/confirm data requirement: `business_settings`.
- [x] P01-M04-02-03 — Implement/confirm data requirement: `business_hours`.
- [x] P01-M04-02-04 — Create and test migrations for this module without destructive uncontrolled schema synchronization.
- [x] P01-M04-02-05 — Confirm organization/business ownership keys and foreign-key behavior for tenant-owned records.

- [x] P01-M04-02-06 — Create/update the NestJS module boundaries, services and domain logic for **Business Management**.
- [x] P01-M04-02-07 — Keep provider-specific implementation outside core business rules wherever the provider abstraction applies.
- [x] P01-M04-02-08 — Add consistent error handling, logging and retry/idempotency behavior where required.

- [x] P01-M04-02-09 — Implement/verify API contract: `POST /api/v1/businesses`.
- [x] P01-M04-02-10 — Implement/verify API contract: `GET /api/v1/businesses`.
- [x] P01-M04-02-11 — Implement/verify API contract: `GET /api/v1/businesses/:id`.
- [x] P01-M04-02-12 — Implement/verify API contract: `PATCH /api/v1/businesses/:id`.
- [x] P01-M04-02-13 — Implement/verify API contract: `DELETE or archive /api/v1/businesses/:id`.
- [x] P01-M04-02-14 — Add DTO/schema validation and consistent API error responses.

### Submodule 04.03 — Frontend & Integrations

- [x] P01-M04-03-01 — Build/complete frontend requirement: Business list.
- [x] P01-M04-03-02 — Build/complete frontend requirement: Create-business flow.
- [x] P01-M04-03-03 — Build/complete frontend requirement: Business details.
- [x] P01-M04-03-04 — Build/complete frontend requirement: Business settings.
- [x] P01-M04-03-05 — Build/complete frontend requirement: Business-hours editor.
- [x] P01-M04-03-06 — Build/complete frontend requirement: Empty/loading/error states.
- [x] P01-M04-03-07 — Connect the UI to real APIs and remove temporary production-blocking mock data.
- [x] P01-M04-03-08 — Verify responsive, loading, empty, validation, success and error states.

- [x] P01-M04-03-09 — Confirm this module has no direct external-provider dependency or that dependencies are already abstracted.

### Submodule 04.04 — Security & QA

- [x] P01-M04-04-01 — Organization-scoped business access.
- [x] P01-M04-04-02 — Role-based create/update/archive rights.
- [x] P01-M04-04-03 — Verify tenant isolation for all tenant-owned records and actions.

- [x] P01-M04-04-04 — Test: Business CRUD within tenant.
- [x] P01-M04-04-05 — Test: Invalid timezone/hours validation.
- [x] P01-M04-04-06 — Test: Cross-tenant business access blocked.
- [x] P01-M04-04-07 — Run regression checks for directly affected existing modules.
- [x] P01-M04-04-08 — Complete manual QA of the end-to-end user journey.

### Submodule 04.05 — Documentation & Acceptance

- [x] P01-M04-05-01 — Update the Master Module Registry status and dependencies.
- [x] P01-M04-05-02 — Document database/API/provider changes introduced by this module.
- [x] P01-M04-05-03 — Update environment-variable/example configuration documentation if this module introduces new configuration.
- [x] P01-M04-05-04 — Create/update the **Manual QA Handoff** guide for **Business Management** at `docs/module-4/M04_Business_Management_manual-qa-guide.md`


- [x] P01-M04-GATE — Final acceptance: all module-specific checklist items above are verified, `VS-GLOBAL-01` through `VS-GLOBAL-16` pass, documentation/registry are current, and the module is accepted before the next module starts.

**Module Gate:** `[M04] Business Management = COMPLETE ✅` — verified 27 August 2026.
---

# PHASE 02 — AI Agent Core

- [ ] P02-GATE — Phase 02 is complete only when every required module below is accepted.


## Module 05 — AI Agent Management `M05`

**Target:** MVP

**Dependencies:** M04


### Submodule 05.01 — Scope & Technical Design

- [x] P02-M05-01-01 — Confirm the objective and boundaries of **AI Agent Management**.
- [x] P02-M05-01-02 — List agents
- [x] P02-M05-01-03 — Create agent
- [x] P02-M05-01-04 — View agent
- [x] P02-M05-01-05 — Update agent
- [x] P02-M05-01-06 — Archive/delete agent
- [x] P02-M05-01-07 — Set role/personality
- [x] P02-M05-01-08 — Set greeting
- [x] P02-M05-01-09 — Set language
- [x] P02-M05-01-10 — Set instructions/prompts
- [x] P02-M05-01-11 — Set escalation rules
- [x] P02-M05-01-12 — Activate/deactivate
- [x] P02-M05-01-13 — Explicitly document what is out of scope for this module so later-phase work is not pulled forward.

**05.01 note:** Scope locked in `docs/module-5/scope-and-requirements.md` (27 August 2026).

### Submodule 05.02 — Backend, Persistence & API

- [x] P02-M05-02-01 — Implement/confirm data requirement: `agents`.
- [x] P02-M05-02-02 — Implement/confirm data requirement: `agent_configs`.
- [x] P02-M05-02-03 — Implement/confirm data requirement: `agent_prompts`.
- [x] P02-M05-02-04 — Implement/confirm data requirement: `agent_provider_mappings`.
- [x] P02-M05-02-05 — Create and test migrations for this module without destructive uncontrolled schema synchronization.
- [x] P02-M05-02-06 — Confirm organization/business ownership keys and foreign-key behavior for tenant-owned records.

- [x] P02-M05-02-07 — Create/update the NestJS module boundaries, services and domain logic for **AI Agent Management**.
- [x] P02-M05-02-08 — Keep provider-specific implementation outside core business rules wherever the provider abstraction applies.
- [x] P02-M05-02-09 — Add consistent error handling, logging and retry/idempotency behavior where required.

- [x] P02-M05-02-10 — Implement/verify API contract: `POST /api/v1/agents`.
- [x] P02-M05-02-11 — Implement/verify API contract: `GET /api/v1/agents`.
- [x] P02-M05-02-12 — Implement/verify API contract: `GET /api/v1/agents/:id`.
- [x] P02-M05-02-13 — Implement/verify API contract: `PATCH /api/v1/agents/:id`.
- [x] P02-M05-02-14 — Implement/verify API contract: `POST /api/v1/agents/:id/activate`.
- [x] P02-M05-02-15 — Implement/verify API contract: `POST /api/v1/agents/:id/deactivate`.
- [x] P02-M05-02-16 — Add DTO/schema validation and consistent API error responses.

**05.02 note:** Backend delivered 27 August 2026 — migration `AiAgentManagement1756080000000`, Nest `AgentsModule`, unit + e2e tests.

### Submodule 05.03 — Frontend & Integrations

- [x] P02-M05-03-01 — Build/complete frontend requirement: Agent list.
- [x] P02-M05-03-02 — Build/complete frontend requirement: Create-agent wizard.
- [x] P02-M05-03-03 — Build/complete frontend requirement: Agent details.
- [x] P02-M05-03-04 — Build/complete frontend requirement: Behavior/instructions editor.
- [x] P02-M05-03-05 — Build/complete frontend requirement: Escalation settings.
- [x] P02-M05-03-06 — Build/complete frontend requirement: Activation status.
- [x] P02-M05-03-07 — Connect the UI to real APIs and remove temporary production-blocking mock data.
- [x] P02-M05-03-08 — Verify responsive, loading, empty, validation, success and error states.

- [x] P02-M05-03-09 — Confirm this module has no direct external-provider dependency or that dependencies are already abstracted.

**05.03 note:** Agents portal delivered 27 August 2026 — `/agents*` routes, `agents-api.ts`, language/voice fields, nav enabled; no provider calls.

### Submodule 05.04 — Security & QA

- [x] P02-M05-04-01 — Business/organization ownership checks.
- [x] P02-M05-04-02 — Role-based agent management.
- [x] P02-M05-04-03 — Verify tenant isolation for all tenant-owned records and actions.

- [x] P02-M05-04-04 — Test: Create agent under correct business.
- [x] P02-M05-04-05 — Test: Update behavior.
- [x] P02-M05-04-06 — Test: Activation/deactivation.
- [x] P02-M05-04-07 — Test: Cross-tenant access blocked.
- [x] P02-M05-04-08 — Run regression checks for directly affected existing modules.
- [x] P02-M05-04-09 — Complete manual QA of the end-to-end user journey.

**05.04 note:** Evidence in `docs/module-5/security-and-qa.md` — 27 August 2026 (typecheck + 74 unit / 35 e2e; FE typecheck).

### Submodule 05.05 — Documentation & Acceptance

- [x] P02-M05-05-01 — Update the Master Module Registry status and dependencies.
- [x] P02-M05-05-02 — Document database/API/provider changes introduced by this module.
- [x] P02-M05-05-03 — Update environment-variable/example configuration documentation if this module introduces new configuration.
- [x] P02-M05-05-04 — Create/update the **Manual QA Handoff** guide for **AI Agent Management** at `docs/module-5/M05_AI_Agent_Management_manual-qa-guide.md` (or the repository's canonical equivalent). It must explain what the module is, its role in the project, delivered scope, roles/permissions, routes/APIs, data/integrations, complete user workflows, prerequisites/test data, happy/negative/edge/security/tenant test cases, expected results, regression scope, known limitations, bug-reporting requirements, evidence expectations, and QA sign-off checklist.


- [x] P02-M05-GATE — Final acceptance: all module-specific checklist items above are verified, `VS-GLOBAL-01` through `VS-GLOBAL-16` pass, documentation/registry are current, and the module is accepted before the next module starts.

**Module Gate:** `[M05] AI Agent Management = COMPLETE ✅` — verified 27 August 2026.

## Module 06 — ElevenLabs Voice Agent Provider `M06`

**Target:** MVP

**Dependencies:** M05


### Submodule 06.01 — Scope & Technical Design

- [x] P02-M06-01-01 — Confirm the objective and boundaries of **ElevenLabs Voice Agent Provider**.
- [x] P02-M06-01-02 — Implement VoiceAgentProvider contract
- [x] P02-M06-01-03 — Create ElevenLabs agent
- [x] P02-M06-01-04 — Update ElevenLabs agent
- [x] P02-M06-01-05 — Delete/deactivate provider agent
- [x] P02-M06-01-06 — Fetch provider status
- [x] P02-M06-01-07 — Store provider mapping
- [x] P02-M06-01-08 — Retry failed sync
- [x] P02-M06-01-09 — Normalize provider errors
- [x] P02-M06-01-10 — Explicitly document what is out of scope for this module so later-phase work is not pulled forward.

**06.01 note:** Scope locked in `docs/module-6/scope-and-requirements.md` (27 August 2026). Sync port split from realtime WebSocket port; no live ElevenLabs calls in 06.01.

### Submodule 06.02 — Backend, Persistence & API

- [x] P02-M06-02-01 — Implement/confirm data requirement: `agent_provider_mappings`.
- [x] P02-M06-02-02 — Implement/confirm data requirement: `provider_logs or sync metadata`.
- [x] P02-M06-02-03 — Create and test migrations for this module without destructive uncontrolled schema synchronization.
- [x] P02-M06-02-04 — Confirm organization/business ownership keys and foreign-key behavior for tenant-owned records.

- [x] P02-M06-02-05 — Create/update the NestJS module boundaries, services and domain logic for **ElevenLabs Voice Agent Provider**.
- [x] P02-M06-02-06 — Keep provider-specific implementation outside core business rules wherever the provider abstraction applies.
- [x] P02-M06-02-07 — Add consistent error handling, logging and retry/idempotency behavior where required.

- [x] P02-M06-02-08 — Implement/verify API contract: `Internal provider service methods`.
- [x] P02-M06-02-09 — Implement/verify API contract: `Optional POST /api/v1/agents/:id/sync`.
- [x] P02-M06-02-10 — Implement/verify API contract: `Optional GET /api/v1/agents/:id/provider-status`.
- [x] P02-M06-02-11 — Add DTO/schema validation and consistent API error responses.

> **06.02 note (27 August 2026):** Mapping-only MVP (no `provider_sync_logs`). Reuses M05 `agent_provider_mappings`. `VoiceAgentSyncPort` + ElevenLabs ConvAI adapter; explicit sync endpoints; env `ELEVENLABS_*` optional at boot; unit + e2e coverage. Docs under `docs/module-6/`.

### Submodule 06.03 — Frontend & Integrations

- [x] P02-M06-03-01 — Build/complete frontend requirement: Provider sync status on agent page.
- [x] P02-M06-03-02 — Build/complete frontend requirement: Sync/retry action.
- [x] P02-M06-03-03 — Build/complete frontend requirement: Provider error state without exposing secrets.
- [x] P02-M06-03-04 — Connect the UI to real APIs and remove temporary production-blocking mock data.
- [x] P02-M06-03-05 — Verify responsive, loading, empty, validation, success and error states.

- [x] P02-M06-03-06 — Integrate and verify: ElevenLabs API.
- [x] P02-M06-03-07 — Handle provider timeout, unavailable, invalid-response and retry scenarios where applicable.

> **06.03 note (27 August 2026):** Agent overview `AgentProviderSyncPanel` + list Provider column. Real `sync` / `provider-status` APIs; Sync/Retry for update roles; sanitized errors + warnings; no ElevenLabs keys in browser. Frontend typecheck clean.

### Submodule 06.04 — Security & QA

- [x] P02-M06-04-01 — Provider API key stored server-side only.
- [x] P02-M06-04-02 — No provider credentials in browser.
- [x] P02-M06-04-03 — Sanitize provider error payloads.
- [x] P02-M06-04-04 — Verify tenant isolation for all tenant-owned records and actions.

- [x] P02-M06-04-05 — Test: Create local agent then provider agent.
- [x] P02-M06-04-06 — Test: Update sync.
- [x] P02-M06-04-07 — Test: Failed provider call records safe error.
- [x] P02-M06-04-08 — Test: Retry succeeds.
- [x] P02-M06-04-09 — Test: Mapping persists.
- [x] P02-M06-04-10 — Run regression checks for directly affected existing modules.
- [x] P02-M06-04-11 — Complete manual QA of the end-to-end user journey.

> **06.04 note (27 August 2026):** Key server-side only; scrubbed accidental key from `.env.example`. No FE credentials. Sanitized errors + tenant isolation verified. Unit/e2e + FE typecheck regression pass. Evidence: `docs/module-6/security-and-qa.md`. Manual journey cases in QA guide (human QA sign-off).

**Rotate note:** If an ElevenLabs key was ever pasted into a committed `.env.example`, rotate that key in the ElevenLabs dashboard.

### Submodule 06.05 — Documentation & Acceptance

- [x] P02-M06-05-01 — Update the Master Module Registry status and dependencies.
- [x] P02-M06-05-02 — Document database/API/provider changes introduced by this module.
- [x] P02-M06-05-03 — Update environment-variable/example configuration documentation if this module introduces new configuration.
- [x] P02-M06-05-04 — Create/update the **Manual QA Handoff** guide for **ElevenLabs Voice Agent Provider** at `docs/module-6/M06_ElevenLabs_Voice_Agent_Provider_manual-qa-guide.md` (or the repository's canonical equivalent). It must explain what the module is, its role in the project, delivered scope, roles/permissions, routes/APIs, data/integrations, complete user workflows, prerequisites/test data, happy/negative/edge/security/tenant test cases, expected results, regression scope, known limitations, bug-reporting requirements, evidence expectations, and QA sign-off checklist.

- [x] P02-M06-GATE — Final acceptance: all module-specific checklist items above are verified, `VS-GLOBAL-01` through `VS-GLOBAL-16` pass, documentation/registry are current, and the module is accepted before the next module starts.

**Module Gate:** `[M06] ElevenLabs Voice Agent Provider = COMPLETE` — verified 27 August 2026 (06.01–06.05).
---

# PHASE 03 — Knowledge & Voice

- [ ] P03-GATE — Phase 03 is complete only when every required module below is accepted.

### Phase 03 Architecture Lock — Shared Business Assets + Per-Agent Assignment (v4)

**Canonical ownership model (locked for M07 / M08 / M09):**

```text
Organization
  ↓
Business
  ├── Shared Knowledge Assets
  ├── Shared Voice Library
  ├── Shared Cloned Voices
  │
  └── Agents
       ├── Agent A → assigned knowledge + selected voice
       ├── Agent B → assigned knowledge + selected voice
       └── Agent C → assigned knowledge + selected voice
```

**Core principle:** Business owns reusable assets. Agents receive assignments / configuration. Do **not** physically duplicate the same knowledge source or cloned voice for every agent.

**Agent is a consumer/configuration target.** Knowledge and voices are reusable Business assets.

```text
Business
├── Knowledge Sources
├── Voice Assets
├── Voice Clones
└── Agents

Assignments:
Agent
├── agent_knowledge_sources → many knowledge sources
└── agent_voice_config → selected voice (normally one active voice)
```

**Cardinality:**

| Relationship | Rule |
| --- | --- |
| One agent → knowledge sources | many (assignment mapping) |
| One agent → active voice | normally one selected voice at a time |
| One knowledge source → agents | many (same Business) |
| One voice / cloned voice → agents | many (same Business, authorized) |

**Example (ABC Dental):** Shared knowledge (Clinic Hours, Services, Pricing, Insurance FAQ, Emergency Policy) and shared voices (Sarah, James, Owner Custom Clone) live once on the Business. Receptionist, Appointment, and After-hours agents each receive a subset of sources and one selected voice — FAQ and Owner Custom Clone exist once and are reused.

**Global ownership rules (apply to M07, M08, M09):**

- Reusable assets are scoped to **Business** (Business already belongs to Organization).
- Tenant ownership must remain **derivable through Business**; do not duplicate `organization_id` where Business ownership already safely defines tenant ownership unless the existing architecture genuinely requires it.
- Every asset must be inaccessible across unrelated businesses/organizations.
- Agents may only use assets belonging to their own Business.
- One asset may be assigned to multiple agents within the same Business.
- Deleting/unassigning an asset from one agent must **not** delete it for other agents.
- Destructive deletion of a shared asset must account for active agent assignments (detect, confirm, block until unassigned, or follow an explicit safe reassignment/unassignment flow).
- Provider mappings remain implementation details behind EaziAICall canonical records.

**ElevenLabs / provider boundary:**

- EaziAICall PostgreSQL remains the **source of truth**.
- ElevenLabs (and future providers) are external adapters.
- Knowledge: EaziAICall source → provider sync/mapping.
- Voice: EaziAICall voice reference → provider voice mapping.
- Cloned voice: EaziAICall canonical clone record → provider clone ID.
- Prefer provider-neutral mapping/config concepts; do **not** hardcode core schemas around `elevenlabs_voice_id` / `elevenlabs_knowledge_id`.
- Provider deletion/failure must not silently corrupt canonical application records.
- M07/M08/M09 must remain usable with ElevenLabs, Retell, OpenAI/custom, and other future providers.

**Languages relation (align M04/M05):**

- Business → supported languages; Agent → single-language or multilingual subset.
- Voice selection should validate compatibility with agent languages, provider model, selected voice, and provider capabilities where applicable.
- Knowledge source reuse is not dependent on one language unless a source itself has language metadata or translation behavior.
- Do **not** start translation/localization functionality in M07–M09 unless explicitly defined later.


## Module 07 — Knowledge Base `M07`

**Target:** MVP

**Dependencies:** M05, M06

**Status:** Not Started — roadmap refined 27 August 2026 for Business-owned shared knowledge + per-agent assignment. Do not mark In Development or Complete until implementation begins and gates pass.

**Architecture (locked):** Business-owned shared knowledge assets + per-agent knowledge assignments. A Business may own Clinic Hours, Pricing, FAQ, Policies once; Agent A may receive Hours + FAQ while Agent B receives Pricing + FAQ — the FAQ exists once and is reusable.


### Submodule 07.01 — Scope & Technical Design

- [ ] P03-M07-01-01 — Confirm the objective and boundaries of **Knowledge Base** as **Business-owned shared knowledge assets + per-agent knowledge assignments** (Agent is consumer; do not require duplicate uploads per agent).
- [ ] P03-M07-01-02 — Upload file as a **Business** knowledge source (create/upload under the Business knowledge area).
- [ ] P03-M07-01-03 — Add URL as a **Business** knowledge source.
- [ ] P03-M07-01-04 — Add plain text as a **Business** knowledge source.
- [ ] P03-M07-01-05 — Add FAQ content as a **Business** knowledge source (reusable across agents).
- [ ] P03-M07-01-06 — List **Business** knowledge sources (shared library for the Business).
- [ ] P03-M07-01-07 — Store original source (canonical EaziAICall record; provider sync is a mapping, not the source of truth).
- [ ] P03-M07-01-08 — Sync source to provider knowledge system (provider-neutral adapter; ElevenLabs is one provider).
- [ ] P03-M07-01-09 — Display provider sync state on the Business source (and surface status where agents consume it).
- [ ] P03-M07-01-10 — Delete/archive Business knowledge source with **safe handling of active agent assignments** (do not silently orphan or cascade-delete other agents’ access without an explicit safe flow).
- [ ] P03-M07-01-11 — Resync failed source (canonical source remains; provider mapping/retry is separate).
- [ ] P03-M07-01-12 — Explicitly document what is out of scope for this module so later-phase work is not pulled forward.
- [ ] P03-M07-01-13 — View a Business knowledge source (metadata, content summary, sync state, agents currently using it where useful).
- [ ] P03-M07-01-14 — Update a Business knowledge source where applicable (content/metadata) without creating per-agent duplicates.
- [ ] P03-M07-01-15 — Assign a knowledge source to one or more agents within the same Business.
- [ ] P03-M07-01-16 — Unassign a knowledge source from an agent (assignment removal only — does **not** delete the Business source).
- [ ] P03-M07-01-17 — List knowledge sources assigned to an agent.
- [ ] P03-M07-01-18 — Reuse one Business source across multiple same-Business agents (one canonical `knowledge_sources` row; multiple assignment rows).
- [ ] P03-M07-01-19 — Document ownership rules: Business-scoped assets; tenant ownership derivable via Business; cross-business access blocked; agents may only use own-Business sources.

### Submodule 07.02 — Backend, Persistence & API

- [ ] P03-M07-02-01 — Implement/confirm data requirement: `knowledge_bases` (or equivalent Business-scoped container naming consistent with repository conventions).
- [ ] P03-M07-02-02 — Implement/confirm data requirement: `knowledge_sources` belonging to **Business** (do **not** require duplicate source rows per agent).
- [ ] P03-M07-02-03 — Implement/confirm data requirement: `knowledge_sync_logs` (provider sync state/history against canonical sources).
- [ ] P03-M07-02-04 — Create and test migrations for this module without destructive uncontrolled schema synchronization.
- [ ] P03-M07-02-05 — Confirm Business ownership keys and foreign-key behavior for tenant-owned records (tenant ownership derivable through Business → Organization; do not duplicate `organization_id` unless architecture genuinely requires it).

- [ ] P03-M07-02-06 — Create/update the NestJS module boundaries, services and domain logic for **Knowledge Base** (separate Business knowledge management from agent assignment).
- [ ] P03-M07-02-07 — Keep provider-specific implementation outside core business rules wherever the provider abstraction applies (provider-neutral mapping; no core schema hardcoding of `elevenlabs_knowledge_id`).
- [ ] P03-M07-02-08 — Add consistent error handling, logging and retry/idempotency behavior where required.

- [ ] P03-M07-02-09 — Implement/verify Business knowledge API intent: `POST /api/v1/businesses/:businessId/knowledge/files` (architectural target; exact REST naming may follow repository conventions).
- [ ] P03-M07-02-10 — Implement/verify Business knowledge API intent: `POST /api/v1/businesses/:businessId/knowledge/url`.
- [ ] P03-M07-02-11 — Implement/verify Business knowledge API intent: `POST /api/v1/businesses/:businessId/knowledge/text` (and FAQ as applicable).
- [ ] P03-M07-02-12 — Implement/verify agent assignment list API intent: `GET /api/v1/agents/:agentId/knowledge` (sources assigned to the agent — not a substitute for the Business library list).
- [ ] P03-M07-02-13 — Implement/verify API contract: `DELETE /api/v1/knowledge/:id` (Business source delete/archive with safe assignment handling).
- [ ] P03-M07-02-14 — Implement/verify API contract: `POST /api/v1/knowledge/:id/resync`.
- [ ] P03-M07-02-15 — Add DTO/schema validation and consistent API error responses (provider errors must not leak secrets).
- [ ] P03-M07-02-16 — Implement/confirm data requirement: `agent_knowledge_sources` assignment/mapping table (unique assignment per agent/source; deleting an assignment does not delete the source).
- [ ] P03-M07-02-17 — Implement/verify Business knowledge list API intent: `GET /api/v1/businesses/:businessId/knowledge`.
- [ ] P03-M07-02-18 — Implement/verify source detail API intent: `GET /api/v1/knowledge/:id`.
- [ ] P03-M07-02-19 — Implement/verify agent assignment APIs intent: `POST /api/v1/agents/:agentId/knowledge/:knowledgeId` and `DELETE /api/v1/agents/:agentId/knowledge/:knowledgeId`.
- [ ] P03-M07-02-20 — Enforce business-ownership validation on assign: agent and knowledge source must belong to the same Business; block cross-business assignment.

### Submodule 07.03 — Frontend & Integrations

- [ ] P03-M07-03-01 — Build/complete **Business Knowledge** area: shared knowledge list (not an agent-only list that forces re-upload).
- [ ] P03-M07-03-02 — Build/complete frontend requirement: Upload component (Business knowledge create).
- [ ] P03-M07-03-03 — Build/complete frontend requirement: URL form (Business knowledge create).
- [ ] P03-M07-03-04 — Build/complete frontend requirement: Text/FAQ form (Business knowledge create).
- [ ] P03-M07-03-05 — Build/complete frontend requirement: Sync status badges on Business sources.
- [ ] P03-M07-03-06 — Build/complete frontend requirement: Edit/delete/resync actions for Business sources (with assignment-aware destructive confirmations).
- [ ] P03-M07-03-07 — Connect the UI to real APIs and remove temporary production-blocking mock data.
- [ ] P03-M07-03-08 — Verify responsive, loading, empty, validation, success and error states.

- [ ] P03-M07-03-09 — Integrate and verify: S3-compatible storage.
- [ ] P03-M07-03-10 — Integrate and verify: provider knowledge/RAG synchronization via abstraction (ElevenLabs as first provider; remain provider-swappable).
- [ ] P03-M07-03-11 — Handle provider timeout, unavailable, invalid-response and retry scenarios where applicable.
- [ ] P03-M07-03-12 — Agent configuration UI: multi-select assigned knowledge sources (e.g. ☑ Clinic Hours, ☑ Services, ☐ Pricing) without repeated uploads per agent.
- [ ] P03-M07-03-13 — Provide “Manage Business Knowledge” navigation from agent knowledge configuration where appropriate.
- [ ] P03-M07-03-14 — Where useful, show which agents currently use a Business knowledge source.

### Submodule 07.04 — Security & QA

- [ ] P03-M07-04-01 — File type/size validation.
- [ ] P03-M07-04-02 — Tenant-scoped object keys.
- [ ] P03-M07-04-03 — Signed/private storage access.
- [ ] P03-M07-04-04 — URL validation.
- [ ] P03-M07-04-05 — Verify tenant isolation for all tenant-owned records and actions (Business A cannot access Business B knowledge).

- [ ] P03-M07-04-06 — Test: Upload→store→sync (Business source).
- [ ] P03-M07-04-07 — Test: URL/text sync (Business source).
- [ ] P03-M07-04-08 — Test: Delete/archive Business source with safe assignment handling.
- [ ] P03-M07-04-09 — Test: Failed sync retry / resync.
- [ ] P03-M07-04-10 — Test: Cross-tenant / cross-business source access blocked.
- [ ] P03-M07-04-11 — Run regression checks for directly affected existing modules.
- [ ] P03-M07-04-12 — Complete manual QA of the end-to-end user journey.
- [ ] P03-M07-04-13 — Test: Agent cannot receive another Business’s knowledge source.
- [ ] P03-M07-04-14 — Test: Same source can be assigned to multiple same-Business agents.
- [ ] P03-M07-04-15 — Test: Duplicate agent/source mapping blocked.
- [ ] P03-M07-04-16 — Test: Unassigning Agent A does not affect Agent B’s assignment or the shared source.
- [ ] P03-M07-04-17 — Test: Source deletion safely handles active assignments (detect/confirm/block or explicit safe flow).
- [ ] P03-M07-04-18 — Test: Provider sync state remains source-safe; provider errors do not leak secrets.

### Submodule 07.05 — Documentation & Acceptance

- [ ] P03-M07-05-01 — Update the Master Module Registry status and dependencies.
- [ ] P03-M07-05-02 — Document database/API/provider changes introduced by this module.
- [ ] P03-M07-05-03 — Update environment-variable/example configuration documentation if this module introduces new configuration.
- [ ] P03-M07-05-04 — Create/update the **Manual QA Handoff** guide for **Knowledge Base** at `docs/module-7/M07_Knowledge_Base_manual-qa-guide.md` (or the repository's canonical equivalent). It must explain what the module is, its role in the project, delivered scope, roles/permissions, routes/APIs, data/integrations, complete user workflows, prerequisites/test data, happy/negative/edge/security/tenant test cases, expected results, regression scope, known limitations, bug-reporting requirements, evidence expectations, and QA sign-off checklist. **Shared-asset coverage required:** Business knowledge library, agent assignment/unassignment, reuse of one source across agents, tenant/business isolation, sync/resync, and deletion behavior with active assignments. Do not create the final QA guide until this module is being completed.


- [ ] P03-M07-GATE — Final acceptance: all module-specific checklist items above are verified, `VS-GLOBAL-01` through `VS-GLOBAL-16` pass, documentation/registry are current, and the module is accepted before the next module starts.

**Module Gate:** `[M07] Knowledge Base = COMPLETE ✅` only after every required checkbox above is verified.

## Module 08 — Voice Library `M08`

**Target:** MVP

**Dependencies:** M05, M06

**Status:** Not Started — roadmap refined 27 August 2026 for Shared Business Voice Library + per-agent voice selection. Do not mark In Development or Complete until implementation begins and gates pass.

**Architecture (locked):** Shared Business Voice Library + per-agent voice selection. A voice is **not** duplicated because Agent A and Agent B use it; agent config references/selects the voice. Library may include provider voices available to the Business and eligible custom/cloned voices once M09 exists.


### Submodule 08.01 — Scope & Technical Design

- [ ] P03-M08-01-01 — Confirm the objective and boundaries of **Voice Library** as **Shared Business Voice Library + per-agent voice selection** (VOICE ASSET vs AGENT VOICE ASSIGNMENT).
- [ ] P03-M08-01-02 — Fetch/list available provider voices and make eligible voices available through the Business Voice Library.
- [ ] P03-M08-01-03 — Search/filter voices (including language/accent/style metadata and Male / Female / Neutral·Any as **presentation/preference filters**, aligned with M05 — avoid modeling biological agent gender as core Agent identity).
- [ ] P03-M08-01-04 — Preview voice.
- [ ] P03-M08-01-05 — Select/assign a voice to an agent (agent references the shared voice asset; change assigned voice without duplicating the asset).
- [ ] P03-M08-01-06 — Persist provider-neutral voice mapping/config behind the canonical EaziAICall voice reference.
- [ ] P03-M08-01-07 — Show current assigned voice on the agent; reuse the same voice across multiple same-Business agents.
- [ ] P03-M08-01-08 — Explicitly document what is out of scope for this module so later-phase work is not pulled forward.
- [ ] P03-M08-01-09 — Identify provider voice metadata (provider-neutral catalogue fields; provider-specific IDs in mapping/adapters only).
- [ ] P03-M08-01-10 — Provider / language / model compatibility validation where applicable (clear error or warning on incompatible selection).
- [ ] P03-M08-01-11 — Document that cloned/custom voices (M09) appear in the Business library as eligible voice assets without per-agent recreation.

### Submodule 08.02 — Backend, Persistence & API

- [ ] P03-M08-02-01 — Implement/confirm data requirement: `voices` (or `business_voices` / cached provider-neutral voice metadata) — canonical voice **asset** records; do not force exact schema prematurely if provider investigation is required, but lock VOICE ASSET vs ASSIGNMENT separation.
- [ ] P03-M08-02-02 — Implement/confirm data requirement: `voice_configs` / `agent_voice_configs` — per-agent selected voice assignment (`agent_id`, `voice_id`, provider mapping/config where needed).
- [ ] P03-M08-02-03 — Create and test migrations for this module without destructive uncontrolled schema synchronization.
- [ ] P03-M08-02-04 — Confirm Business/tenant ownership keys and foreign-key behavior for tenant-owned or Business-scoped voice records (custom/cloned voices must not leak across businesses).

- [ ] P03-M08-02-05 — Create/update the NestJS module boundaries, services and domain logic for **Voice Library**.
- [ ] P03-M08-02-06 — Keep provider-specific implementation outside core business rules wherever the provider abstraction applies (no core hardcoding of `elevenlabs_voice_id`).
- [ ] P03-M08-02-07 — Add consistent error handling, logging and retry/idempotency behavior where required.

- [ ] P03-M08-02-08 — Implement/verify API contract intent: `GET /api/v1/voices` (and/or Business-scoped library listing — architectural target; exact REST naming may follow conventions).
- [ ] P03-M08-02-09 — Implement/verify API contract intent: `POST /api/v1/agents/:id/voice` (select/change agent’s selected voice; does not duplicate the voice asset).
- [ ] P03-M08-02-10 — Add DTO/schema validation and consistent API error responses (invalid/unavailable voice; compatibility failures; no provider credential exposure).
- [ ] P03-M08-02-11 — Enforce Business/tenant-safe voice assignment: agents may only select voices eligible for their Business; block cross-tenant custom voice access.

### Submodule 08.03 — Frontend & Integrations

- [ ] P03-M08-03-01 — Build/complete frontend requirement: **Business Voice Library** (available voices, metadata, cloned/custom indicator where applicable later).
- [ ] P03-M08-03-02 — Build/complete frontend requirement: Filters (language/accent/style; Male / Female / Neutral·Any as preference filters).
- [ ] P03-M08-03-03 — Build/complete frontend requirement: Audio preview.
- [ ] P03-M08-03-04 — Build/complete frontend requirement: Selected state on agent (current assigned voice).
- [ ] P03-M08-03-05 — Build/complete frontend requirement: Assign/save / Browse Voice Library from agent Voice configuration.
- [ ] P03-M08-03-06 — Connect the UI to real APIs and remove temporary production-blocking mock data.
- [ ] P03-M08-03-07 — Verify responsive, loading, empty, validation, success and error states.

- [ ] P03-M08-03-08 — Integrate and verify: provider voice catalogue via abstraction (ElevenLabs as first catalogue provider; remain provider-swappable).
- [ ] P03-M08-03-09 — Handle provider timeout, unavailable, invalid-response and retry scenarios where applicable.
- [ ] P03-M08-03-10 — UX clarity: Agent A and Agent B may both use the same voice (e.g. Sarah) with no duplication required.

### Submodule 08.04 — Security & QA

- [ ] P03-M08-04-01 — No provider secret / credential exposed in client preview flow.
- [ ] P03-M08-04-02 — Tenant/Business-scoped assignment (same voice reusable within Business; changing Agent A’s voice does not modify Agent B).
- [ ] P03-M08-04-03 — Verify tenant isolation for all tenant-owned records and actions (cross-tenant custom voice access blocked).

- [ ] P03-M08-04-04 — Test: List voices (Business Voice Library).
- [ ] P03-M08-04-05 — Test: Preview.
- [ ] P03-M08-04-06 — Test: Assign voice to agent.
- [ ] P03-M08-04-07 — Test: Persist mapping / agent voice config (asset not duplicated).
- [ ] P03-M08-04-08 — Test: Invalid / unavailable provider voice rejected or handled clearly.
- [ ] P03-M08-04-09 — Run regression checks for directly affected existing modules.
- [ ] P03-M08-04-10 — Complete manual QA of the end-to-end user journey.
- [ ] P03-M08-04-11 — Test: Same voice reusable across multiple same-Business agents.
- [ ] P03-M08-04-12 — Test: Changing Agent A voice does not modify Agent B.
- [ ] P03-M08-04-13 — Test: Incompatible voice/language/model produces clear error or warning.
- [ ] P03-M08-04-14 — Test: Cross-tenant / cross-business custom voice access blocked.

### Submodule 08.05 — Documentation & Acceptance

- [ ] P03-M08-05-01 — Update the Master Module Registry status and dependencies.
- [ ] P03-M08-05-02 — Document database/API/provider changes introduced by this module.
- [ ] P03-M08-05-03 — Update environment-variable/example configuration documentation if this module introduces new configuration.
- [ ] P03-M08-05-04 — Create/update the **Manual QA Handoff** guide for **Voice Library** at `docs/module-8/M08_Voice_Library_manual-qa-guide.md` (or the repository's canonical equivalent). It must explain what the module is, its role in the project, delivered scope, roles/permissions, routes/APIs, data/integrations, complete user workflows, prerequisites/test data, happy/negative/edge/security/tenant test cases, expected results, regression scope, known limitations, bug-reporting requirements, evidence expectations, and QA sign-off checklist. **Shared-asset coverage required:** Business voice library, voice preview, per-agent assignment, reuse across agents, and language/provider compatibility. Do not create the final QA guide until this module is being completed.


- [ ] P03-M08-GATE — Final acceptance: all module-specific checklist items above are verified, `VS-GLOBAL-01` through `VS-GLOBAL-16` pass, documentation/registry are current, and the module is accepted before the next module starts.

**Module Gate:** `[M08] Voice Library = COMPLETE ✅` only after every required checkbox above is verified.

## Module 09 — Voice Cloning `M09`

**Target:** MVP/Premium

**Dependencies:** M05, M06, M08

**Status:** Not Started — roadmap refined 27 August 2026 for Business-owned reusable cloned voices + per-agent assignment. Do not mark In Development or Complete until implementation begins and gates pass.

**Architecture (locked):** Business-owned reusable cloned voices + per-agent assignment. A cloned voice must **not** be recreated for every agent. Example: Business creates Owner Custom Clone once; Receptionist and Appointment Agent both reference the same authorized Business voice asset.


### Submodule 09.01 — Scope & Technical Design

- [ ] P03-M09-01-01 — Confirm the objective and boundaries of **Voice Cloning** as **Business-owned reusable cloned voices + per-agent assignment** (one canonical Business clone asset; many agent selections).
- [ ] P03-M09-01-02 — Capture explicit consent for creation/use of the cloned voice **asset** (who consented, when, what source/sample, Business context, provider, retention/revocation state). Do not duplicate consent unnecessarily for every agent assignment unless future legal/product requirements specifically require additional per-use consent.
- [ ] P03-M09-01-03 — Upload or record voice samples (private, Business-scoped storage).
- [ ] P03-M09-01-04 — Submit / create clone request (Business-owned clone lifecycle).
- [ ] P03-M09-01-05 — Track processing status.
- [ ] P03-M09-01-06 — Preview cloned voice.
- [ ] P03-M09-01-07 — Assign cloned voice to one or more agents (via Business voice asset / agent voice config — reuse across eligible Business agents; do not model one clone row per agent unless a provider mapping requires an internal detail while preserving one canonical Business asset).
- [ ] P03-M09-01-08 — Revoke/delete clone with **safe handling while assigned** (detect assignments; require confirmation; either block destructive deletion until unassigned **or** follow an explicitly designed safe reassignment/unassignment flow — exact UX may be locked during M09 implementation).
- [ ] P03-M09-01-09 — Audit consent and sensitive actions (clone create/delete/revoke and agent voice assignment remain auditable).
- [ ] P03-M09-01-10 — Explicitly document what is out of scope for this module so later-phase work is not pulled forward.
- [ ] P03-M09-01-11 — Store resulting cloned voice as a Business-owned voice asset eligible for the M08 Business Voice Library.
- [ ] P03-M09-01-12 — Unassign/change agent voice selection without destroying the shared Business clone asset.
- [ ] P03-M09-01-13 — Provider sync/mapping for clones (EaziAICall canonical clone record → provider clone ID; provider failure must not silently corrupt canonical records).
- [ ] P03-M09-01-14 — Document: no automatic voice cloning without explicit consent.

### Submodule 09.02 — Backend, Persistence & API

- [ ] P03-M09-02-01 — Implement/confirm data requirement: `voice_clones` (Business-owned; one canonical asset — not one row per agent).
- [ ] P03-M09-02-02 — Implement/confirm data requirement: `voice_consents` (belongs to clone asset creation/use; records who/when/source/Business/provider/retention-revocation).
- [ ] P03-M09-02-03 — Implement/confirm data requirement: `voice_samples` (restricted, private storage).
- [ ] P03-M09-02-04 — Implement/confirm data requirement: `voice_configs` / `agent_voice_configs` (agent → selected voice assignment; many agents may reference the same clone/voice asset).
- [ ] P03-M09-02-05 — Create and test migrations for this module without destructive uncontrolled schema synchronization.
- [ ] P03-M09-02-06 — Confirm Business ownership keys and foreign-key behavior for tenant-owned records (Business → Voice Clone → Consent / Samples → Voice Asset → many Agent assignments).

- [ ] P03-M09-02-07 — Create/update the NestJS module boundaries, services and domain logic for **Voice Cloning**.
- [ ] P03-M09-02-08 — Keep provider-specific implementation outside core business rules wherever the provider abstraction applies (provider-neutral mapping; no core hardcoding of ElevenLabs-only IDs).
- [ ] P03-M09-02-09 — Add consistent error handling, logging and retry/idempotency behavior where required.

- [ ] P03-M09-02-10 — Implement/verify API contract intent: `POST /api/v1/voices/clone` (or Business-scoped equivalent — creates Business-owned clone, not per-agent clone).
- [ ] P03-M09-02-11 — Implement/verify API contract intent: `GET /api/v1/voices/:id/status`.
- [ ] P03-M09-02-12 — Implement/verify API contract intent: `DELETE /api/v1/voices/:id` (safe revoke/delete with active-assignment handling).
- [ ] P03-M09-02-13 — Implement/verify API contract intent: `POST /api/v1/agents/:id/voice` (assign/change selected voice to an existing Business clone/voice asset).
- [ ] P03-M09-02-14 — Add DTO/schema validation and consistent API error responses.
- [ ] P03-M09-02-15 — Implement/confirm linkage to `voices` / `business_voices` so the resulting clone is a reusable Business voice asset.
- [ ] P03-M09-02-16 — Enforce cross-business clone access blocked; agents may only be assigned clones owned by their Business.

### Submodule 09.03 — Frontend & Integrations

- [ ] P03-M09-03-01 — Build/complete frontend requirement: Consent screen (asset-level consent; clear Business ownership context).
- [ ] P03-M09-03-02 — Build/complete frontend requirement: Upload/record samples.
- [ ] P03-M09-03-03 — Build/complete frontend requirement: Processing state.
- [ ] P03-M09-03-04 — Build/complete frontend requirement: Preview.
- [ ] P03-M09-03-05 — Build/complete frontend requirement: Assign clone to agent(s) from Business Voice Library / agent Voice selection (reuse across agents).
- [ ] P03-M09-03-06 — Build/complete frontend requirement: Delete/revoke confirmation that surfaces active agent assignments and requires a safe flow.
- [ ] P03-M09-03-07 — Connect the UI to real APIs and remove temporary production-blocking mock data.
- [ ] P03-M09-03-08 — Verify responsive, loading, empty, validation, success and error states.

- [ ] P03-M09-03-09 — Integrate and verify: S3-compatible sample storage where permitted (private; sensitive sample URLs not publicly exposed).
- [ ] P03-M09-03-10 — Integrate and verify: provider voice cloning via abstraction (ElevenLabs as first cloning provider; remain provider-swappable).
- [ ] P03-M09-03-11 — Handle provider timeout, unavailable, invalid-response and retry scenarios where applicable.
- [ ] P03-M09-03-12 — UX clarity: one Business clone (e.g. Owner Custom Clone) selectable by multiple agents without recreating the clone.

### Submodule 09.04 — Security & QA

- [ ] P03-M09-04-01 — Explicit consent required before submission; no automatic cloning without consent.
- [ ] P03-M09-04-02 — Restrict sample access; private storage; sensitive sample URLs not publicly exposed.
- [ ] P03-M09-04-03 — Retention/deletion rules for samples and clones.
- [ ] P03-M09-04-04 — Audit log for consent and sensitive actions (including agent assignment of cloned voices).
- [ ] P03-M09-04-05 — Verify tenant/Business isolation for all tenant-owned records and actions (cross-business clone access blocked; provider credentials server-side only).

- [ ] P03-M09-04-06 — Test: Consent required.
- [ ] P03-M09-04-07 — Test: Valid sample upload.
- [ ] P03-M09-04-08 — Test: Clone request/status (Business-owned asset).
- [ ] P03-M09-04-09 — Test: Assign clone to agent(s); reuse across eligible Business agents.
- [ ] P03-M09-04-10 — Test: Unauthorized / cross-business clone access blocked.
- [ ] P03-M09-04-11 — Run regression checks for directly affected existing modules.
- [ ] P03-M09-04-12 — Complete manual QA of the end-to-end user journey.
- [ ] P03-M09-04-13 — Test: Unassign/change agent voice does not destroy the shared Business clone.
- [ ] P03-M09-04-14 — Test: Destructive delete/revoke while assigned detects assignments and requires safe confirmation flow (block until unassigned or explicit reassignment).
- [ ] P03-M09-04-15 — Test: Provider credentials never exposed; sample URLs not publicly accessible.

### Submodule 09.05 — Documentation & Acceptance

- [ ] P03-M09-05-01 — Update the Master Module Registry status and dependencies.
- [ ] P03-M09-05-02 — Document database/API/provider changes introduced by this module.
- [ ] P03-M09-05-03 — Update environment-variable/example configuration documentation if this module introduces new configuration.
- [ ] P03-M09-05-04 — Create/update the **Manual QA Handoff** guide for **Voice Cloning** at `docs/module-9/M09_Voice_Cloning_manual-qa-guide.md` (or the repository's canonical equivalent). It must explain what the module is, its role in the project, delivered scope, roles/permissions, routes/APIs, data/integrations, complete user workflows, prerequisites/test data, happy/negative/edge/security/tenant test cases, expected results, regression scope, known limitations, bug-reporting requirements, evidence expectations, and QA sign-off checklist. **Shared-asset coverage required:** consent, sample handling, clone creation, reusable Business clone, agent assignment, revocation/deletion with assignment safety, and security/privacy. Do not create the final QA guide until this module is being completed.


- [ ] P03-M09-GATE — Final acceptance: all module-specific checklist items above are verified, `VS-GLOBAL-01` through `VS-GLOBAL-16` pass, documentation/registry are current, and the module is accepted before the next module starts.

**Module Gate:** `[M09] Voice Cloning = COMPLETE ✅` only after every required checkbox above is verified.
---

# PHASE 04 — Telephony

- [ ] P04-GATE — Phase 04 is complete only when every required module below is accepted.


## Module 10 — Twilio Telephony Provider `M10`

**Target:** MVP

**Dependencies:** M00


### Submodule 10.01 — Scope & Technical Design

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

### Submodule 10.02 — Backend, Persistence & API

- [ ] P04-M10-02-01 — Implement/confirm data requirement: `provider mappings and logs as required`.
- [ ] P04-M10-02-02 — Create and test migrations for this module without destructive uncontrolled schema synchronization.
- [ ] P04-M10-02-03 — Confirm organization/business ownership keys and foreign-key behavior for tenant-owned records.

- [ ] P04-M10-02-04 — Create/update the NestJS module boundaries, services and domain logic for **Twilio Telephony Provider**.
- [ ] P04-M10-02-05 — Keep provider-specific implementation outside core business rules wherever the provider abstraction applies.
- [ ] P04-M10-02-06 — Add consistent error handling, logging and retry/idempotency behavior where required.

- [ ] P04-M10-02-07 — Implement/verify API contract: `Internal Twilio provider methods`.
- [ ] P04-M10-02-08 — Implement/verify API contract: `/api/v1/webhooks/twilio/*`.
- [ ] P04-M10-02-09 — Add DTO/schema validation and consistent API error responses.

### Submodule 10.03 — Frontend & Integrations

- [ ] P04-M10-03-01 — Build/complete frontend requirement: Provider health/config status in internal settings if needed.
- [ ] P04-M10-03-02 — Connect the UI to real APIs and remove temporary production-blocking mock data.
- [ ] P04-M10-03-03 — Verify responsive, loading, empty, validation, success and error states.

- [ ] P04-M10-03-04 — Integrate and verify: Twilio.
- [ ] P04-M10-03-05 — Handle provider timeout, unavailable, invalid-response and retry scenarios where applicable.

### Submodule 10.04 — Security & QA

- [ ] P04-M10-04-01 — Verify Twilio webhook signatures.
- [ ] P04-M10-04-02 — Keep Account SID/Auth Token server-side.
- [ ] P04-M10-04-03 — Idempotent callback handling.
- [ ] P04-M10-04-04 — Verify tenant isolation for all tenant-owned records and actions.

- [ ] P04-M10-04-05 — Test: Credential validation.
- [ ] P04-M10-04-06 — Test: Webhook verification.
- [ ] P04-M10-04-07 — Test: Event normalization.
- [ ] P04-M10-04-08 — Test: Number configuration test.
- [ ] P04-M10-04-09 — Test: Provider failure handling.
- [ ] P04-M10-04-10 — Run regression checks for directly affected existing modules.
- [ ] P04-M10-04-11 — Complete manual QA of the end-to-end user journey.

### Submodule 10.05 — Documentation & Acceptance

- [ ] P04-M10-05-01 — Update the Master Module Registry status and dependencies.
- [ ] P04-M10-05-02 — Document database/API/provider changes introduced by this module.
- [ ] P04-M10-05-03 — Update environment-variable/example configuration documentation if this module introduces new configuration.
- [ ] P04-M10-05-04 — Create/update the **Manual QA Handoff** guide for **Twilio Telephony Provider** at `docs/module-10/M10_Twilio_Telephony_Provider_manual-qa-guide.md` (or the repository's canonical equivalent). It must explain what the module is, its role in the project, delivered scope, roles/permissions, routes/APIs, data/integrations, complete user workflows, prerequisites/test data, happy/negative/edge/security/tenant test cases, expected results, regression scope, known limitations, bug-reporting requirements, evidence expectations, and QA sign-off checklist.


- [ ] P04-M10-GATE — Final acceptance: all module-specific checklist items above are verified, `VS-GLOBAL-01` through `VS-GLOBAL-16` pass, documentation/registry are current, and the module is accepted before the next module starts.

**Module Gate:** `[M10] Twilio Telephony Provider = COMPLETE ✅` only after every required checkbox above is verified.

## Module 11 — Phone Number Management `M11`

**Target:** MVP

**Dependencies:** M04, M05, M10


### Submodule 11.01 — Scope & Technical Design

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

### Submodule 11.02 — Backend, Persistence & API

- [ ] P04-M11-02-01 — Implement/confirm data requirement: `phone_numbers`.
- [ ] P04-M11-02-02 — Implement/confirm data requirement: `phone_number_assignments`.
- [ ] P04-M11-02-03 — Create and test migrations for this module without destructive uncontrolled schema synchronization.
- [ ] P04-M11-02-04 — Confirm organization/business ownership keys and foreign-key behavior for tenant-owned records.

- [ ] P04-M11-02-05 — Create/update the NestJS module boundaries, services and domain logic for **Phone Number Management**.
- [ ] P04-M11-02-06 — Keep provider-specific implementation outside core business rules wherever the provider abstraction applies.
- [ ] P04-M11-02-07 — Add consistent error handling, logging and retry/idempotency behavior where required.

- [ ] P04-M11-02-08 — Implement/verify API contract: `GET /api/v1/phone-numbers`.
- [ ] P04-M11-02-09 — Implement/verify API contract: `POST /api/v1/phone-numbers/search`.
- [ ] P04-M11-02-10 — Implement/verify API contract: `POST /api/v1/phone-numbers/purchase`.
- [ ] P04-M11-02-11 — Implement/verify API contract: `POST /api/v1/phone-numbers/:id/assign`.
- [ ] P04-M11-02-12 — Implement/verify API contract: `POST /api/v1/phone-numbers/:id/unassign`.
- [ ] P04-M11-02-13 — Implement/verify API contract: `DELETE /api/v1/phone-numbers/:id`.
- [ ] P04-M11-02-14 — Add DTO/schema validation and consistent API error responses.

### Submodule 11.03 — Frontend & Integrations

- [ ] P04-M11-03-01 — Build/complete frontend requirement: Phone-number list.
- [ ] P04-M11-03-02 — Build/complete frontend requirement: Search/purchase flow.
- [ ] P04-M11-03-03 — Build/complete frontend requirement: Assignment UI.
- [ ] P04-M11-03-04 — Build/complete frontend requirement: Release confirmation.
- [ ] P04-M11-03-05 — Build/complete frontend requirement: Status badges.
- [ ] P04-M11-03-06 — Connect the UI to real APIs and remove temporary production-blocking mock data.
- [ ] P04-M11-03-07 — Verify responsive, loading, empty, validation, success and error states.

- [ ] P04-M11-03-08 — Integrate and verify: Twilio number APIs.
- [ ] P04-M11-03-09 — Handle provider timeout, unavailable, invalid-response and retry scenarios where applicable.

### Submodule 11.04 — Security & QA

- [ ] P04-M11-04-01 — Tenant owns number record.
- [ ] P04-M11-04-02 — Role-based purchase/release.
- [ ] P04-M11-04-03 — Confirm destructive release.
- [ ] P04-M11-04-04 — Verify tenant isolation for all tenant-owned records and actions.

- [ ] P04-M11-04-05 — Test: Search→purchase→assign.
- [ ] P04-M11-04-06 — Test: Unassign.
- [ ] P04-M11-04-07 — Test: Release.
- [ ] P04-M11-04-08 — Test: Cannot assign another tenant's number.
- [ ] P04-M11-04-09 — Run regression checks for directly affected existing modules.
- [ ] P04-M11-04-10 — Complete manual QA of the end-to-end user journey.

### Submodule 11.05 — Documentation & Acceptance

- [ ] P04-M11-05-01 — Update the Master Module Registry status and dependencies.
- [ ] P04-M11-05-02 — Document database/API/provider changes introduced by this module.
- [ ] P04-M11-05-03 — Update environment-variable/example configuration documentation if this module introduces new configuration.
- [ ] P04-M11-05-04 — Create/update the **Manual QA Handoff** guide for **Phone Number Management** at `docs/module-11/M11_Phone_Number_Management_manual-qa-guide.md` (or the repository's canonical equivalent). It must explain what the module is, its role in the project, delivered scope, roles/permissions, routes/APIs, data/integrations, complete user workflows, prerequisites/test data, happy/negative/edge/security/tenant test cases, expected results, regression scope, known limitations, bug-reporting requirements, evidence expectations, and QA sign-off checklist.


- [ ] P04-M11-GATE — Final acceptance: all module-specific checklist items above are verified, `VS-GLOBAL-01` through `VS-GLOBAL-16` pass, documentation/registry are current, and the module is accepted before the next module starts.

**Module Gate:** `[M11] Phone Number Management = COMPLETE ✅` only after every required checkbox above is verified.
---

# PHASE 05 — AI Calling MVP

- [ ] P05-GATE — Phase 05 is complete only when every required module below is accepted.


## Module 12 — Incoming AI Calls `M12`

**Target:** MVP

**Dependencies:** M06, M10, M11


### Submodule 12.01 — Scope & Technical Design

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

### Submodule 12.02 — Backend, Persistence & API

- [ ] P05-M12-02-01 — Implement/confirm data requirement: `calls`.
- [ ] P05-M12-02-02 — Implement/confirm data requirement: `call_events`.
- [ ] P05-M12-02-03 — Create and test migrations for this module without destructive uncontrolled schema synchronization.
- [ ] P05-M12-02-04 — Confirm organization/business ownership keys and foreign-key behavior for tenant-owned records.

- [ ] P05-M12-02-05 — Create/update the NestJS module boundaries, services and domain logic for **Incoming AI Calls**.
- [ ] P05-M12-02-06 — Keep provider-specific implementation outside core business rules wherever the provider abstraction applies.
- [ ] P05-M12-02-07 — Add consistent error handling, logging and retry/idempotency behavior where required.

- [ ] P05-M12-02-08 — Implement/verify API contract: `Twilio inbound webhook`.
- [ ] P05-M12-02-09 — Implement/verify API contract: `Twilio status callback`.
- [ ] P05-M12-02-10 — Implement/verify API contract: `ElevenLabs call/conversation webhook endpoints as required`.
- [ ] P05-M12-02-11 — Add DTO/schema validation and consistent API error responses.

### Submodule 12.03 — Frontend & Integrations

- [ ] P05-M12-03-01 — Build/complete frontend requirement: Basic call appears in customer portal.
- [ ] P05-M12-03-02 — Build/complete frontend requirement: Call status visible.
- [ ] P05-M12-03-03 — Connect the UI to real APIs and remove temporary production-blocking mock data.
- [ ] P05-M12-03-04 — Verify responsive, loading, empty, validation, success and error states.

- [ ] P05-M12-03-05 — Integrate and verify: Twilio.
- [ ] P05-M12-03-06 — Integrate and verify: ElevenLabs.
- [ ] P05-M12-03-07 — Handle provider timeout, unavailable, invalid-response and retry scenarios where applicable.

### Submodule 12.04 — Security & QA

- [ ] P05-M12-04-01 — Webhook verification.
- [ ] P05-M12-04-02 — Reject unknown/unmapped routes safely.
- [ ] P05-M12-04-03 — Tenant-safe call ownership.
- [ ] P05-M12-04-04 — Verify tenant isolation for all tenant-owned records and actions.

- [ ] P05-M12-04-05 — Test: Real phone call reaches correct agent.
- [ ] P05-M12-04-06 — Test: Correct greeting/business knowledge.
- [ ] P05-M12-04-07 — Test: Call completion stored.
- [ ] P05-M12-04-08 — Test: Unknown number handled.
- [ ] P05-M12-04-09 — Test: Failure event stored.
- [ ] P05-M12-04-10 — Run regression checks for directly affected existing modules.
- [ ] P05-M12-04-11 — Complete manual QA of the end-to-end user journey.

### Submodule 12.05 — Documentation & Acceptance

- [ ] P05-M12-05-01 — Update the Master Module Registry status and dependencies.
- [ ] P05-M12-05-02 — Document database/API/provider changes introduced by this module.
- [ ] P05-M12-05-03 — Update environment-variable/example configuration documentation if this module introduces new configuration.
- [ ] P05-M12-05-04 — Create/update the **Manual QA Handoff** guide for **Incoming AI Calls** at `docs/module-12/M12_Incoming_AI_Calls_manual-qa-guide.md` (or the repository's canonical equivalent). It must explain what the module is, its role in the project, delivered scope, roles/permissions, routes/APIs, data/integrations, complete user workflows, prerequisites/test data, happy/negative/edge/security/tenant test cases, expected results, regression scope, known limitations, bug-reporting requirements, evidence expectations, and QA sign-off checklist.


- [ ] P05-M12-GATE — Final acceptance: all module-specific checklist items above are verified, `VS-GLOBAL-01` through `VS-GLOBAL-16` pass, documentation/registry are current, and the module is accepted before the next module starts.

**Module Gate:** `[M12] Incoming AI Calls = COMPLETE ✅` only after every required checkbox above is verified.

## Module 13 — Outbound Calls `M13`

**Target:** Post-MVP

**Dependencies:** M11, M12


### Submodule 13.01 — Scope & Technical Design

- [ ] P05-M13-01-01 — Confirm the objective and boundaries of **Outbound Calls**.
- [ ] P05-M13-01-02 — Manual outbound call
- [ ] P05-M13-01-03 — Select business/agent
- [ ] P05-M13-01-04 — Enter/select customer number
- [ ] P05-M13-01-05 — Create callback
- [ ] P05-M13-01-06 — Create reminder/follow-up foundation
- [ ] P05-M13-01-07 — Track outbound lifecycle
- [ ] P05-M13-01-08 — Explicitly document what is out of scope for this module so later-phase work is not pulled forward.

### Submodule 13.02 — Backend, Persistence & API

- [ ] P05-M13-02-01 — Implement/confirm data requirement: `calls`.
- [ ] P05-M13-02-02 — Implement/confirm data requirement: `call_events`.
- [ ] P05-M13-02-03 — Implement/confirm data requirement: `optional outbound_call_requests`.
- [ ] P05-M13-02-04 — Create and test migrations for this module without destructive uncontrolled schema synchronization.
- [ ] P05-M13-02-05 — Confirm organization/business ownership keys and foreign-key behavior for tenant-owned records.

- [ ] P05-M13-02-06 — Create/update the NestJS module boundaries, services and domain logic for **Outbound Calls**.
- [ ] P05-M13-02-07 — Keep provider-specific implementation outside core business rules wherever the provider abstraction applies.
- [ ] P05-M13-02-08 — Add consistent error handling, logging and retry/idempotency behavior where required.

- [ ] P05-M13-02-09 — Implement/verify API contract: `POST /api/v1/calls/outbound`.
- [ ] P05-M13-02-10 — Add DTO/schema validation and consistent API error responses.

### Submodule 13.03 — Frontend & Integrations

- [ ] P05-M13-03-01 — Build/complete frontend requirement: Make-call form.
- [ ] P05-M13-03-02 — Build/complete frontend requirement: Call purpose.
- [ ] P05-M13-03-03 — Build/complete frontend requirement: Agent selector.
- [ ] P05-M13-03-04 — Build/complete frontend requirement: Outbound status.
- [ ] P05-M13-03-05 — Connect the UI to real APIs and remove temporary production-blocking mock data.
- [ ] P05-M13-03-06 — Verify responsive, loading, empty, validation, success and error states.

- [ ] P05-M13-03-07 — Integrate and verify: Twilio.
- [ ] P05-M13-03-08 — Integrate and verify: ElevenLabs.
- [ ] P05-M13-03-09 — Handle provider timeout, unavailable, invalid-response and retry scenarios where applicable.

### Submodule 13.04 — Security & QA

- [ ] P05-M13-04-01 — Role/plan permissions.
- [ ] P05-M13-04-02 — Destination validation.
- [ ] P05-M13-04-03 — Abuse/rate controls.
- [ ] P05-M13-04-04 — Verify tenant isolation for all tenant-owned records and actions.

- [ ] P05-M13-04-05 — Test: Initiate outbound call.
- [ ] P05-M13-04-06 — Test: Correct agent used.
- [ ] P05-M13-04-07 — Test: Lifecycle stored.
- [ ] P05-M13-04-08 — Test: Invalid number rejected.
- [ ] P05-M13-04-09 — Test: Provider failure handled.
- [ ] P05-M13-04-10 — Run regression checks for directly affected existing modules.
- [ ] P05-M13-04-11 — Complete manual QA of the end-to-end user journey.

### Submodule 13.05 — Documentation & Acceptance

- [ ] P05-M13-05-01 — Update the Master Module Registry status and dependencies.
- [ ] P05-M13-05-02 — Document database/API/provider changes introduced by this module.
- [ ] P05-M13-05-03 — Update environment-variable/example configuration documentation if this module introduces new configuration.
- [ ] P05-M13-05-04 — Create/update the **Manual QA Handoff** guide for **Outbound Calls** at `docs/module-13/M13_Outbound_Calls_manual-qa-guide.md` (or the repository's canonical equivalent). It must explain what the module is, its role in the project, delivered scope, roles/permissions, routes/APIs, data/integrations, complete user workflows, prerequisites/test data, happy/negative/edge/security/tenant test cases, expected results, regression scope, known limitations, bug-reporting requirements, evidence expectations, and QA sign-off checklist.


- [ ] P05-M13-GATE — Final acceptance: all module-specific checklist items above are verified, `VS-GLOBAL-01` through `VS-GLOBAL-16` pass, documentation/registry are current, and the module is accepted before the next module starts.

**Module Gate:** `[M13] Outbound Calls = COMPLETE ✅` only after every required checkbox above is verified.

## Module 14 — Call Management `M14`

**Target:** MVP

**Dependencies:** M12


### Submodule 14.01 — Scope & Technical Design

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

### Submodule 14.02 — Backend, Persistence & API

- [ ] P05-M14-02-01 — Implement/confirm data requirement: `calls`.
- [ ] P05-M14-02-02 — Implement/confirm data requirement: `call_events`.
- [ ] P05-M14-02-03 — Create and test migrations for this module without destructive uncontrolled schema synchronization.
- [ ] P05-M14-02-04 — Confirm organization/business ownership keys and foreign-key behavior for tenant-owned records.

- [ ] P05-M14-02-05 — Create/update the NestJS module boundaries, services and domain logic for **Call Management**.
- [ ] P05-M14-02-06 — Keep provider-specific implementation outside core business rules wherever the provider abstraction applies.
- [ ] P05-M14-02-07 — Add consistent error handling, logging and retry/idempotency behavior where required.

- [ ] P05-M14-02-08 — Implement/verify API contract: `GET /api/v1/calls`.
- [ ] P05-M14-02-09 — Implement/verify API contract: `GET /api/v1/calls/:id`.
- [ ] P05-M14-02-10 — Add DTO/schema validation and consistent API error responses.

### Submodule 14.03 — Frontend & Integrations

- [ ] P05-M14-03-01 — Build/complete frontend requirement: Calls table.
- [ ] P05-M14-03-02 — Build/complete frontend requirement: Filters.
- [ ] P05-M14-03-03 — Build/complete frontend requirement: Call detail page.
- [ ] P05-M14-03-04 — Build/complete frontend requirement: Empty/loading/error states.
- [ ] P05-M14-03-05 — Connect the UI to real APIs and remove temporary production-blocking mock data.
- [ ] P05-M14-03-06 — Verify responsive, loading, empty, validation, success and error states.

- [ ] P05-M14-03-07 — Confirm this module has no direct external-provider dependency or that dependencies are already abstracted.

### Submodule 14.04 — Security & QA

- [ ] P05-M14-04-01 — Tenant-scoped call access.
- [ ] P05-M14-04-02 — Role-based recording/transcript visibility if needed.
- [ ] P05-M14-04-03 — Verify tenant isolation for all tenant-owned records and actions.

- [ ] P05-M14-04-04 — Test: List only tenant calls.
- [ ] P05-M14-04-05 — Test: Filter/paginate.
- [ ] P05-M14-04-06 — Test: Open details.
- [ ] P05-M14-04-07 — Test: Cross-tenant call blocked.
- [ ] P05-M14-04-08 — Run regression checks for directly affected existing modules.
- [ ] P05-M14-04-09 — Complete manual QA of the end-to-end user journey.

### Submodule 14.05 — Documentation & Acceptance

- [ ] P05-M14-05-01 — Update the Master Module Registry status and dependencies.
- [ ] P05-M14-05-02 — Document database/API/provider changes introduced by this module.
- [ ] P05-M14-05-03 — Update environment-variable/example configuration documentation if this module introduces new configuration.
- [ ] P05-M14-05-04 — Create/update the **Manual QA Handoff** guide for **Call Management** at `docs/module-14/M14_Call_Management_manual-qa-guide.md` (or the repository's canonical equivalent). It must explain what the module is, its role in the project, delivered scope, roles/permissions, routes/APIs, data/integrations, complete user workflows, prerequisites/test data, happy/negative/edge/security/tenant test cases, expected results, regression scope, known limitations, bug-reporting requirements, evidence expectations, and QA sign-off checklist.


- [ ] P05-M14-GATE — Final acceptance: all module-specific checklist items above are verified, `VS-GLOBAL-01` through `VS-GLOBAL-16` pass, documentation/registry are current, and the module is accepted before the next module starts.

**Module Gate:** `[M14] Call Management = COMPLETE ✅` only after every required checkbox above is verified.

## Module 15 — Transcript Management `M15`

**Target:** MVP

**Dependencies:** M12, M14


### Submodule 15.01 — Scope & Technical Design

- [ ] P05-M15-01-01 — Confirm the objective and boundaries of **Transcript Management**.
- [ ] P05-M15-01-02 — Receive/fetch transcript
- [ ] P05-M15-01-03 — Store speaker-separated messages
- [ ] P05-M15-01-04 — Maintain sequence/timestamps
- [ ] P05-M15-01-05 — Display timeline
- [ ] P05-M15-01-06 — Search within transcript where supported
- [ ] P05-M15-01-07 — Handle partial/final transcript updates
- [ ] P05-M15-01-08 — Explicitly document what is out of scope for this module so later-phase work is not pulled forward.

### Submodule 15.02 — Backend, Persistence & API

- [ ] P05-M15-02-01 — Implement/confirm data requirement: `call_messages`.
- [ ] P05-M15-02-02 — Create and test migrations for this module without destructive uncontrolled schema synchronization.
- [ ] P05-M15-02-03 — Confirm organization/business ownership keys and foreign-key behavior for tenant-owned records.

- [ ] P05-M15-02-04 — Create/update the NestJS module boundaries, services and domain logic for **Transcript Management**.
- [ ] P05-M15-02-05 — Keep provider-specific implementation outside core business rules wherever the provider abstraction applies.
- [ ] P05-M15-02-06 — Add consistent error handling, logging and retry/idempotency behavior where required.

- [ ] P05-M15-02-07 — Implement/verify API contract: `GET /api/v1/calls/:id/transcript`.
- [ ] P05-M15-02-08 — Implement/verify API contract: `Provider transcript webhook/sync method`.
- [ ] P05-M15-02-09 — Add DTO/schema validation and consistent API error responses.

### Submodule 15.03 — Frontend & Integrations

- [ ] P05-M15-03-01 — Build/complete frontend requirement: Transcript tab.
- [ ] P05-M15-03-02 — Build/complete frontend requirement: Customer/AI speaker distinction.
- [ ] P05-M15-03-03 — Build/complete frontend requirement: Timeline.
- [ ] P05-M15-03-04 — Build/complete frontend requirement: Loading/processing states.
- [ ] P05-M15-03-05 — Connect the UI to real APIs and remove temporary production-blocking mock data.
- [ ] P05-M15-03-06 — Verify responsive, loading, empty, validation, success and error states.

- [ ] P05-M15-03-07 — Integrate and verify: ElevenLabs transcript/conversation data.
- [ ] P05-M15-03-08 — Handle provider timeout, unavailable, invalid-response and retry scenarios where applicable.

### Submodule 15.04 — Security & QA

- [ ] P05-M15-04-01 — Tenant-scoped transcript access.
- [ ] P05-M15-04-02 — PII-aware logging.
- [ ] P05-M15-04-03 — Verify tenant isolation for all tenant-owned records and actions.

- [ ] P05-M15-04-04 — Test: Transcript sync.
- [ ] P05-M15-04-05 — Test: Correct speaker order.
- [ ] P05-M15-04-06 — Test: Partial→final update.
- [ ] P05-M15-04-07 — Test: Cross-tenant access blocked.
- [ ] P05-M15-04-08 — Run regression checks for directly affected existing modules.
- [ ] P05-M15-04-09 — Complete manual QA of the end-to-end user journey.

### Submodule 15.05 — Documentation & Acceptance

- [ ] P05-M15-05-01 — Update the Master Module Registry status and dependencies.
- [ ] P05-M15-05-02 — Document database/API/provider changes introduced by this module.
- [ ] P05-M15-05-03 — Update environment-variable/example configuration documentation if this module introduces new configuration.
- [ ] P05-M15-05-04 — Create/update the **Manual QA Handoff** guide for **Transcript Management** at `docs/module-15/M15_Transcript_Management_manual-qa-guide.md` (or the repository's canonical equivalent). It must explain what the module is, its role in the project, delivered scope, roles/permissions, routes/APIs, data/integrations, complete user workflows, prerequisites/test data, happy/negative/edge/security/tenant test cases, expected results, regression scope, known limitations, bug-reporting requirements, evidence expectations, and QA sign-off checklist.


- [ ] P05-M15-GATE — Final acceptance: all module-specific checklist items above are verified, `VS-GLOBAL-01` through `VS-GLOBAL-16` pass, documentation/registry are current, and the module is accepted before the next module starts.

**Module Gate:** `[M15] Transcript Management = COMPLETE ✅` only after every required checkbox above is verified.

## Module 16 — Call Summary & Analysis `M16`

**Target:** MVP

**Dependencies:** M15


### Submodule 16.01 — Scope & Technical Design

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

### Submodule 16.02 — Backend, Persistence & API

- [ ] P05-M16-02-01 — Implement/confirm data requirement: `call_analysis or fields on calls`.
- [ ] P05-M16-02-02 — Create and test migrations for this module without destructive uncontrolled schema synchronization.
- [ ] P05-M16-02-03 — Confirm organization/business ownership keys and foreign-key behavior for tenant-owned records.

- [ ] P05-M16-02-04 — Create/update the NestJS module boundaries, services and domain logic for **Call Summary & Analysis**.
- [ ] P05-M16-02-05 — Keep provider-specific implementation outside core business rules wherever the provider abstraction applies.
- [ ] P05-M16-02-06 — Add consistent error handling, logging and retry/idempotency behavior where required.

- [ ] P05-M16-02-07 — Implement/verify API contract: `GET /api/v1/calls/:id/analysis`.
- [ ] P05-M16-02-08 — Implement/verify API contract: `Internal analysis job endpoint/service if required`.
- [ ] P05-M16-02-09 — Add DTO/schema validation and consistent API error responses.

### Submodule 16.03 — Frontend & Integrations

- [ ] P05-M16-03-01 — Build/complete frontend requirement: Summary/analysis tab.
- [ ] P05-M16-03-02 — Build/complete frontend requirement: Intent/outcome badges.
- [ ] P05-M16-03-03 — Build/complete frontend requirement: Follow-up indicator.
- [ ] P05-M16-03-04 — Build/complete frontend requirement: Processing/error states.
- [ ] P05-M16-03-05 — Connect the UI to real APIs and remove temporary production-blocking mock data.
- [ ] P05-M16-03-06 — Verify responsive, loading, empty, validation, success and error states.

- [ ] P05-M16-03-07 — Integrate and verify: Provider analysis or selected LLM service.
- [ ] P05-M16-03-08 — Handle provider timeout, unavailable, invalid-response and retry scenarios where applicable.

### Submodule 16.04 — Security & QA

- [ ] P05-M16-04-01 — Tenant-scoped analysis.
- [ ] P05-M16-04-02 — Avoid leaking sensitive transcript data in logs.
- [ ] P05-M16-04-03 — Verify tenant isolation for all tenant-owned records and actions.

- [ ] P05-M16-04-04 — Test: Completed call produces analysis.
- [ ] P05-M16-04-05 — Test: Failed analysis retry.
- [ ] P05-M16-04-06 — Test: UI displays result.
- [ ] P05-M16-04-07 — Test: Cross-tenant access blocked.
- [ ] P05-M16-04-08 — Run regression checks for directly affected existing modules.
- [ ] P05-M16-04-09 — Complete manual QA of the end-to-end user journey.

### Submodule 16.05 — Documentation & Acceptance

- [ ] P05-M16-05-01 — Update the Master Module Registry status and dependencies.
- [ ] P05-M16-05-02 — Document database/API/provider changes introduced by this module.
- [ ] P05-M16-05-03 — Update environment-variable/example configuration documentation if this module introduces new configuration.
- [ ] P05-M16-05-04 — Create/update the **Manual QA Handoff** guide for **Call Summary & Analysis** at `docs/module-16/M16_Call_Summary_and_Analysis_manual-qa-guide.md` (or the repository's canonical equivalent). It must explain what the module is, its role in the project, delivered scope, roles/permissions, routes/APIs, data/integrations, complete user workflows, prerequisites/test data, happy/negative/edge/security/tenant test cases, expected results, regression scope, known limitations, bug-reporting requirements, evidence expectations, and QA sign-off checklist.


- [ ] P05-M16-GATE — Final acceptance: all module-specific checklist items above are verified, `VS-GLOBAL-01` through `VS-GLOBAL-16` pass, documentation/registry are current, and the module is accepted before the next module starts.

**Module Gate:** `[M16] Call Summary & Analysis = COMPLETE ✅` only after every required checkbox above is verified.
---

# PHASE 06 — Business Tools

- [ ] P06-GATE — Phase 06 is complete only when every required module below is accepted.


## Module 17 — Generic Tool Framework `M17`

**Target:** MVP

**Dependencies:** M05, M06


### Submodule 17.01 — Scope & Technical Design

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

### Submodule 17.02 — Backend, Persistence & API

- [ ] P06-M17-02-01 — Implement/confirm data requirement: `tools`.
- [ ] P06-M17-02-02 — Implement/confirm data requirement: `agent_tools`.
- [ ] P06-M17-02-03 — Implement/confirm data requirement: `tool_executions`.
- [ ] P06-M17-02-04 — Create and test migrations for this module without destructive uncontrolled schema synchronization.
- [ ] P06-M17-02-05 — Confirm organization/business ownership keys and foreign-key behavior for tenant-owned records.

- [ ] P06-M17-02-06 — Create/update the NestJS module boundaries, services and domain logic for **Generic Tool Framework**.
- [ ] P06-M17-02-07 — Keep provider-specific implementation outside core business rules wherever the provider abstraction applies.
- [ ] P06-M17-02-08 — Add consistent error handling, logging and retry/idempotency behavior where required.

- [ ] P06-M17-02-09 — Implement/verify API contract: `CRUD tool endpoints as required`.
- [ ] P06-M17-02-10 — Implement/verify API contract: `Provider-facing secure tool execution endpoint`.
- [ ] P06-M17-02-11 — Add DTO/schema validation and consistent API error responses.

### Submodule 17.03 — Frontend & Integrations

- [ ] P06-M17-03-01 — Build/complete frontend requirement: Tool list.
- [ ] P06-M17-03-02 — Build/complete frontend requirement: Create/configure tool.
- [ ] P06-M17-03-03 — Build/complete frontend requirement: Assign to agent.
- [ ] P06-M17-03-04 — Build/complete frontend requirement: Execution history.
- [ ] P06-M17-03-05 — Build/complete frontend requirement: Test tool.
- [ ] P06-M17-03-06 — Connect the UI to real APIs and remove temporary production-blocking mock data.
- [ ] P06-M17-03-07 — Verify responsive, loading, empty, validation, success and error states.

- [ ] P06-M17-03-08 — Integrate and verify: ElevenLabs tool/function calling.
- [ ] P06-M17-03-09 — Integrate and verify: External REST/webhook systems.
- [ ] P06-M17-03-10 — Handle provider timeout, unavailable, invalid-response and retry scenarios where applicable.

### Submodule 17.04 — Security & QA

- [ ] P06-M17-04-01 — Encrypted credentials.
- [ ] P06-M17-04-02 — Allow-list/validation where appropriate.
- [ ] P06-M17-04-03 — Tenant-scoped tool access.
- [ ] P06-M17-04-04 — Audit executions.
- [ ] P06-M17-04-05 — Verify tenant isolation for all tenant-owned records and actions.

- [ ] P06-M17-04-06 — Test: Valid tool call.
- [ ] P06-M17-04-07 — Test: Invalid input rejected.
- [ ] P06-M17-04-08 — Test: Timeout.
- [ ] P06-M17-04-09 — Test: External error.
- [ ] P06-M17-04-10 — Test: Execution logged.
- [ ] P06-M17-04-11 — Test: Wrong-tenant tool blocked.
- [ ] P06-M17-04-12 — Run regression checks for directly affected existing modules.
- [ ] P06-M17-04-13 — Complete manual QA of the end-to-end user journey.

### Submodule 17.05 — Documentation & Acceptance

- [ ] P06-M17-05-01 — Update the Master Module Registry status and dependencies.
- [ ] P06-M17-05-02 — Document database/API/provider changes introduced by this module.
- [ ] P06-M17-05-03 — Update environment-variable/example configuration documentation if this module introduces new configuration.
- [ ] P06-M17-05-04 — Create/update the **Manual QA Handoff** guide for **Generic Tool Framework** at `docs/module-17/M17_Generic_Tool_Framework_manual-qa-guide.md` (or the repository's canonical equivalent). It must explain what the module is, its role in the project, delivered scope, roles/permissions, routes/APIs, data/integrations, complete user workflows, prerequisites/test data, happy/negative/edge/security/tenant test cases, expected results, regression scope, known limitations, bug-reporting requirements, evidence expectations, and QA sign-off checklist.


- [ ] P06-M17-GATE — Final acceptance: all module-specific checklist items above are verified, `VS-GLOBAL-01` through `VS-GLOBAL-16` pass, documentation/registry are current, and the module is accepted before the next module starts.

**Module Gate:** `[M17] Generic Tool Framework = COMPLETE ✅` only after every required checkbox above is verified.

## Module 18 — Appointment Booking `M18`

**Target:** Industry

**Dependencies:** M17


### Submodule 18.01 — Scope & Technical Design

- [ ] P06-M18-01-01 — Confirm the objective and boundaries of **Appointment Booking**.
- [ ] P06-M18-01-02 — Check available slots
- [ ] P06-M18-01-03 — Book appointment
- [ ] P06-M18-01-04 — Reschedule appointment
- [ ] P06-M18-01-05 — Cancel appointment
- [ ] P06-M18-01-06 — Map customer/business/service
- [ ] P06-M18-01-07 — Return structured response to agent
- [ ] P06-M18-01-08 — Explicitly document what is out of scope for this module so later-phase work is not pulled forward.

### Submodule 18.02 — Backend, Persistence & API

- [ ] P06-M18-02-01 — Implement/confirm data requirement: `appointments or integration mapping if our DB owns canonical booking`.
- [ ] P06-M18-02-02 — Implement/confirm data requirement: `tool_executions`.
- [ ] P06-M18-02-03 — Create and test migrations for this module without destructive uncontrolled schema synchronization.
- [ ] P06-M18-02-04 — Confirm organization/business ownership keys and foreign-key behavior for tenant-owned records.

- [ ] P06-M18-02-05 — Create/update the NestJS module boundaries, services and domain logic for **Appointment Booking**.
- [ ] P06-M18-02-06 — Keep provider-specific implementation outside core business rules wherever the provider abstraction applies.
- [ ] P06-M18-02-07 — Add consistent error handling, logging and retry/idempotency behavior where required.

- [ ] P06-M18-02-08 — Implement/verify API contract: `Tool endpoints for checkSlots/bookAppointment/rescheduleAppointment/cancelAppointment`.
- [ ] P06-M18-02-09 — Add DTO/schema validation and consistent API error responses.

### Submodule 18.03 — Frontend & Integrations

- [ ] P06-M18-03-01 — Build/complete frontend requirement: Appointment list/basic detail if owned in SaaS.
- [ ] P06-M18-03-02 — Build/complete frontend requirement: Integration settings.
- [ ] P06-M18-03-03 — Build/complete frontend requirement: Tool test UI.
- [ ] P06-M18-03-04 — Connect the UI to real APIs and remove temporary production-blocking mock data.
- [ ] P06-M18-03-05 — Verify responsive, loading, empty, validation, success and error states.

- [ ] P06-M18-03-06 — Integrate and verify: Calendar/booking provider or business API.
- [ ] P06-M18-03-07 — Handle provider timeout, unavailable, invalid-response and retry scenarios where applicable.

### Submodule 18.04 — Security & QA

- [ ] P06-M18-04-01 — Tenant-specific credentials.
- [ ] P06-M18-04-02 — Double-booking safeguards.
- [ ] P06-M18-04-03 — Input validation.
- [ ] P06-M18-04-04 — Verify tenant isolation for all tenant-owned records and actions.

- [ ] P06-M18-04-05 — Test: Check slots.
- [ ] P06-M18-04-06 — Test: Book.
- [ ] P06-M18-04-07 — Test: Reschedule.
- [ ] P06-M18-04-08 — Test: Cancel.
- [ ] P06-M18-04-09 — Test: Conflict handled.
- [ ] P06-M18-04-10 — Test: Agent receives usable result.
- [ ] P06-M18-04-11 — Run regression checks for directly affected existing modules.
- [ ] P06-M18-04-12 — Complete manual QA of the end-to-end user journey.

### Submodule 18.05 — Documentation & Acceptance

- [ ] P06-M18-05-01 — Update the Master Module Registry status and dependencies.
- [ ] P06-M18-05-02 — Document database/API/provider changes introduced by this module.
- [ ] P06-M18-05-03 — Update environment-variable/example configuration documentation if this module introduces new configuration.
- [ ] P06-M18-05-04 — Create/update the **Manual QA Handoff** guide for **Appointment Booking** at `docs/module-18/M18_Appointment_Booking_manual-qa-guide.md` (or the repository's canonical equivalent). It must explain what the module is, its role in the project, delivered scope, roles/permissions, routes/APIs, data/integrations, complete user workflows, prerequisites/test data, happy/negative/edge/security/tenant test cases, expected results, regression scope, known limitations, bug-reporting requirements, evidence expectations, and QA sign-off checklist.


- [ ] P06-M18-GATE — Final acceptance: all module-specific checklist items above are verified, `VS-GLOBAL-01` through `VS-GLOBAL-16` pass, documentation/registry are current, and the module is accepted before the next module starts.

**Module Gate:** `[M18] Appointment Booking = COMPLETE ✅` only after every required checkbox above is verified.

## Module 19 — Restaurant Reservations `M19`

**Target:** Industry

**Dependencies:** M17


### Submodule 19.01 — Scope & Technical Design

- [ ] P06-M19-01-01 — Confirm the objective and boundaries of **Restaurant Reservations**.
- [ ] P06-M19-01-02 — Check table availability
- [ ] P06-M19-01-03 — Create reservation
- [ ] P06-M19-01-04 — Cancel reservation
- [ ] P06-M19-01-05 — Get reservation
- [ ] P06-M19-01-06 — Capture guest count/date/time/contact
- [ ] P06-M19-01-07 — Return structured result to agent
- [ ] P06-M19-01-08 — Explicitly document what is out of scope for this module so later-phase work is not pulled forward.

### Submodule 19.02 — Backend, Persistence & API

- [ ] P06-M19-02-01 — Implement/confirm data requirement: `reservations or provider mapping if owned internally`.
- [ ] P06-M19-02-02 — Implement/confirm data requirement: `tool_executions`.
- [ ] P06-M19-02-03 — Create and test migrations for this module without destructive uncontrolled schema synchronization.
- [ ] P06-M19-02-04 — Confirm organization/business ownership keys and foreign-key behavior for tenant-owned records.

- [ ] P06-M19-02-05 — Create/update the NestJS module boundaries, services and domain logic for **Restaurant Reservations**.
- [ ] P06-M19-02-06 — Keep provider-specific implementation outside core business rules wherever the provider abstraction applies.
- [ ] P06-M19-02-07 — Add consistent error handling, logging and retry/idempotency behavior where required.

- [ ] P06-M19-02-08 — Implement/verify API contract: `Tool endpoints for checkAvailability/createReservation/cancelReservation/getReservation`.
- [ ] P06-M19-02-09 — Add DTO/schema validation and consistent API error responses.

### Submodule 19.03 — Frontend & Integrations

- [ ] P06-M19-03-01 — Build/complete frontend requirement: Reservation list/basic detail if owned in SaaS.
- [ ] P06-M19-03-02 — Build/complete frontend requirement: Integration settings.
- [ ] P06-M19-03-03 — Build/complete frontend requirement: Tool test UI.
- [ ] P06-M19-03-04 — Connect the UI to real APIs and remove temporary production-blocking mock data.
- [ ] P06-M19-03-05 — Verify responsive, loading, empty, validation, success and error states.

- [ ] P06-M19-03-06 — Integrate and verify: Restaurant reservation system or business API.
- [ ] P06-M19-03-07 — Handle provider timeout, unavailable, invalid-response and retry scenarios where applicable.

### Submodule 19.04 — Security & QA

- [ ] P06-M19-04-01 — Tenant-specific credentials.
- [ ] P06-M19-04-02 — Date/time/party-size validation.
- [ ] P06-M19-04-03 — Duplicate reservation safeguards.
- [ ] P06-M19-04-04 — Verify tenant isolation for all tenant-owned records and actions.

- [ ] P06-M19-04-05 — Test: Availability.
- [ ] P06-M19-04-06 — Test: Create.
- [ ] P06-M19-04-07 — Test: Lookup.
- [ ] P06-M19-04-08 — Test: Cancel.
- [ ] P06-M19-04-09 — Test: No-availability path.
- [ ] P06-M19-04-10 — Test: Provider failure.
- [ ] P06-M19-04-11 — Run regression checks for directly affected existing modules.
- [ ] P06-M19-04-12 — Complete manual QA of the end-to-end user journey.

### Submodule 19.05 — Documentation & Acceptance

- [ ] P06-M19-05-01 — Update the Master Module Registry status and dependencies.
- [ ] P06-M19-05-02 — Document database/API/provider changes introduced by this module.
- [ ] P06-M19-05-03 — Update environment-variable/example configuration documentation if this module introduces new configuration.
- [ ] P06-M19-05-04 — Create/update the **Manual QA Handoff** guide for **Restaurant Reservations** at `docs/module-19/M19_Restaurant_Reservations_manual-qa-guide.md` (or the repository's canonical equivalent). It must explain what the module is, its role in the project, delivered scope, roles/permissions, routes/APIs, data/integrations, complete user workflows, prerequisites/test data, happy/negative/edge/security/tenant test cases, expected results, regression scope, known limitations, bug-reporting requirements, evidence expectations, and QA sign-off checklist.


- [ ] P06-M19-GATE — Final acceptance: all module-specific checklist items above are verified, `VS-GLOBAL-01` through `VS-GLOBAL-16` pass, documentation/registry are current, and the module is accepted before the next module starts.

**Module Gate:** `[M19] Restaurant Reservations = COMPLETE ✅` only after every required checkbox above is verified.
---

# PHASE 07 — CRM & Intelligence

- [ ] P07-GATE — Phase 07 is complete only when every required module below is accepted.


## Module 20 — Customer / CRM `M20`

**Target:** Commercial

**Dependencies:** M04, M14


### Submodule 20.01 — Scope & Technical Design

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

### Submodule 20.02 — Backend, Persistence & API

- [ ] P07-M20-02-01 — Implement/confirm data requirement: `customers`.
- [ ] P07-M20-02-02 — Implement/confirm data requirement: `customer_notes`.
- [ ] P07-M20-02-03 — Implement/confirm data requirement: `customer_preferences`.
- [ ] P07-M20-02-04 — Create and test migrations for this module without destructive uncontrolled schema synchronization.
- [ ] P07-M20-02-05 — Confirm organization/business ownership keys and foreign-key behavior for tenant-owned records.

- [ ] P07-M20-02-06 — Create/update the NestJS module boundaries, services and domain logic for **Customer / CRM**.
- [ ] P07-M20-02-07 — Keep provider-specific implementation outside core business rules wherever the provider abstraction applies.
- [ ] P07-M20-02-08 — Add consistent error handling, logging and retry/idempotency behavior where required.

- [ ] P07-M20-02-09 — Implement/verify API contract: `CRUD/read customer endpoints`.
- [ ] P07-M20-02-10 — Implement/verify API contract: `Customer activity/history endpoints`.
- [ ] P07-M20-02-11 — Add DTO/schema validation and consistent API error responses.

### Submodule 20.03 — Frontend & Integrations

- [ ] P07-M20-03-01 — Build/complete frontend requirement: Customer list.
- [ ] P07-M20-03-02 — Build/complete frontend requirement: Customer detail.
- [ ] P07-M20-03-03 — Build/complete frontend requirement: Activity timeline.
- [ ] P07-M20-03-04 — Build/complete frontend requirement: Notes.
- [ ] P07-M20-03-05 — Build/complete frontend requirement: Lead/follow-up state.
- [ ] P07-M20-03-06 — Connect the UI to real APIs and remove temporary production-blocking mock data.
- [ ] P07-M20-03-07 — Verify responsive, loading, empty, validation, success and error states.

- [ ] P07-M20-03-08 — Integrate and verify: Calls.
- [ ] P07-M20-03-09 — Integrate and verify: Appointments/reservations.
- [ ] P07-M20-03-10 — Integrate and verify: Future CRM connectors.
- [ ] P07-M20-03-11 — Handle provider timeout, unavailable, invalid-response and retry scenarios where applicable.

### Submodule 20.04 — Security & QA

- [ ] P07-M20-04-01 — Tenant-scoped customer data.
- [ ] P07-M20-04-02 — Role-based sensitive data access.
- [ ] P07-M20-04-03 — Verify tenant isolation for all tenant-owned records and actions.

- [ ] P07-M20-04-04 — Test: Create/update customer.
- [ ] P07-M20-04-05 — Test: Link call history.
- [ ] P07-M20-04-06 — Test: Notes.
- [ ] P07-M20-04-07 — Test: Cross-tenant customer blocked.
- [ ] P07-M20-04-08 — Run regression checks for directly affected existing modules.
- [ ] P07-M20-04-09 — Complete manual QA of the end-to-end user journey.

### Submodule 20.05 — Documentation & Acceptance

- [ ] P07-M20-05-01 — Update the Master Module Registry status and dependencies.
- [ ] P07-M20-05-02 — Document database/API/provider changes introduced by this module.
- [ ] P07-M20-05-03 — Update environment-variable/example configuration documentation if this module introduces new configuration.
- [ ] P07-M20-05-04 — Create/update the **Manual QA Handoff** guide for **Customer / CRM** at `docs/module-20/M20_Customer_CRM_manual-qa-guide.md` (or the repository's canonical equivalent). It must explain what the module is, its role in the project, delivered scope, roles/permissions, routes/APIs, data/integrations, complete user workflows, prerequisites/test data, happy/negative/edge/security/tenant test cases, expected results, regression scope, known limitations, bug-reporting requirements, evidence expectations, and QA sign-off checklist.


- [ ] P07-M20-GATE — Final acceptance: all module-specific checklist items above are verified, `VS-GLOBAL-01` through `VS-GLOBAL-16` pass, documentation/registry are current, and the module is accepted before the next module starts.

**Module Gate:** `[M20] Customer / CRM = COMPLETE ✅` only after every required checkbox above is verified.

## Module 21 — Knowledge Gap Detection `M21`

**Target:** Commercial

**Dependencies:** M15, M16, M07


### Submodule 21.01 — Scope & Technical Design

- [ ] P07-M21-01-01 — Confirm the objective and boundaries of **Knowledge Gap Detection**.
- [ ] P07-M21-01-02 — Detect unanswered questions
- [ ] P07-M21-01-03 — Detect low-confidence/weak answers
- [ ] P07-M21-01-04 — Identify repeated questions
- [ ] P07-M21-01-05 — Create knowledge suggestions
- [ ] P07-M21-01-06 — Human approval/rejection
- [ ] P07-M21-01-07 — Apply approved knowledge update
- [ ] P07-M21-01-08 — Track suggestion lifecycle
- [ ] P07-M21-01-09 — Explicitly document what is out of scope for this module so later-phase work is not pulled forward.

### Submodule 21.02 — Backend, Persistence & API

- [ ] P07-M21-02-01 — Implement/confirm data requirement: `knowledge_gap_suggestions or equivalent`.
- [ ] P07-M21-02-02 — Implement/confirm data requirement: `knowledge_sources`.
- [ ] P07-M21-02-03 — Implement/confirm data requirement: `audit_logs`.
- [ ] P07-M21-02-04 — Create and test migrations for this module without destructive uncontrolled schema synchronization.
- [ ] P07-M21-02-05 — Confirm organization/business ownership keys and foreign-key behavior for tenant-owned records.

- [ ] P07-M21-02-06 — Create/update the NestJS module boundaries, services and domain logic for **Knowledge Gap Detection**.
- [ ] P07-M21-02-07 — Keep provider-specific implementation outside core business rules wherever the provider abstraction applies.
- [ ] P07-M21-02-08 — Add consistent error handling, logging and retry/idempotency behavior where required.

- [ ] P07-M21-02-09 — Implement/verify API contract: `GET /api/v1/knowledge-gaps`.
- [ ] P07-M21-02-10 — Implement/verify API contract: `POST /api/v1/knowledge-gaps/:id/approve`.
- [ ] P07-M21-02-11 — Implement/verify API contract: `POST /api/v1/knowledge-gaps/:id/reject`.
- [ ] P07-M21-02-12 — Add DTO/schema validation and consistent API error responses.

### Submodule 21.03 — Frontend & Integrations

- [ ] P07-M21-03-01 — Build/complete frontend requirement: Knowledge gaps queue.
- [ ] P07-M21-03-02 — Build/complete frontend requirement: Evidence/transcript context.
- [ ] P07-M21-03-03 — Build/complete frontend requirement: Approve/reject/edit suggestion.
- [ ] P07-M21-03-04 — Build/complete frontend requirement: Status history.
- [ ] P07-M21-03-05 — Connect the UI to real APIs and remove temporary production-blocking mock data.
- [ ] P07-M21-03-06 — Verify responsive, loading, empty, validation, success and error states.

- [ ] P07-M21-03-07 — Integrate and verify: Call analysis.
- [ ] P07-M21-03-08 — Integrate and verify: Knowledge sync.
- [ ] P07-M21-03-09 — Handle provider timeout, unavailable, invalid-response and retry scenarios where applicable.

### Submodule 21.04 — Security & QA

- [ ] P07-M21-04-01 — Tenant-scoped suggestions.
- [ ] P07-M21-04-02 — Human approval required before KB change.
- [ ] P07-M21-04-03 — Verify tenant isolation for all tenant-owned records and actions.

- [ ] P07-M21-04-04 — Test: Gap generated from call.
- [ ] P07-M21-04-05 — Test: Approval updates KB.
- [ ] P07-M21-04-06 — Test: Rejected suggestion does not change KB.
- [ ] P07-M21-04-07 — Test: Audit trail recorded.
- [ ] P07-M21-04-08 — Run regression checks for directly affected existing modules.
- [ ] P07-M21-04-09 — Complete manual QA of the end-to-end user journey.

### Submodule 21.05 — Documentation & Acceptance

- [ ] P07-M21-05-01 — Update the Master Module Registry status and dependencies.
- [ ] P07-M21-05-02 — Document database/API/provider changes introduced by this module.
- [ ] P07-M21-05-03 — Update environment-variable/example configuration documentation if this module introduces new configuration.
- [ ] P07-M21-05-04 — Create/update the **Manual QA Handoff** guide for **Knowledge Gap Detection** at `docs/module-21/M21_Knowledge_Gap_Detection_manual-qa-guide.md` (or the repository's canonical equivalent). It must explain what the module is, its role in the project, delivered scope, roles/permissions, routes/APIs, data/integrations, complete user workflows, prerequisites/test data, happy/negative/edge/security/tenant test cases, expected results, regression scope, known limitations, bug-reporting requirements, evidence expectations, and QA sign-off checklist.


- [ ] P07-M21-GATE — Final acceptance: all module-specific checklist items above are verified, `VS-GLOBAL-01` through `VS-GLOBAL-16` pass, documentation/registry are current, and the module is accepted before the next module starts.

**Module Gate:** `[M21] Knowledge Gap Detection = COMPLETE ✅` only after every required checkbox above is verified.
---

# PHASE 08 — Automation

- [ ] P08-GATE — Phase 08 is complete only when every required module below is accepted.


## Module 22 — n8n Automation `M22`

**Target:** Commercial

**Dependencies:** M12


### Submodule 22.01 — Scope & Technical Design

- [ ] P08-M22-01-01 — Confirm the objective and boundaries of **n8n Automation**.
- [ ] P08-M22-01-02 — Emit provider-neutral business events
- [ ] P08-M22-01-03 — Trigger n8n webhook/workflow
- [ ] P08-M22-01-04 — Map payloads
- [ ] P08-M22-01-05 — Track automation run
- [ ] P08-M22-01-06 — Retry failed delivery
- [ ] P08-M22-01-07 — Support CALL_COMPLETED/CALL_FAILED/BOOKING_CREATED/LEAD_CREATED/FOLLOW_UP_REQUIRED/AGENT_ESCALATED
- [ ] P08-M22-01-08 — Explicitly document what is out of scope for this module so later-phase work is not pulled forward.

### Submodule 22.02 — Backend, Persistence & API

- [ ] P08-M22-02-01 — Implement/confirm data requirement: `automations`.
- [ ] P08-M22-02-02 — Implement/confirm data requirement: `automation_runs`.
- [ ] P08-M22-02-03 — Create and test migrations for this module without destructive uncontrolled schema synchronization.
- [ ] P08-M22-02-04 — Confirm organization/business ownership keys and foreign-key behavior for tenant-owned records.

- [ ] P08-M22-02-05 — Create/update the NestJS module boundaries, services and domain logic for **n8n Automation**.
- [ ] P08-M22-02-06 — Keep provider-specific implementation outside core business rules wherever the provider abstraction applies.
- [ ] P08-M22-02-07 — Add consistent error handling, logging and retry/idempotency behavior where required.

- [ ] P08-M22-02-08 — Implement/verify API contract: `Automation CRUD/config endpoints as needed`.
- [ ] P08-M22-02-09 — Implement/verify API contract: `Secure outbound webhook delivery`.
- [ ] P08-M22-02-10 — Add DTO/schema validation and consistent API error responses.

### Submodule 22.03 — Frontend & Integrations

- [ ] P08-M22-03-01 — Build/complete frontend requirement: Automation list.
- [ ] P08-M22-03-02 — Build/complete frontend requirement: Enable/disable.
- [ ] P08-M22-03-03 — Build/complete frontend requirement: Trigger/action configuration.
- [ ] P08-M22-03-04 — Build/complete frontend requirement: Run history.
- [ ] P08-M22-03-05 — Build/complete frontend requirement: Failure/retry state.
- [ ] P08-M22-03-06 — Connect the UI to real APIs and remove temporary production-blocking mock data.
- [ ] P08-M22-03-07 — Verify responsive, loading, empty, validation, success and error states.

- [ ] P08-M22-03-08 — Integrate and verify: n8n.
- [ ] P08-M22-03-09 — Integrate and verify: Email/SMS/WhatsApp/CRM/Calendar/Slack/Sheets/custom webhooks.
- [ ] P08-M22-03-10 — Handle provider timeout, unavailable, invalid-response and retry scenarios where applicable.

### Submodule 22.04 — Security & QA

- [ ] P08-M22-04-01 — Webhook signing/secrets.
- [ ] P08-M22-04-02 — Do not expose credentials.
- [ ] P08-M22-04-03 — n8n kept outside realtime audio loop.
- [ ] P08-M22-04-04 — Verify tenant isolation for all tenant-owned records and actions.

- [ ] P08-M22-04-05 — Test: Event triggers workflow.
- [ ] P08-M22-04-06 — Test: Failure logged.
- [ ] P08-M22-04-07 — Test: Retry works.
- [ ] P08-M22-04-08 — Test: Disabled automation not triggered.
- [ ] P08-M22-04-09 — Run regression checks for directly affected existing modules.
- [ ] P08-M22-04-10 — Complete manual QA of the end-to-end user journey.

### Submodule 22.05 — Documentation & Acceptance

- [ ] P08-M22-05-01 — Update the Master Module Registry status and dependencies.
- [ ] P08-M22-05-02 — Document database/API/provider changes introduced by this module.
- [ ] P08-M22-05-03 — Update environment-variable/example configuration documentation if this module introduces new configuration.
- [ ] P08-M22-05-04 — Create/update the **Manual QA Handoff** guide for **n8n Automation** at `docs/module-22/M22_n8n_Automation_manual-qa-guide.md` (or the repository's canonical equivalent). It must explain what the module is, its role in the project, delivered scope, roles/permissions, routes/APIs, data/integrations, complete user workflows, prerequisites/test data, happy/negative/edge/security/tenant test cases, expected results, regression scope, known limitations, bug-reporting requirements, evidence expectations, and QA sign-off checklist.


- [ ] P08-M22-GATE — Final acceptance: all module-specific checklist items above are verified, `VS-GLOBAL-01` through `VS-GLOBAL-16` pass, documentation/registry are current, and the module is accepted before the next module starts.

**Module Gate:** `[M22] n8n Automation = COMPLETE ✅` only after every required checkbox above is verified.

## Module 23 — Notifications `M23`

**Target:** Commercial

**Dependencies:** M22


### Submodule 23.01 — Scope & Technical Design

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

### Submodule 23.02 — Backend, Persistence & API

- [ ] P08-M23-02-01 — Implement/confirm data requirement: `notifications`.
- [ ] P08-M23-02-02 — Implement/confirm data requirement: `notification_preferences optional`.
- [ ] P08-M23-02-03 — Create and test migrations for this module without destructive uncontrolled schema synchronization.
- [ ] P08-M23-02-04 — Confirm organization/business ownership keys and foreign-key behavior for tenant-owned records.

- [ ] P08-M23-02-05 — Create/update the NestJS module boundaries, services and domain logic for **Notifications**.
- [ ] P08-M23-02-06 — Keep provider-specific implementation outside core business rules wherever the provider abstraction applies.
- [ ] P08-M23-02-07 — Add consistent error handling, logging and retry/idempotency behavior where required.

- [ ] P08-M23-02-08 — Implement/verify API contract: `GET /api/v1/notifications`.
- [ ] P08-M23-02-09 — Implement/verify API contract: `PATCH /api/v1/notifications/:id/read`.
- [ ] P08-M23-02-10 — Implement/verify API contract: `Preference endpoints if needed`.
- [ ] P08-M23-02-11 — Add DTO/schema validation and consistent API error responses.

### Submodule 23.03 — Frontend & Integrations

- [ ] P08-M23-03-01 — Build/complete frontend requirement: Notification center.
- [ ] P08-M23-03-02 — Build/complete frontend requirement: Unread badge.
- [ ] P08-M23-03-03 — Build/complete frontend requirement: Preferences.
- [ ] P08-M23-03-04 — Build/complete frontend requirement: Empty/loading/error states.
- [ ] P08-M23-03-05 — Connect the UI to real APIs and remove temporary production-blocking mock data.
- [ ] P08-M23-03-06 — Verify responsive, loading, empty, validation, success and error states.

- [ ] P08-M23-03-07 — Integrate and verify: Email provider.
- [ ] P08-M23-03-08 — Integrate and verify: SMS provider.
- [ ] P08-M23-03-09 — Handle provider timeout, unavailable, invalid-response and retry scenarios where applicable.

### Submodule 23.04 — Security & QA

- [ ] P08-M23-04-01 — Tenant/user recipient scoping.
- [ ] P08-M23-04-02 — Do not leak another tenant's event.
- [ ] P08-M23-04-03 — Verify tenant isolation for all tenant-owned records and actions.

- [ ] P08-M23-04-04 — Test: Notification created.
- [ ] P08-M23-04-05 — Test: Correct recipient.
- [ ] P08-M23-04-06 — Test: Read state.
- [ ] P08-M23-04-07 — Test: Channel failure logged.
- [ ] P08-M23-04-08 — Run regression checks for directly affected existing modules.
- [ ] P08-M23-04-09 — Complete manual QA of the end-to-end user journey.

### Submodule 23.05 — Documentation & Acceptance

- [ ] P08-M23-05-01 — Update the Master Module Registry status and dependencies.
- [ ] P08-M23-05-02 — Document database/API/provider changes introduced by this module.
- [ ] P08-M23-05-03 — Update environment-variable/example configuration documentation if this module introduces new configuration.
- [ ] P08-M23-05-04 — Create/update the **Manual QA Handoff** guide for **Notifications** at `docs/module-23/M23_Notifications_manual-qa-guide.md` (or the repository's canonical equivalent). It must explain what the module is, its role in the project, delivered scope, roles/permissions, routes/APIs, data/integrations, complete user workflows, prerequisites/test data, happy/negative/edge/security/tenant test cases, expected results, regression scope, known limitations, bug-reporting requirements, evidence expectations, and QA sign-off checklist.


- [ ] P08-M23-GATE — Final acceptance: all module-specific checklist items above are verified, `VS-GLOBAL-01` through `VS-GLOBAL-16` pass, documentation/registry are current, and the module is accepted before the next module starts.

**Module Gate:** `[M23] Notifications = COMPLETE ✅` only after every required checkbox above is verified.
---

# PHASE 09 — Commercial SaaS

- [ ] P09-GATE — Phase 09 is complete only when every required module below is accepted.


## Module 24 — Analytics `M24`

**Target:** Commercial

**Dependencies:** M14, M16


### Submodule 24.01 — Scope & Technical Design

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

### Submodule 24.02 — Backend, Persistence & API

- [ ] P09-M24-02-01 — Implement/confirm data requirement: `analytics aggregates or materialized summaries`.
- [ ] P09-M24-02-02 — Implement/confirm data requirement: `usage/call derived metrics`.
- [ ] P09-M24-02-03 — Create and test migrations for this module without destructive uncontrolled schema synchronization.
- [ ] P09-M24-02-04 — Confirm organization/business ownership keys and foreign-key behavior for tenant-owned records.

- [ ] P09-M24-02-05 — Create/update the NestJS module boundaries, services and domain logic for **Analytics**.
- [ ] P09-M24-02-06 — Keep provider-specific implementation outside core business rules wherever the provider abstraction applies.
- [ ] P09-M24-02-07 — Add consistent error handling, logging and retry/idempotency behavior where required.

- [ ] P09-M24-02-08 — Implement/verify API contract: `GET /api/v1/analytics/overview`.
- [ ] P09-M24-02-09 — Implement/verify API contract: `GET /api/v1/analytics/calls`.
- [ ] P09-M24-02-10 — Implement/verify API contract: `GET /api/v1/analytics/agents`.
- [ ] P09-M24-02-11 — Implement/verify API contract: `GET /api/v1/analytics/costs`.
- [ ] P09-M24-02-12 — Add DTO/schema validation and consistent API error responses.

### Submodule 24.03 — Frontend & Integrations

- [ ] P09-M24-03-01 — Build/complete frontend requirement: Analytics dashboard.
- [ ] P09-M24-03-02 — Build/complete frontend requirement: Charts/tables.
- [ ] P09-M24-03-03 — Build/complete frontend requirement: Date filters.
- [ ] P09-M24-03-04 — Build/complete frontend requirement: Business/agent selectors.
- [ ] P09-M24-03-05 — Build/complete frontend requirement: Export later if approved.
- [ ] P09-M24-03-06 — Connect the UI to real APIs and remove temporary production-blocking mock data.
- [ ] P09-M24-03-07 — Verify responsive, loading, empty, validation, success and error states.

- [ ] P09-M24-03-08 — Integrate and verify: Call data.
- [ ] P09-M24-03-09 — Integrate and verify: Provider usage/cost data when available.
- [ ] P09-M24-03-10 — Handle provider timeout, unavailable, invalid-response and retry scenarios where applicable.

### Submodule 24.04 — Security & QA

- [ ] P09-M24-04-01 — Tenant-scoped aggregation.
- [ ] P09-M24-04-02 — Admin cost visibility separated from customer visibility.
- [ ] P09-M24-04-03 — Verify tenant isolation for all tenant-owned records and actions.

- [ ] P09-M24-04-04 — Test: Metrics match source calls.
- [ ] P09-M24-04-05 — Test: Date filters.
- [ ] P09-M24-04-06 — Test: Tenant isolation.
- [ ] P09-M24-04-07 — Test: Empty dataset.
- [ ] P09-M24-04-08 — Run regression checks for directly affected existing modules.
- [ ] P09-M24-04-09 — Complete manual QA of the end-to-end user journey.

### Submodule 24.05 — Documentation & Acceptance

- [ ] P09-M24-05-01 — Update the Master Module Registry status and dependencies.
- [ ] P09-M24-05-02 — Document database/API/provider changes introduced by this module.
- [ ] P09-M24-05-03 — Update environment-variable/example configuration documentation if this module introduces new configuration.
- [ ] P09-M24-05-04 — Create/update the **Manual QA Handoff** guide for **Analytics** at `docs/module-24/M24_Analytics_manual-qa-guide.md` (or the repository's canonical equivalent). It must explain what the module is, its role in the project, delivered scope, roles/permissions, routes/APIs, data/integrations, complete user workflows, prerequisites/test data, happy/negative/edge/security/tenant test cases, expected results, regression scope, known limitations, bug-reporting requirements, evidence expectations, and QA sign-off checklist.


- [ ] P09-M24-GATE — Final acceptance: all module-specific checklist items above are verified, `VS-GLOBAL-01` through `VS-GLOBAL-16` pass, documentation/registry are current, and the module is accepted before the next module starts.

**Module Gate:** `[M24] Analytics = COMPLETE ✅` only after every required checkbox above is verified.

## Module 25 — Subscription Plans `M25`

**Target:** Commercial

**Dependencies:** M03


### Submodule 25.01 — Scope & Technical Design

- [ ] P09-M25-01-01 — Confirm the objective and boundaries of **Subscription Plans**.
- [ ] P09-M25-01-02 — Define plans
- [ ] P09-M25-01-03 — Define plan features/entitlements
- [ ] P09-M25-01-04 — Assign subscription
- [ ] P09-M25-01-05 — Trial support foundation
- [ ] P09-M25-01-06 — Enforce agent/business/minute/number limits
- [ ] P09-M25-01-07 — Feature gates
- [ ] P09-M25-01-08 — Plan comparison metadata
- [ ] P09-M25-01-09 — Explicitly document what is out of scope for this module so later-phase work is not pulled forward.

### Submodule 25.02 — Backend, Persistence & API

- [ ] P09-M25-02-01 — Implement/confirm data requirement: `plans`.
- [ ] P09-M25-02-02 — Implement/confirm data requirement: `plan_features`.
- [ ] P09-M25-02-03 — Implement/confirm data requirement: `subscriptions`.
- [ ] P09-M25-02-04 — Implement/confirm data requirement: `subscription_items or entitlements`.
- [ ] P09-M25-02-05 — Create and test migrations for this module without destructive uncontrolled schema synchronization.
- [ ] P09-M25-02-06 — Confirm organization/business ownership keys and foreign-key behavior for tenant-owned records.

- [ ] P09-M25-02-07 — Create/update the NestJS module boundaries, services and domain logic for **Subscription Plans**.
- [ ] P09-M25-02-08 — Keep provider-specific implementation outside core business rules wherever the provider abstraction applies.
- [ ] P09-M25-02-09 — Add consistent error handling, logging and retry/idempotency behavior where required.

- [ ] P09-M25-02-10 — Implement/verify API contract: `GET /api/v1/plans`.
- [ ] P09-M25-02-11 — Implement/verify API contract: `GET /api/v1/subscription`.
- [ ] P09-M25-02-12 — Implement/verify API contract: `Internal/admin plan management endpoints`.
- [ ] P09-M25-02-13 — Add DTO/schema validation and consistent API error responses.

### Submodule 25.03 — Frontend & Integrations

- [ ] P09-M25-03-01 — Build/complete frontend requirement: Pricing/plan view.
- [ ] P09-M25-03-02 — Build/complete frontend requirement: Current subscription.
- [ ] P09-M25-03-03 — Build/complete frontend requirement: Feature-limit messages.
- [ ] P09-M25-03-04 — Build/complete frontend requirement: Upgrade CTA.
- [ ] P09-M25-03-05 — Connect the UI to real APIs and remove temporary production-blocking mock data.
- [ ] P09-M25-03-06 — Verify responsive, loading, empty, validation, success and error states.

- [ ] P09-M25-03-07 — Confirm this module has no direct external-provider dependency or that dependencies are already abstracted.

### Submodule 25.04 — Security & QA

- [ ] P09-M25-04-01 — Server-side entitlement enforcement.
- [ ] P09-M25-04-02 — Admin-only plan mutations.
- [ ] P09-M25-04-03 — Verify tenant isolation for all tenant-owned records and actions.

- [ ] P09-M25-04-04 — Test: Plan features resolve correctly.
- [ ] P09-M25-04-05 — Test: Limit enforcement.
- [ ] P09-M25-04-06 — Test: Unauthorized feature blocked.
- [ ] P09-M25-04-07 — Test: Trial entitlement.
- [ ] P09-M25-04-08 — Run regression checks for directly affected existing modules.
- [ ] P09-M25-04-09 — Complete manual QA of the end-to-end user journey.

### Submodule 25.05 — Documentation & Acceptance

- [ ] P09-M25-05-01 — Update the Master Module Registry status and dependencies.
- [ ] P09-M25-05-02 — Document database/API/provider changes introduced by this module.
- [ ] P09-M25-05-03 — Update environment-variable/example configuration documentation if this module introduces new configuration.
- [ ] P09-M25-05-04 — Create/update the **Manual QA Handoff** guide for **Subscription Plans** at `docs/module-25/M25_Subscription_Plans_manual-qa-guide.md` (or the repository's canonical equivalent). It must explain what the module is, its role in the project, delivered scope, roles/permissions, routes/APIs, data/integrations, complete user workflows, prerequisites/test data, happy/negative/edge/security/tenant test cases, expected results, regression scope, known limitations, bug-reporting requirements, evidence expectations, and QA sign-off checklist.


- [ ] P09-M25-GATE — Final acceptance: all module-specific checklist items above are verified, `VS-GLOBAL-01` through `VS-GLOBAL-16` pass, documentation/registry are current, and the module is accepted before the next module starts.

**Module Gate:** `[M25] Subscription Plans = COMPLETE ✅` only after every required checkbox above is verified.

## Module 26 — Usage Metering `M26`

**Target:** Commercial

**Dependencies:** M12, M25


### Submodule 26.01 — Scope & Technical Design

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

### Submodule 26.02 — Backend, Persistence & API

- [ ] P09-M26-02-01 — Implement/confirm data requirement: `usage_records`.
- [ ] P09-M26-02-02 — Implement/confirm data requirement: `usage_aggregates`.
- [ ] P09-M26-02-03 — Implement/confirm data requirement: `provider_usage_records`.
- [ ] P09-M26-02-04 — Create and test migrations for this module without destructive uncontrolled schema synchronization.
- [ ] P09-M26-02-05 — Confirm organization/business ownership keys and foreign-key behavior for tenant-owned records.

- [ ] P09-M26-02-06 — Create/update the NestJS module boundaries, services and domain logic for **Usage Metering**.
- [ ] P09-M26-02-07 — Keep provider-specific implementation outside core business rules wherever the provider abstraction applies.
- [ ] P09-M26-02-08 — Add consistent error handling, logging and retry/idempotency behavior where required.

- [ ] P09-M26-02-09 — Implement/verify API contract: `GET /api/v1/usage`.
- [ ] P09-M26-02-10 — Implement/verify API contract: `GET /api/v1/usage/current-period`.
- [ ] P09-M26-02-11 — Implement/verify API contract: `Internal provider reconciliation endpoints`.
- [ ] P09-M26-02-12 — Add DTO/schema validation and consistent API error responses.

### Submodule 26.03 — Frontend & Integrations

- [ ] P09-M26-03-01 — Build/complete frontend requirement: Usage dashboard.
- [ ] P09-M26-03-02 — Build/complete frontend requirement: Included/used/remaining.
- [ ] P09-M26-03-03 — Build/complete frontend requirement: Usage breakdown.
- [ ] P09-M26-03-04 — Build/complete frontend requirement: Limit warnings.
- [ ] P09-M26-03-05 — Connect the UI to real APIs and remove temporary production-blocking mock data.
- [ ] P09-M26-03-06 — Verify responsive, loading, empty, validation, success and error states.

- [ ] P09-M26-03-07 — Integrate and verify: Twilio usage.
- [ ] P09-M26-03-08 — Integrate and verify: ElevenLabs usage.
- [ ] P09-M26-03-09 — Integrate and verify: Storage metrics.
- [ ] P09-M26-03-10 — Integrate and verify: Future LLM providers.
- [ ] P09-M26-03-11 — Handle provider timeout, unavailable, invalid-response and retry scenarios where applicable.

### Submodule 26.04 — Security & QA

- [ ] P09-M26-04-01 — Tenant-scoped usage.
- [ ] P09-M26-04-02 — Provider raw cost restricted appropriately.
- [ ] P09-M26-04-03 — Verify tenant isolation for all tenant-owned records and actions.

- [ ] P09-M26-04-04 — Test: Idempotent usage ingestion.
- [ ] P09-M26-04-05 — Test: Aggregation accuracy.
- [ ] P09-M26-04-06 — Test: Billing-period rollover.
- [ ] P09-M26-04-07 — Test: Provider reconciliation.
- [ ] P09-M26-04-08 — Run regression checks for directly affected existing modules.
- [ ] P09-M26-04-09 — Complete manual QA of the end-to-end user journey.

### Submodule 26.05 — Documentation & Acceptance

- [ ] P09-M26-05-01 — Update the Master Module Registry status and dependencies.
- [ ] P09-M26-05-02 — Document database/API/provider changes introduced by this module.
- [ ] P09-M26-05-03 — Update environment-variable/example configuration documentation if this module introduces new configuration.
- [ ] P09-M26-05-04 — Create/update the **Manual QA Handoff** guide for **Usage Metering** at `docs/module-26/M26_Usage_Metering_manual-qa-guide.md` (or the repository's canonical equivalent). It must explain what the module is, its role in the project, delivered scope, roles/permissions, routes/APIs, data/integrations, complete user workflows, prerequisites/test data, happy/negative/edge/security/tenant test cases, expected results, regression scope, known limitations, bug-reporting requirements, evidence expectations, and QA sign-off checklist.


- [ ] P09-M26-GATE — Final acceptance: all module-specific checklist items above are verified, `VS-GLOBAL-01` through `VS-GLOBAL-16` pass, documentation/registry are current, and the module is accepted before the next module starts.

**Module Gate:** `[M26] Usage Metering = COMPLETE ✅` only after every required checkbox above is verified.

## Module 27 — Billing `M27`

**Target:** Commercial

**Dependencies:** M25, M26


### Submodule 27.01 — Scope & Technical Design

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

### Submodule 27.02 — Backend, Persistence & API

- [ ] P09-M27-02-01 — Implement/confirm data requirement: `subscriptions`.
- [ ] P09-M27-02-02 — Implement/confirm data requirement: `invoices`.
- [ ] P09-M27-02-03 — Implement/confirm data requirement: `billing_events`.
- [ ] P09-M27-02-04 — Implement/confirm data requirement: `provider customer/subscription mappings`.
- [ ] P09-M27-02-05 — Create and test migrations for this module without destructive uncontrolled schema synchronization.
- [ ] P09-M27-02-06 — Confirm organization/business ownership keys and foreign-key behavior for tenant-owned records.

- [ ] P09-M27-02-07 — Create/update the NestJS module boundaries, services and domain logic for **Billing**.
- [ ] P09-M27-02-08 — Keep provider-specific implementation outside core business rules wherever the provider abstraction applies.
- [ ] P09-M27-02-09 — Add consistent error handling, logging and retry/idempotency behavior where required.

- [ ] P09-M27-02-10 — Implement/verify API contract: `Billing checkout/session endpoints`.
- [ ] P09-M27-02-11 — Implement/verify API contract: `Customer portal endpoint`.
- [ ] P09-M27-02-12 — Implement/verify API contract: `Stripe/provider webhook endpoints`.
- [ ] P09-M27-02-13 — Add DTO/schema validation and consistent API error responses.

### Submodule 27.03 — Frontend & Integrations

- [ ] P09-M27-03-01 — Build/complete frontend requirement: Billing overview.
- [ ] P09-M27-03-02 — Build/complete frontend requirement: Plan change.
- [ ] P09-M27-03-03 — Build/complete frontend requirement: Payment method.
- [ ] P09-M27-03-04 — Build/complete frontend requirement: Invoices.
- [ ] P09-M27-03-05 — Build/complete frontend requirement: Payment-failure state.
- [ ] P09-M27-03-06 — Connect the UI to real APIs and remove temporary production-blocking mock data.
- [ ] P09-M27-03-07 — Verify responsive, loading, empty, validation, success and error states.

- [ ] P09-M27-03-08 — Integrate and verify: Stripe or approved billing provider.
- [ ] P09-M27-03-09 — Handle provider timeout, unavailable, invalid-response and retry scenarios where applicable.

### Submodule 27.04 — Security & QA

- [ ] P09-M27-04-01 — Webhook signature verification.
- [ ] P09-M27-04-02 — No raw card storage.
- [ ] P09-M27-04-03 — Idempotent billing events.
- [ ] P09-M27-04-04 — Admin/customer authorization.
- [ ] P09-M27-04-05 — Verify tenant isolation for all tenant-owned records and actions.

- [ ] P09-M27-04-06 — Test: Checkout.
- [ ] P09-M27-04-07 — Test: Subscription activation.
- [ ] P09-M27-04-08 — Test: Upgrade/downgrade.
- [ ] P09-M27-04-09 — Test: Failed payment.
- [ ] P09-M27-04-10 — Test: Webhook replay/idempotency.
- [ ] P09-M27-04-11 — Test: Invoice display.
- [ ] P09-M27-04-12 — Run regression checks for directly affected existing modules.
- [ ] P09-M27-04-13 — Complete manual QA of the end-to-end user journey.

### Submodule 27.05 — Documentation & Acceptance

- [ ] P09-M27-05-01 — Update the Master Module Registry status and dependencies.
- [ ] P09-M27-05-02 — Document database/API/provider changes introduced by this module.
- [ ] P09-M27-05-03 — Update environment-variable/example configuration documentation if this module introduces new configuration.
- [ ] P09-M27-05-04 — Create/update the **Manual QA Handoff** guide for **Billing** at `docs/module-27/M27_Billing_manual-qa-guide.md` (or the repository's canonical equivalent). It must explain what the module is, its role in the project, delivered scope, roles/permissions, routes/APIs, data/integrations, complete user workflows, prerequisites/test data, happy/negative/edge/security/tenant test cases, expected results, regression scope, known limitations, bug-reporting requirements, evidence expectations, and QA sign-off checklist.


- [ ] P09-M27-GATE — Final acceptance: all module-specific checklist items above are verified, `VS-GLOBAL-01` through `VS-GLOBAL-16` pass, documentation/registry are current, and the module is accepted before the next module starts.

**Module Gate:** `[M27] Billing = COMPLETE ✅` only after every required checkbox above is verified.
---

# PHASE 10 — Admin & Production

- [ ] P10-GATE — Phase 10 is complete only when every required module below is accepted.


## Module 28 — Admin Portal `M28`

**Target:** Commercial

**Dependencies:** M02, M03, M14, M25, M26, M27


### Submodule 28.01 — Scope & Technical Design

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

### Submodule 28.02 — Backend, Persistence & API

- [ ] P10-M28-02-01 — Implement/confirm data requirement: `Uses existing domain tables plus admin/support metadata`.
- [ ] P10-M28-02-02 — Create and test migrations for this module without destructive uncontrolled schema synchronization.
- [ ] P10-M28-02-03 — Confirm organization/business ownership keys and foreign-key behavior for tenant-owned records.

- [ ] P10-M28-02-04 — Create/update the NestJS module boundaries, services and domain logic for **Admin Portal**.
- [ ] P10-M28-02-05 — Keep provider-specific implementation outside core business rules wherever the provider abstraction applies.
- [ ] P10-M28-02-06 — Add consistent error handling, logging and retry/idempotency behavior where required.

- [ ] P10-M28-02-07 — Implement/verify API contract: `Admin-scoped endpoints or admin authorization over existing APIs`.
- [ ] P10-M28-02-08 — Add DTO/schema validation and consistent API error responses.

### Submodule 28.03 — Frontend & Integrations

- [ ] P10-M28-03-01 — Build/complete frontend requirement: Admin layout/navigation.
- [ ] P10-M28-03-02 — Build/complete frontend requirement: Management tables.
- [ ] P10-M28-03-03 — Build/complete frontend requirement: Detail views.
- [ ] P10-M28-03-04 — Build/complete frontend requirement: Provider/system views.
- [ ] P10-M28-03-05 — Build/complete frontend requirement: Support actions.
- [ ] P10-M28-03-06 — Connect the UI to real APIs and remove temporary production-blocking mock data.
- [ ] P10-M28-03-07 — Verify responsive, loading, empty, validation, success and error states.

- [ ] P10-M28-03-08 — Confirm this module has no direct external-provider dependency or that dependencies are already abstracted.

### Submodule 28.04 — Security & QA

- [ ] P10-M28-04-01 — Strict admin authorization.
- [ ] P10-M28-04-02 — Audit every destructive/support action.
- [ ] P10-M28-04-03 — Customer portal roles cannot access admin routes.
- [ ] P10-M28-04-04 — Verify tenant isolation for all tenant-owned records and actions.

- [ ] P10-M28-04-05 — Test: Non-admin blocked.
- [ ] P10-M28-04-06 — Test: Admin list/detail flows.
- [ ] P10-M28-04-07 — Test: Support action audited.
- [ ] P10-M28-04-08 — Test: Cross-tenant admin view works only with explicit admin authority.
- [ ] P10-M28-04-09 — Run regression checks for directly affected existing modules.
- [ ] P10-M28-04-10 — Complete manual QA of the end-to-end user journey.

### Submodule 28.05 — Documentation & Acceptance

- [ ] P10-M28-05-01 — Update the Master Module Registry status and dependencies.
- [ ] P10-M28-05-02 — Document database/API/provider changes introduced by this module.
- [ ] P10-M28-05-03 — Update environment-variable/example configuration documentation if this module introduces new configuration.
- [ ] P10-M28-05-04 — Create/update the **Manual QA Handoff** guide for **Admin Portal** at `docs/module-28/M28_Admin_Portal_manual-qa-guide.md` (or the repository's canonical equivalent). It must explain what the module is, its role in the project, delivered scope, roles/permissions, routes/APIs, data/integrations, complete user workflows, prerequisites/test data, happy/negative/edge/security/tenant test cases, expected results, regression scope, known limitations, bug-reporting requirements, evidence expectations, and QA sign-off checklist.


- [ ] P10-M28-GATE — Final acceptance: all module-specific checklist items above are verified, `VS-GLOBAL-01` through `VS-GLOBAL-16` pass, documentation/registry are current, and the module is accepted before the next module starts.

**Module Gate:** `[M28] Admin Portal = COMPLETE ✅` only after every required checkbox above is verified.

## Module 29 — Security, Audit & Monitoring `M29`

**Target:** Commercial

**Dependencies:** M28


### Submodule 29.01 — Scope & Technical Design

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

### Submodule 29.02 — Backend, Persistence & API

- [ ] P10-M29-02-01 — Implement/confirm data requirement: `audit_logs`.
- [ ] P10-M29-02-02 — Implement/confirm data requirement: `provider_logs`.
- [ ] P10-M29-02-03 — Implement/confirm data requirement: `system_events`.
- [ ] P10-M29-02-04 — Create and test migrations for this module without destructive uncontrolled schema synchronization.
- [ ] P10-M29-02-05 — Confirm organization/business ownership keys and foreign-key behavior for tenant-owned records.

- [ ] P10-M29-02-06 — Create/update the NestJS module boundaries, services and domain logic for **Security, Audit & Monitoring**.
- [ ] P10-M29-02-07 — Keep provider-specific implementation outside core business rules wherever the provider abstraction applies.
- [ ] P10-M29-02-08 — Add consistent error handling, logging and retry/idempotency behavior where required.

- [ ] P10-M29-02-09 — Implement/verify API contract: `Admin audit/system endpoints as appropriate`.
- [ ] P10-M29-02-10 — Add DTO/schema validation and consistent API error responses.

### Submodule 29.03 — Frontend & Integrations

- [ ] P10-M29-03-01 — Build/complete frontend requirement: Audit log viewer.
- [ ] P10-M29-03-02 — Build/complete frontend requirement: System health/alerts.
- [ ] P10-M29-03-03 — Build/complete frontend requirement: Security-related admin settings where appropriate.
- [ ] P10-M29-03-04 — Connect the UI to real APIs and remove temporary production-blocking mock data.
- [ ] P10-M29-03-05 — Verify responsive, loading, empty, validation, success and error states.

- [ ] P10-M29-03-06 — Integrate and verify: Monitoring/logging platform.
- [ ] P10-M29-03-07 — Integrate and verify: Backup/storage services.
- [ ] P10-M29-03-08 — Handle provider timeout, unavailable, invalid-response and retry scenarios where applicable.

### Submodule 29.04 — Security & QA

- [ ] P10-M29-04-01 — Least privilege.
- [ ] P10-M29-04-02 — Encryption in transit.
- [ ] P10-M29-04-03 — Sensitive credential encryption.
- [ ] P10-M29-04-04 — Voice-consent controls.
- [ ] P10-M29-04-05 — Verify tenant isolation for all tenant-owned records and actions.

- [ ] P10-M29-04-06 — Test: Tenant escape tests.
- [ ] P10-M29-04-07 — Test: RBAC matrix tests.
- [ ] P10-M29-04-08 — Test: Webhook spoof rejection.
- [ ] P10-M29-04-09 — Test: Rate-limit tests.
- [ ] P10-M29-04-10 — Test: Backup restore drill.
- [ ] P10-M29-04-11 — Test: Audit completeness.
- [ ] P10-M29-04-12 — Run regression checks for directly affected existing modules.
- [ ] P10-M29-04-13 — Complete manual QA of the end-to-end user journey.

### Submodule 29.05 — Documentation & Acceptance

- [ ] P10-M29-05-01 — Update the Master Module Registry status and dependencies.
- [ ] P10-M29-05-02 — Document database/API/provider changes introduced by this module.
- [ ] P10-M29-05-03 — Update environment-variable/example configuration documentation if this module introduces new configuration.
- [ ] P10-M29-05-04 — Create/update the **Manual QA Handoff** guide for **Security, Audit & Monitoring** at `docs/module-29/M29_Security_Audit_and_Monitoring_manual-qa-guide.md` (or the repository's canonical equivalent). It must explain what the module is, its role in the project, delivered scope, roles/permissions, routes/APIs, data/integrations, complete user workflows, prerequisites/test data, happy/negative/edge/security/tenant test cases, expected results, regression scope, known limitations, bug-reporting requirements, evidence expectations, and QA sign-off checklist.


- [ ] P10-M29-GATE — Final acceptance: all module-specific checklist items above are verified, `VS-GLOBAL-01` through `VS-GLOBAL-16` pass, documentation/registry are current, and the module is accepted before the next module starts.

**Module Gate:** `[M29] Security, Audit & Monitoring = COMPLETE ✅` only after every required checkbox above is verified.
---

# PHASE 11 — Multi-Provider Future

- [ ] P11-GATE — Phase 11 is complete only when every required module below is accepted.


## Module 30 — Retell Voice Agent Provider `M30`

**Target:** Future

**Dependencies:** M05, M07, M08, M17


### Submodule 30.01 — Scope & Technical Design

- [ ] P11-M30-01-01 — Confirm the objective and boundaries of **Retell Voice Agent Provider**.
- [ ] P11-M30-01-02 — Implement Retell behind VoiceAgentProvider
- [ ] P11-M30-01-03 — Create/update/delete provider agent
- [ ] P11-M30-01-04 — Map voice/knowledge/tools
- [ ] P11-M30-01-05 — Normalize call/provider events
- [ ] P11-M30-01-06 — Store provider mapping
- [ ] P11-M30-01-07 — Provider health/retry
- [ ] P11-M30-01-08 — Explicitly document what is out of scope for this module so later-phase work is not pulled forward.

### Submodule 30.02 — Backend, Persistence & API

- [ ] P11-M30-02-01 — Implement/confirm data requirement: `agent_provider_mappings`.
- [ ] P11-M30-02-02 — Implement/confirm data requirement: `provider_logs`.
- [ ] P11-M30-02-03 — Create and test migrations for this module without destructive uncontrolled schema synchronization.
- [ ] P11-M30-02-04 — Confirm organization/business ownership keys and foreign-key behavior for tenant-owned records.

- [ ] P11-M30-02-05 — Create/update the NestJS module boundaries, services and domain logic for **Retell Voice Agent Provider**.
- [ ] P11-M30-02-06 — Keep provider-specific implementation outside core business rules wherever the provider abstraction applies.
- [ ] P11-M30-02-07 — Add consistent error handling, logging and retry/idempotency behavior where required.

- [ ] P11-M30-02-08 — Implement/verify API contract: `Internal provider adapter; no SaaS-wide API redesign`.
- [ ] P11-M30-02-09 — Add DTO/schema validation and consistent API error responses.

### Submodule 30.03 — Frontend & Integrations

- [ ] P11-M30-03-01 — Build/complete frontend requirement: Provider selection/status only where product scope allows.
- [ ] P11-M30-03-02 — Connect the UI to real APIs and remove temporary production-blocking mock data.
- [ ] P11-M30-03-03 — Verify responsive, loading, empty, validation, success and error states.

- [ ] P11-M30-03-04 — Integrate and verify: Retell AI.
- [ ] P11-M30-03-05 — Handle provider timeout, unavailable, invalid-response and retry scenarios where applicable.

### Submodule 30.04 — Security & QA

- [ ] P11-M30-04-01 — Server-side credentials.
- [ ] P11-M30-04-02 — Webhook verification.
- [ ] P11-M30-04-03 — Tenant-safe mapping.
- [ ] P11-M30-04-04 — Verify tenant isolation for all tenant-owned records and actions.

- [ ] P11-M30-04-05 — Test: Same provider contract tests as ElevenLabs.
- [ ] P11-M30-04-06 — Test: Agent migration/config sync test.
- [ ] P11-M30-04-07 — Test: Failure normalization.
- [ ] P11-M30-04-08 — Run regression checks for directly affected existing modules.
- [ ] P11-M30-04-09 — Complete manual QA of the end-to-end user journey.

### Submodule 30.05 — Documentation & Acceptance

- [ ] P11-M30-05-01 — Update the Master Module Registry status and dependencies.
- [ ] P11-M30-05-02 — Document database/API/provider changes introduced by this module.
- [ ] P11-M30-05-03 — Update environment-variable/example configuration documentation if this module introduces new configuration.
- [ ] P11-M30-05-04 — Create/update the **Manual QA Handoff** guide for **Retell Voice Agent Provider** at `docs/module-30/M30_Retell_Voice_Agent_Provider_manual-qa-guide.md` (or the repository's canonical equivalent). It must explain what the module is, its role in the project, delivered scope, roles/permissions, routes/APIs, data/integrations, complete user workflows, prerequisites/test data, happy/negative/edge/security/tenant test cases, expected results, regression scope, known limitations, bug-reporting requirements, evidence expectations, and QA sign-off checklist.


- [ ] P11-M30-GATE — Final acceptance: all module-specific checklist items above are verified, `VS-GLOBAL-01` through `VS-GLOBAL-16` pass, documentation/registry are current, and the module is accepted before the next module starts.

**Module Gate:** `[M30] Retell Voice Agent Provider = COMPLETE ✅` only after every required checkbox above is verified.

## Module 31 — OpenAI Realtime Provider `M31`

**Target:** Future

**Dependencies:** M05, M10, M17


### Submodule 31.01 — Scope & Technical Design

- [ ] P11-M31-01-01 — Confirm the objective and boundaries of **OpenAI Realtime Provider**.
- [ ] P11-M31-01-02 — Refactor preserved openai-realtime and voice-stream code into VoiceAgentProvider
- [ ] P11-M31-01-03 — Maintain realtime WebSocket/session bridge
- [ ] P11-M31-01-04 — Support audio input/output
- [ ] P11-M31-01-05 — Interruption/turn handling
- [ ] P11-M31-01-06 — Tool calling
- [ ] P11-M31-01-07 — Normalize session/call events
- [ ] P11-M31-01-08 — Observability and retry/reconnect strategy
- [ ] P11-M31-01-09 — Explicitly document what is out of scope for this module so later-phase work is not pulled forward.

### Submodule 31.02 — Backend, Persistence & API

- [ ] P11-M31-02-01 — Implement/confirm data requirement: `agent_provider_mappings`.
- [ ] P11-M31-02-02 — Implement/confirm data requirement: `provider_logs`.
- [ ] P11-M31-02-03 — Implement/confirm data requirement: `call events`.
- [ ] P11-M31-02-04 — Create and test migrations for this module without destructive uncontrolled schema synchronization.
- [ ] P11-M31-02-05 — Confirm organization/business ownership keys and foreign-key behavior for tenant-owned records.

- [ ] P11-M31-02-06 — Create/update the NestJS module boundaries, services and domain logic for **OpenAI Realtime Provider**.
- [ ] P11-M31-02-07 — Keep provider-specific implementation outside core business rules wherever the provider abstraction applies.
- [ ] P11-M31-02-08 — Add consistent error handling, logging and retry/idempotency behavior where required.

- [ ] P11-M31-02-09 — Implement/verify API contract: `Realtime/WebSocket endpoints and internal provider methods`.
- [ ] P11-M31-02-10 — Add DTO/schema validation and consistent API error responses.

### Submodule 31.03 — Frontend & Integrations

- [ ] P11-M31-03-01 — Build/complete frontend requirement: Provider selection/status if enabled.
- [ ] P11-M31-03-02 — Build/complete frontend requirement: Latency/error diagnostics for admin.
- [ ] P11-M31-03-03 — Connect the UI to real APIs and remove temporary production-blocking mock data.
- [ ] P11-M31-03-04 — Verify responsive, loading, empty, validation, success and error states.

- [ ] P11-M31-03-05 — Integrate and verify: OpenAI Realtime.
- [ ] P11-M31-03-06 — Integrate and verify: Twilio or telephony provider.
- [ ] P11-M31-03-07 — Handle provider timeout, unavailable, invalid-response and retry scenarios where applicable.

### Submodule 31.04 — Security & QA

- [ ] P11-M31-04-01 — Provider secret server-side.
- [ ] P11-M31-04-02 — WebSocket authentication/validation.
- [ ] P11-M31-04-03 — Audio/session isolation per tenant/call.
- [ ] P11-M31-04-04 — Verify tenant isolation for all tenant-owned records and actions.

- [ ] P11-M31-04-05 — Test: Realtime connection.
- [ ] P11-M31-04-06 — Test: Bidirectional audio.
- [ ] P11-M31-04-07 — Test: Interruption.
- [ ] P11-M31-04-08 — Test: Tool call.
- [ ] P11-M31-04-09 — Test: Disconnect/reconnect.
- [ ] P11-M31-04-10 — Test: Concurrent-call isolation.
- [ ] P11-M31-04-11 — Run regression checks for directly affected existing modules.
- [ ] P11-M31-04-12 — Complete manual QA of the end-to-end user journey.

### Submodule 31.05 — Documentation & Acceptance

- [ ] P11-M31-05-01 — Update the Master Module Registry status and dependencies.
- [ ] P11-M31-05-02 — Document database/API/provider changes introduced by this module.
- [ ] P11-M31-05-03 — Update environment-variable/example configuration documentation if this module introduces new configuration.
- [ ] P11-M31-05-04 — Create/update the **Manual QA Handoff** guide for **OpenAI Realtime Provider** at `docs/module-31/M31_OpenAI_Realtime_Provider_manual-qa-guide.md` (or the repository's canonical equivalent). It must explain what the module is, its role in the project, delivered scope, roles/permissions, routes/APIs, data/integrations, complete user workflows, prerequisites/test data, happy/negative/edge/security/tenant test cases, expected results, regression scope, known limitations, bug-reporting requirements, evidence expectations, and QA sign-off checklist.


- [ ] P11-M31-GATE — Final acceptance: all module-specific checklist items above are verified, `VS-GLOBAL-01` through `VS-GLOBAL-16` pass, documentation/registry are current, and the module is accepted before the next module starts.

**Module Gate:** `[M31] OpenAI Realtime Provider = COMPLETE ✅` only after every required checkbox above is verified.

## Module 32 — Telnyx Telephony Provider `M32`

**Target:** Future

**Dependencies:** M10, M11


### Submodule 32.01 — Scope & Technical Design

- [ ] P11-M32-01-01 — Confirm the objective and boundaries of **Telnyx Telephony Provider**.
- [ ] P11-M32-01-02 — Implement Telnyx behind TelephonyProvider
- [ ] P11-M32-01-03 — Search/provision/configure/release numbers
- [ ] P11-M32-01-04 — Inbound/outbound routing
- [ ] P11-M32-01-05 — Webhook normalization
- [ ] P11-M32-01-06 — Provider mapping
- [ ] P11-M32-01-07 — Explicitly document what is out of scope for this module so later-phase work is not pulled forward.

### Submodule 32.02 — Backend, Persistence & API

- [ ] P11-M32-02-01 — Implement/confirm data requirement: `phone number/provider mappings`.
- [ ] P11-M32-02-02 — Implement/confirm data requirement: `provider logs`.
- [ ] P11-M32-02-03 — Create and test migrations for this module without destructive uncontrolled schema synchronization.
- [ ] P11-M32-02-04 — Confirm organization/business ownership keys and foreign-key behavior for tenant-owned records.

- [ ] P11-M32-02-05 — Create/update the NestJS module boundaries, services and domain logic for **Telnyx Telephony Provider**.
- [ ] P11-M32-02-06 — Keep provider-specific implementation outside core business rules wherever the provider abstraction applies.
- [ ] P11-M32-02-07 — Add consistent error handling, logging and retry/idempotency behavior where required.

- [ ] P11-M32-02-08 — Implement/verify API contract: `Telnyx webhook endpoints and internal adapter`.
- [ ] P11-M32-02-09 — Add DTO/schema validation and consistent API error responses.

### Submodule 32.03 — Frontend & Integrations

- [ ] P11-M32-03-01 — Build/complete frontend requirement: Provider option/status when enabled.
- [ ] P11-M32-03-02 — Connect the UI to real APIs and remove temporary production-blocking mock data.
- [ ] P11-M32-03-03 — Verify responsive, loading, empty, validation, success and error states.

- [ ] P11-M32-03-04 — Integrate and verify: Telnyx.
- [ ] P11-M32-03-05 — Handle provider timeout, unavailable, invalid-response and retry scenarios where applicable.

### Submodule 32.04 — Security & QA

- [ ] P11-M32-04-01 — Webhook verification.
- [ ] P11-M32-04-02 — Server-side credentials.
- [ ] P11-M32-04-03 — Verify tenant isolation for all tenant-owned records and actions.

- [ ] P11-M32-04-04 — Test: TelephonyProvider contract suite.
- [ ] P11-M32-04-05 — Test: Inbound routing.
- [ ] P11-M32-04-06 — Test: Number provisioning.
- [ ] P11-M32-04-07 — Test: Failure handling.
- [ ] P11-M32-04-08 — Run regression checks for directly affected existing modules.
- [ ] P11-M32-04-09 — Complete manual QA of the end-to-end user journey.

### Submodule 32.05 — Documentation & Acceptance

- [ ] P11-M32-05-01 — Update the Master Module Registry status and dependencies.
- [ ] P11-M32-05-02 — Document database/API/provider changes introduced by this module.
- [ ] P11-M32-05-03 — Update environment-variable/example configuration documentation if this module introduces new configuration.
- [ ] P11-M32-05-04 — Create/update the **Manual QA Handoff** guide for **Telnyx Telephony Provider** at `docs/module-32/M32_Telnyx_Telephony_Provider_manual-qa-guide.md` (or the repository's canonical equivalent). It must explain what the module is, its role in the project, delivered scope, roles/permissions, routes/APIs, data/integrations, complete user workflows, prerequisites/test data, happy/negative/edge/security/tenant test cases, expected results, regression scope, known limitations, bug-reporting requirements, evidence expectations, and QA sign-off checklist.


- [ ] P11-M32-GATE — Final acceptance: all module-specific checklist items above are verified, `VS-GLOBAL-01` through `VS-GLOBAL-16` pass, documentation/registry are current, and the module is accepted before the next module starts.

**Module Gate:** `[M32] Telnyx Telephony Provider = COMPLETE ✅` only after every required checkbox above is verified.
---

# PHASE 12 — Platform Expansion

- [ ] P12-GATE — Phase 12 is complete only when every required module below is accepted.


## Module 33 — Developer / Integration Portal `M33`

**Target:** Future

**Dependencies:** M03, M17, M29


### Submodule 33.01 — Scope & Technical Design

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

### Submodule 33.02 — Backend, Persistence & API

- [ ] P12-M33-02-01 — Implement/confirm data requirement: `api_keys`.
- [ ] P12-M33-02-02 — Implement/confirm data requirement: `webhook_endpoints`.
- [ ] P12-M33-02-03 — Implement/confirm data requirement: `webhook_deliveries`.
- [ ] P12-M33-02-04 — Implement/confirm data requirement: `developer_apps as approved`.
- [ ] P12-M33-02-05 — Create and test migrations for this module without destructive uncontrolled schema synchronization.
- [ ] P12-M33-02-06 — Confirm organization/business ownership keys and foreign-key behavior for tenant-owned records.

- [ ] P12-M33-02-07 — Create/update the NestJS module boundaries, services and domain logic for **Developer / Integration Portal**.
- [ ] P12-M33-02-08 — Keep provider-specific implementation outside core business rules wherever the provider abstraction applies.
- [ ] P12-M33-02-09 — Add consistent error handling, logging and retry/idempotency behavior where required.

- [ ] P12-M33-02-10 — Implement/verify API contract: `Public API access management endpoints`.
- [ ] P12-M33-02-11 — Add DTO/schema validation and consistent API error responses.

### Submodule 33.03 — Frontend & Integrations

- [ ] P12-M33-03-01 — Build/complete frontend requirement: Developer dashboard.
- [ ] P12-M33-03-02 — Build/complete frontend requirement: API key management.
- [ ] P12-M33-03-03 — Build/complete frontend requirement: Webhook configuration/logs.
- [ ] P12-M33-03-04 — Build/complete frontend requirement: Docs navigation.
- [ ] P12-M33-03-05 — Connect the UI to real APIs and remove temporary production-blocking mock data.
- [ ] P12-M33-03-06 — Verify responsive, loading, empty, validation, success and error states.

- [ ] P12-M33-03-07 — Confirm this module has no direct external-provider dependency or that dependencies are already abstracted.

### Submodule 33.04 — Security & QA

- [ ] P12-M33-04-01 — Hashed/revocable API keys.
- [ ] P12-M33-04-02 — Scoped permissions.
- [ ] P12-M33-04-03 — Rate limits.
- [ ] P12-M33-04-04 — Webhook signing.
- [ ] P12-M33-04-05 — Audit.
- [ ] P12-M33-04-06 — Verify tenant isolation for all tenant-owned records and actions.

- [ ] P12-M33-04-07 — Test: Create/revoke key.
- [ ] P12-M33-04-08 — Test: Scope enforcement.
- [ ] P12-M33-04-09 — Test: Webhook signing.
- [ ] P12-M33-04-10 — Test: Rate limit.
- [ ] P12-M33-04-11 — Run regression checks for directly affected existing modules.
- [ ] P12-M33-04-12 — Complete manual QA of the end-to-end user journey.

### Submodule 33.05 — Documentation & Acceptance

- [ ] P12-M33-05-01 — Update the Master Module Registry status and dependencies.
- [ ] P12-M33-05-02 — Document database/API/provider changes introduced by this module.
- [ ] P12-M33-05-03 — Update environment-variable/example configuration documentation if this module introduces new configuration.
- [ ] P12-M33-05-04 — Create/update the **Manual QA Handoff** guide for **Developer / Integration Portal** at `docs/module-33/M33_Developer_Integration_Portal_manual-qa-guide.md` (or the repository's canonical equivalent). It must explain what the module is, its role in the project, delivered scope, roles/permissions, routes/APIs, data/integrations, complete user workflows, prerequisites/test data, happy/negative/edge/security/tenant test cases, expected results, regression scope, known limitations, bug-reporting requirements, evidence expectations, and QA sign-off checklist.


- [ ] P12-M33-GATE — Final acceptance: all module-specific checklist items above are verified, `VS-GLOBAL-01` through `VS-GLOBAL-16` pass, documentation/registry are current, and the module is accepted before the next module starts.

**Module Gate:** `[M33] Developer / Integration Portal = COMPLETE ✅` only after every required checkbox above is verified.

## Module 34 — Documentation / Help Center `M34`

**Target:** Future

**Dependencies:** M01


### Submodule 34.01 — Scope & Technical Design

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

### Submodule 34.02 — Backend, Persistence & API

- [ ] P12-M34-02-01 — Implement/confirm data requirement: `Documentation content source/versioning`.
- [ ] P12-M34-02-02 — Create and test migrations for this module without destructive uncontrolled schema synchronization.
- [ ] P12-M34-02-03 — Confirm organization/business ownership keys and foreign-key behavior for tenant-owned records.

- [ ] P12-M34-02-04 — Create/update the NestJS module boundaries, services and domain logic for **Documentation / Help Center**.
- [ ] P12-M34-02-05 — Keep provider-specific implementation outside core business rules wherever the provider abstraction applies.
- [ ] P12-M34-02-06 — Add consistent error handling, logging and retry/idempotency behavior where required.

- [ ] P12-M34-02-07 — Confirm whether public/customer APIs are required; avoid creating unnecessary endpoints.

### Submodule 34.03 — Frontend & Integrations

- [ ] P12-M34-03-01 — Build/complete frontend requirement: Searchable help center.
- [ ] P12-M34-03-02 — Build/complete frontend requirement: Article navigation.
- [ ] P12-M34-03-03 — Build/complete frontend requirement: Responsive docs layout.
- [ ] P12-M34-03-04 — Connect the UI to real APIs and remove temporary production-blocking mock data.
- [ ] P12-M34-03-05 — Verify responsive, loading, empty, validation, success and error states.

- [ ] P12-M34-03-06 — Integrate and verify: Optional docs/CMS/search platform.
- [ ] P12-M34-03-07 — Handle provider timeout, unavailable, invalid-response and retry scenarios where applicable.

### Submodule 34.04 — Security & QA

- [ ] P12-M34-04-01 — Do not publish secrets/internal operational details.
- [ ] P12-M34-04-02 — Verify tenant isolation for all tenant-owned records and actions.

- [ ] P12-M34-04-03 — Test: Broken-link check.
- [ ] P12-M34-04-04 — Test: Search/navigation.
- [ ] P12-M34-04-05 — Test: Responsive rendering.
- [ ] P12-M34-04-06 — Run regression checks for directly affected existing modules.
- [ ] P12-M34-04-07 — Complete manual QA of the end-to-end user journey.

### Submodule 34.05 — Documentation & Acceptance

- [ ] P12-M34-05-01 — Update the Master Module Registry status and dependencies.
- [ ] P12-M34-05-02 — Document database/API/provider changes introduced by this module.
- [ ] P12-M34-05-03 — Update environment-variable/example configuration documentation if this module introduces new configuration.
- [ ] P12-M34-05-04 — Create/update the **Manual QA Handoff** guide for **Documentation / Help Center** at `docs/module-34/M34_Documentation_Help_Center_manual-qa-guide.md` (or the repository's canonical equivalent). It must explain what the module is, its role in the project, delivered scope, roles/permissions, routes/APIs, data/integrations, complete user workflows, prerequisites/test data, happy/negative/edge/security/tenant test cases, expected results, regression scope, known limitations, bug-reporting requirements, evidence expectations, and QA sign-off checklist.


- [ ] P12-M34-GATE — Final acceptance: all module-specific checklist items above are verified, `VS-GLOBAL-01` through `VS-GLOBAL-16` pass, documentation/registry are current, and the module is accepted before the next module starts.

**Module Gate:** `[M34] Documentation / Help Center = COMPLETE ✅` only after every required checkbox above is verified.

## Module 35 — Operations / Support Console `M35`

**Target:** Future

**Dependencies:** M28, M29


### Submodule 35.01 — Scope & Technical Design

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

### Submodule 35.02 — Backend, Persistence & API

- [ ] P12-M35-02-01 — Implement/confirm data requirement: `system_events`.
- [ ] P12-M35-02-02 — Implement/confirm data requirement: `provider_logs`.
- [ ] P12-M35-02-03 — Implement/confirm data requirement: `operational metrics`.
- [ ] P12-M35-02-04 — Create and test migrations for this module without destructive uncontrolled schema synchronization.
- [ ] P12-M35-02-05 — Confirm organization/business ownership keys and foreign-key behavior for tenant-owned records.

- [ ] P12-M35-02-06 — Create/update the NestJS module boundaries, services and domain logic for **Operations / Support Console**.
- [ ] P12-M35-02-07 — Keep provider-specific implementation outside core business rules wherever the provider abstraction applies.
- [ ] P12-M35-02-08 — Add consistent error handling, logging and retry/idempotency behavior where required.

- [ ] P12-M35-02-09 — Implement/verify API contract: `Admin/ops monitoring endpoints`.
- [ ] P12-M35-02-10 — Implement/verify API contract: `Realtime stream/polling where justified`.
- [ ] P12-M35-02-11 — Add DTO/schema validation and consistent API error responses.

### Submodule 35.03 — Frontend & Integrations

- [ ] P12-M35-03-01 — Build/complete frontend requirement: Ops dashboard.
- [ ] P12-M35-03-02 — Build/complete frontend requirement: Live calls.
- [ ] P12-M35-03-03 — Build/complete frontend requirement: Incident view.
- [ ] P12-M35-03-04 — Build/complete frontend requirement: Failure queues.
- [ ] P12-M35-03-05 — Build/complete frontend requirement: Retry actions.
- [ ] P12-M35-03-06 — Connect the UI to real APIs and remove temporary production-blocking mock data.
- [ ] P12-M35-03-07 — Verify responsive, loading, empty, validation, success and error states.

- [ ] P12-M35-03-08 — Integrate and verify: Monitoring platform.
- [ ] P12-M35-03-09 — Integrate and verify: Queue system.
- [ ] P12-M35-03-10 — Integrate and verify: Providers.
- [ ] P12-M35-03-11 — Handle provider timeout, unavailable, invalid-response and retry scenarios where applicable.

### Submodule 35.04 — Security & QA

- [ ] P12-M35-04-01 — Ops-only access.
- [ ] P12-M35-04-02 — All remediation actions audited.
- [ ] P12-M35-04-03 — Verify tenant isolation for all tenant-owned records and actions.

- [ ] P12-M35-04-04 — Test: Unauthorized access blocked.
- [ ] P12-M35-04-05 — Test: Alert visibility.
- [ ] P12-M35-04-06 — Test: Retry action audit.
- [ ] P12-M35-04-07 — Test: Live data refresh.
- [ ] P12-M35-04-08 — Run regression checks for directly affected existing modules.
- [ ] P12-M35-04-09 — Complete manual QA of the end-to-end user journey.

### Submodule 35.05 — Documentation & Acceptance

- [ ] P12-M35-05-01 — Update the Master Module Registry status and dependencies.
- [ ] P12-M35-05-02 — Document database/API/provider changes introduced by this module.
- [ ] P12-M35-05-03 — Update environment-variable/example configuration documentation if this module introduces new configuration.
- [ ] P12-M35-05-04 — Create/update the **Manual QA Handoff** guide for **Operations / Support Console** at `docs/module-35/M35_Operations_Support_Console_manual-qa-guide.md` (or the repository's canonical equivalent). It must explain what the module is, its role in the project, delivered scope, roles/permissions, routes/APIs, data/integrations, complete user workflows, prerequisites/test data, happy/negative/edge/security/tenant test cases, expected results, regression scope, known limitations, bug-reporting requirements, evidence expectations, and QA sign-off checklist.


- [ ] P12-M35-GATE — Final acceptance: all module-specific checklist items above are verified, `VS-GLOBAL-01` through `VS-GLOBAL-16` pass, documentation/registry are current, and the module is accepted before the next module starts.

**Module Gate:** `[M35] Operations / Support Console = COMPLETE ✅` only after every required checkbox above is verified.

## Module 36 — Partner / Reseller / White-Label Portal `M36`

**Target:** Future

**Dependencies:** M25, M27, M28


### Submodule 36.01 — Scope & Technical Design

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

### Submodule 36.02 — Backend, Persistence & API

- [ ] P12-M36-02-01 — Implement/confirm data requirement: `partners`.
- [ ] P12-M36-02-02 — Implement/confirm data requirement: `partner_members`.
- [ ] P12-M36-02-03 — Implement/confirm data requirement: `partner_tenants`.
- [ ] P12-M36-02-04 — Implement/confirm data requirement: `partner_branding`.
- [ ] P12-M36-02-05 — Implement/confirm data requirement: `commission/revenue-share records`.
- [ ] P12-M36-02-06 — Create and test migrations for this module without destructive uncontrolled schema synchronization.
- [ ] P12-M36-02-07 — Confirm organization/business ownership keys and foreign-key behavior for tenant-owned records.

- [ ] P12-M36-02-08 — Create/update the NestJS module boundaries, services and domain logic for **Partner / Reseller / White-Label Portal**.
- [ ] P12-M36-02-09 — Keep provider-specific implementation outside core business rules wherever the provider abstraction applies.
- [ ] P12-M36-02-10 — Add consistent error handling, logging and retry/idempotency behavior where required.

- [ ] P12-M36-02-11 — Implement/verify API contract: `Partner-scoped account/provisioning/billing endpoints`.
- [ ] P12-M36-02-12 — Add DTO/schema validation and consistent API error responses.

### Submodule 36.03 — Frontend & Integrations

- [ ] P12-M36-03-01 — Build/complete frontend requirement: Partner dashboard.
- [ ] P12-M36-03-02 — Build/complete frontend requirement: Customer accounts.
- [ ] P12-M36-03-03 — Build/complete frontend requirement: Brand settings.
- [ ] P12-M36-03-04 — Build/complete frontend requirement: Usage/revenue.
- [ ] P12-M36-03-05 — Build/complete frontend requirement: Support.
- [ ] P12-M36-03-06 — Connect the UI to real APIs and remove temporary production-blocking mock data.
- [ ] P12-M36-03-07 — Verify responsive, loading, empty, validation, success and error states.

- [ ] P12-M36-03-08 — Integrate and verify: Billing.
- [ ] P12-M36-03-09 — Integrate and verify: Custom domains/email branding.
- [ ] P12-M36-03-10 — Handle provider timeout, unavailable, invalid-response and retry scenarios where applicable.

### Submodule 36.04 — Security & QA

- [ ] P12-M36-04-01 — Partner cannot access unrelated partners.
- [ ] P12-M36-04-02 — White-label custom-domain verification.
- [ ] P12-M36-04-03 — Financial data permissions.
- [ ] P12-M36-04-04 — Verify tenant isolation for all tenant-owned records and actions.

- [ ] P12-M36-04-05 — Test: Partner creates customer.
- [ ] P12-M36-04-06 — Test: Tenant isolation.
- [ ] P12-M36-04-07 — Test: Branding config.
- [ ] P12-M36-04-08 — Test: Commission/usage visibility.
- [ ] P12-M36-04-09 — Run regression checks for directly affected existing modules.
- [ ] P12-M36-04-10 — Complete manual QA of the end-to-end user journey.

### Submodule 36.05 — Documentation & Acceptance

- [ ] P12-M36-05-01 — Update the Master Module Registry status and dependencies.
- [ ] P12-M36-05-02 — Document database/API/provider changes introduced by this module.
- [ ] P12-M36-05-03 — Update environment-variable/example configuration documentation if this module introduces new configuration.
- [ ] P12-M36-05-04 — Create/update the **Manual QA Handoff** guide for **Partner / Reseller / White-Label Portal** at `docs/module-36/M36_Partner_Reseller_White_Label_Portal_manual-qa-guide.md` (or the repository's canonical equivalent). It must explain what the module is, its role in the project, delivered scope, roles/permissions, routes/APIs, data/integrations, complete user workflows, prerequisites/test data, happy/negative/edge/security/tenant test cases, expected results, regression scope, known limitations, bug-reporting requirements, evidence expectations, and QA sign-off checklist.


- [ ] P12-M36-GATE — Final acceptance: all module-specific checklist items above are verified, `VS-GLOBAL-01` through `VS-GLOBAL-16` pass, documentation/registry are current, and the module is accepted before the next module starts.

**Module Gate:** `[M36] Partner / Reseller / White-Label Portal = COMPLETE ✅` only after every required checkbox above is verified.

## Module 37 — Public Status Page `M37`

**Target:** Future

**Dependencies:** M29


### Submodule 37.01 — Scope & Technical Design

- [ ] P12-M37-01-01 — Confirm the objective and boundaries of **Public Status Page**.
- [ ] P12-M37-01-02 — Current component status
- [ ] P12-M37-01-03 — Incident history
- [ ] P12-M37-01-04 — Scheduled maintenance
- [ ] P12-M37-01-05 — Provider degradation
- [ ] P12-M37-01-06 — Subscribe to updates
- [ ] P12-M37-01-07 — Explicitly document what is out of scope for this module so later-phase work is not pulled forward.

### Submodule 37.02 — Backend, Persistence & API

- [ ] P12-M37-02-01 — Implement/confirm data requirement: `public incidents/components/subscriptions as required`.
- [ ] P12-M37-02-02 — Create and test migrations for this module without destructive uncontrolled schema synchronization.
- [ ] P12-M37-02-03 — Confirm organization/business ownership keys and foreign-key behavior for tenant-owned records.

- [ ] P12-M37-02-04 — Create/update the NestJS module boundaries, services and domain logic for **Public Status Page**.
- [ ] P12-M37-02-05 — Keep provider-specific implementation outside core business rules wherever the provider abstraction applies.
- [ ] P12-M37-02-06 — Add consistent error handling, logging and retry/idempotency behavior where required.

- [ ] P12-M37-02-07 — Implement/verify API contract: `Public read-only status endpoint`.
- [ ] P12-M37-02-08 — Implement/verify API contract: `Admin incident management endpoint`.
- [ ] P12-M37-02-09 — Add DTO/schema validation and consistent API error responses.

### Submodule 37.03 — Frontend & Integrations

- [ ] P12-M37-03-01 — Build/complete frontend requirement: Public status overview.
- [ ] P12-M37-03-02 — Build/complete frontend requirement: Incident detail/history.
- [ ] P12-M37-03-03 — Build/complete frontend requirement: Subscription form.
- [ ] P12-M37-03-04 — Connect the UI to real APIs and remove temporary production-blocking mock data.
- [ ] P12-M37-03-05 — Verify responsive, loading, empty, validation, success and error states.

- [ ] P12-M37-03-06 — Integrate and verify: Monitoring/incident system.
- [ ] P12-M37-03-07 — Integrate and verify: Email notification service.
- [ ] P12-M37-03-08 — Handle provider timeout, unavailable, invalid-response and retry scenarios where applicable.

### Submodule 37.04 — Security & QA

- [ ] P12-M37-04-01 — No sensitive internal diagnostics exposed.
- [ ] P12-M37-04-02 — Verify tenant isolation for all tenant-owned records and actions.

- [ ] P12-M37-04-03 — Test: Public status rendering.
- [ ] P12-M37-04-04 — Test: Incident publish/unpublish.
- [ ] P12-M37-04-05 — Test: Subscription notification.
- [ ] P12-M37-04-06 — Run regression checks for directly affected existing modules.
- [ ] P12-M37-04-07 — Complete manual QA of the end-to-end user journey.

### Submodule 37.05 — Documentation & Acceptance

- [ ] P12-M37-05-01 — Update the Master Module Registry status and dependencies.
- [ ] P12-M37-05-02 — Document database/API/provider changes introduced by this module.
- [ ] P12-M37-05-03 — Update environment-variable/example configuration documentation if this module introduces new configuration.
- [ ] P12-M37-05-04 — Create/update the **Manual QA Handoff** guide for **Public Status Page** at `docs/module-37/M37_Public_Status_Page_manual-qa-guide.md` (or the repository's canonical equivalent). It must explain what the module is, its role in the project, delivered scope, roles/permissions, routes/APIs, data/integrations, complete user workflows, prerequisites/test data, happy/negative/edge/security/tenant test cases, expected results, regression scope, known limitations, bug-reporting requirements, evidence expectations, and QA sign-off checklist.


- [ ] P12-M37-GATE — Final acceptance: all module-specific checklist items above are verified, `VS-GLOBAL-01` through `VS-GLOBAL-16` pass, documentation/registry are current, and the module is accepted before the next module starts.

**Module Gate:** `[M37] Public Status Page = COMPLETE ✅` only after every required checkbox above is verified.

## Module 38 — Business Mobile App `M38`

**Target:** Future

**Dependencies:** M14, M20, M23


### Submodule 38.01 — Scope & Technical Design

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

### Submodule 38.02 — Backend, Persistence & API

- [ ] P12-M38-02-01 — Implement/confirm data requirement: `Uses existing SaaS APIs; minimal mobile-specific state`.
- [ ] P12-M38-02-02 — Create and test migrations for this module without destructive uncontrolled schema synchronization.
- [ ] P12-M38-02-03 — Confirm organization/business ownership keys and foreign-key behavior for tenant-owned records.

- [ ] P12-M38-02-04 — Create/update the NestJS module boundaries, services and domain logic for **Business Mobile App**.
- [ ] P12-M38-02-05 — Keep provider-specific implementation outside core business rules wherever the provider abstraction applies.
- [ ] P12-M38-02-06 — Add consistent error handling, logging and retry/idempotency behavior where required.

- [ ] P12-M38-02-07 — Implement/verify API contract: `Reuse versioned SaaS APIs; add mobile-specific aggregation only if justified`.
- [ ] P12-M38-02-08 — Add DTO/schema validation and consistent API error responses.

### Submodule 38.03 — Frontend & Integrations

- [ ] P12-M38-03-01 — Build/complete frontend requirement: React Native/Expo mobile navigation.
- [ ] P12-M38-03-02 — Build/complete frontend requirement: Push notification handling.
- [ ] P12-M38-03-03 — Build/complete frontend requirement: Offline/error states.
- [ ] P12-M38-03-04 — Connect the UI to real APIs and remove temporary production-blocking mock data.
- [ ] P12-M38-03-05 — Verify responsive, loading, empty, validation, success and error states.

- [ ] P12-M38-03-06 — Integrate and verify: Push notification service.
- [ ] P12-M38-03-07 — Integrate and verify: Same NestJS API.
- [ ] P12-M38-03-08 — Handle provider timeout, unavailable, invalid-response and retry scenarios where applicable.

### Submodule 38.04 — Security & QA

- [ ] P12-M38-04-01 — Secure mobile token storage.
- [ ] P12-M38-04-02 — Session revocation.
- [ ] P12-M38-04-03 — Device-level permissions.
- [ ] P12-M38-04-04 — Verify tenant isolation for all tenant-owned records and actions.

- [ ] P12-M38-04-05 — Test: iOS/Android auth.
- [ ] P12-M38-04-06 — Test: Push notification.
- [ ] P12-M38-04-07 — Test: Call detail.
- [ ] P12-M38-04-08 — Test: Agent toggle.
- [ ] P12-M38-04-09 — Test: Network failure.
- [ ] P12-M38-04-10 — Run regression checks for directly affected existing modules.
- [ ] P12-M38-04-11 — Complete manual QA of the end-to-end user journey.

### Submodule 38.05 — Documentation & Acceptance

- [ ] P12-M38-05-01 — Update the Master Module Registry status and dependencies.
- [ ] P12-M38-05-02 — Document database/API/provider changes introduced by this module.
- [ ] P12-M38-05-03 — Update environment-variable/example configuration documentation if this module introduces new configuration.
- [ ] P12-M38-05-04 — Create/update the **Manual QA Handoff** guide for **Business Mobile App** at `docs/module-38/M38_Business_Mobile_App_manual-qa-guide.md` (or the repository's canonical equivalent). It must explain what the module is, its role in the project, delivered scope, roles/permissions, routes/APIs, data/integrations, complete user workflows, prerequisites/test data, happy/negative/edge/security/tenant test cases, expected results, regression scope, known limitations, bug-reporting requirements, evidence expectations, and QA sign-off checklist.


- [ ] P12-M38-GATE — Final acceptance: all module-specific checklist items above are verified, `VS-GLOBAL-01` through `VS-GLOBAL-16` pass, documentation/registry are current, and the module is accepted before the next module starts.

**Module Gate:** `[M38] Business Mobile App = COMPLETE ✅` only after every required checkbox above is verified.

## Module 39 — Embeddable Web Voice / Chat Widget `M39`

**Target:** Future

**Dependencies:** M05, M07, M17


### Submodule 39.01 — Scope & Technical Design

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

### Submodule 39.02 — Backend, Persistence & API

- [ ] P12-M39-02-01 — Implement/confirm data requirement: `widget_configs`.
- [ ] P12-M39-02-02 — Implement/confirm data requirement: `widget_sessions/leads as approved`.
- [ ] P12-M39-02-03 — Create and test migrations for this module without destructive uncontrolled schema synchronization.
- [ ] P12-M39-02-04 — Confirm organization/business ownership keys and foreign-key behavior for tenant-owned records.

- [ ] P12-M39-02-05 — Create/update the NestJS module boundaries, services and domain logic for **Embeddable Web Voice / Chat Widget**.
- [ ] P12-M39-02-06 — Keep provider-specific implementation outside core business rules wherever the provider abstraction applies.
- [ ] P12-M39-02-07 — Add consistent error handling, logging and retry/idempotency behavior where required.

- [ ] P12-M39-02-08 — Implement/verify API contract: `Public widget session endpoint`.
- [ ] P12-M39-02-09 — Implement/verify API contract: `Secure agent bootstrap/token endpoint`.
- [ ] P12-M39-02-10 — Add DTO/schema validation and consistent API error responses.

### Submodule 39.03 — Frontend & Integrations

- [ ] P12-M39-03-01 — Build/complete frontend requirement: Compact embeddable widget.
- [ ] P12-M39-03-02 — Build/complete frontend requirement: Launcher.
- [ ] P12-M39-03-03 — Build/complete frontend requirement: Conversation UI.
- [ ] P12-M39-03-04 — Build/complete frontend requirement: Voice controls.
- [ ] P12-M39-03-05 — Connect the UI to real APIs and remove temporary production-blocking mock data.
- [ ] P12-M39-03-06 — Verify responsive, loading, empty, validation, success and error states.

- [ ] P12-M39-03-07 — Integrate and verify: VoiceAgentProvider.
- [ ] P12-M39-03-08 — Integrate and verify: Tools.
- [ ] P12-M39-03-09 — Integrate and verify: CDN/static distribution.
- [ ] P12-M39-03-10 — Handle provider timeout, unavailable, invalid-response and retry scenarios where applicable.

### Submodule 39.04 — Security & QA

- [ ] P12-M39-04-01 — Domain allow-list.
- [ ] P12-M39-04-02 — Short-lived widget tokens.
- [ ] P12-M39-04-03 — Rate limiting.
- [ ] P12-M39-04-04 — No private tenant config exposed.
- [ ] P12-M39-04-05 — Verify tenant isolation for all tenant-owned records and actions.

- [ ] P12-M39-04-06 — Test: Embed on sample site.
- [ ] P12-M39-04-07 — Test: Allowed/disallowed domain.
- [ ] P12-M39-04-08 — Test: Voice/chat session.
- [ ] P12-M39-04-09 — Test: Tool action.
- [ ] P12-M39-04-10 — Test: Mobile responsiveness.
- [ ] P12-M39-04-11 — Run regression checks for directly affected existing modules.
- [ ] P12-M39-04-12 — Complete manual QA of the end-to-end user journey.

### Submodule 39.05 — Documentation & Acceptance

- [ ] P12-M39-05-01 — Update the Master Module Registry status and dependencies.
- [ ] P12-M39-05-02 — Document database/API/provider changes introduced by this module.
- [ ] P12-M39-05-03 — Update environment-variable/example configuration documentation if this module introduces new configuration.
- [ ] P12-M39-05-04 — Create/update the **Manual QA Handoff** guide for **Embeddable Web Voice / Chat Widget** at `docs/module-39/M39_Embeddable_Web_Voice_Chat_Widget_manual-qa-guide.md` (or the repository's canonical equivalent). It must explain what the module is, its role in the project, delivered scope, roles/permissions, routes/APIs, data/integrations, complete user workflows, prerequisites/test data, happy/negative/edge/security/tenant test cases, expected results, regression scope, known limitations, bug-reporting requirements, evidence expectations, and QA sign-off checklist.


- [ ] P12-M39-GATE — Final acceptance: all module-specific checklist items above are verified, `VS-GLOBAL-01` through `VS-GLOBAL-16` pass, documentation/registry are current, and the module is accepted before the next module starts.

**Module Gate:** `[M39] Embeddable Web Voice / Chat Widget = COMPLETE ✅` only after every required checkbox above is verified.

## Module 40 — Public Demo / Trial Sandbox `M40`

**Target:** Future

**Dependencies:** M01, M05, M07, M08


### Submodule 40.01 — Scope & Technical Design

- [ ] P12-M40-01-01 — Confirm the objective and boundaries of **Public Demo / Trial Sandbox**.
- [ ] P12-M40-01-02 — Select demo industry
- [ ] P12-M40-01-03 — Choose demo agent
- [ ] P12-M40-01-04 — Browser voice demo
- [ ] P12-M40-01-05 — Demo phone number flow where used
- [ ] P12-M40-01-06 — Isolated demo knowledge
- [ ] P12-M40-01-07 — Rate limits
- [ ] P12-M40-01-08 — Trial/signup conversion
- [ ] P12-M40-01-09 — Explicitly document what is out of scope for this module so later-phase work is not pulled forward.

### Submodule 40.02 — Backend, Persistence & API

- [ ] P12-M40-02-01 — Implement/confirm data requirement: `demo_agents`.
- [ ] P12-M40-02-02 — Implement/confirm data requirement: `demo_sessions or isolated seeded configuration`.
- [ ] P12-M40-02-03 — Create and test migrations for this module without destructive uncontrolled schema synchronization.
- [ ] P12-M40-02-04 — Confirm organization/business ownership keys and foreign-key behavior for tenant-owned records.

- [ ] P12-M40-02-05 — Create/update the NestJS module boundaries, services and domain logic for **Public Demo / Trial Sandbox**.
- [ ] P12-M40-02-06 — Keep provider-specific implementation outside core business rules wherever the provider abstraction applies.
- [ ] P12-M40-02-07 — Add consistent error handling, logging and retry/idempotency behavior where required.

- [ ] P12-M40-02-08 — Implement/verify API contract: `Demo session/start endpoints`.
- [ ] P12-M40-02-09 — Implement/verify API contract: `Rate-limit/abuse controls`.
- [ ] P12-M40-02-10 — Add DTO/schema validation and consistent API error responses.

### Submodule 40.03 — Frontend & Integrations

- [ ] P12-M40-03-01 — Build/complete frontend requirement: Industry selector.
- [ ] P12-M40-03-02 — Build/complete frontend requirement: Demo agent card.
- [ ] P12-M40-03-03 — Build/complete frontend requirement: Browser voice experience.
- [ ] P12-M40-03-04 — Build/complete frontend requirement: CTA to start trial.
- [ ] P12-M40-03-05 — Connect the UI to real APIs and remove temporary production-blocking mock data.
- [ ] P12-M40-03-06 — Verify responsive, loading, empty, validation, success and error states.

- [ ] P12-M40-03-07 — Integrate and verify: VoiceAgentProvider.
- [ ] P12-M40-03-08 — Integrate and verify: Marketing website.
- [ ] P12-M40-03-09 — Handle provider timeout, unavailable, invalid-response and retry scenarios where applicable.

### Submodule 40.04 — Security & QA

- [ ] P12-M40-04-01 — Isolate demo data from customer tenants.
- [ ] P12-M40-04-02 — Aggressive abuse/rate limits.
- [ ] P12-M40-04-03 — No privileged tools.
- [ ] P12-M40-04-04 — Verify tenant isolation for all tenant-owned records and actions.

- [ ] P12-M40-04-05 — Test: Demo session.
- [ ] P12-M40-04-06 — Test: Rate limiting.
- [ ] P12-M40-04-07 — Test: No tenant data exposure.
- [ ] P12-M40-04-08 — Test: Signup handoff.
- [ ] P12-M40-04-09 — Run regression checks for directly affected existing modules.
- [ ] P12-M40-04-10 — Complete manual QA of the end-to-end user journey.

### Submodule 40.05 — Documentation & Acceptance

- [ ] P12-M40-05-01 — Update the Master Module Registry status and dependencies.
- [ ] P12-M40-05-02 — Document database/API/provider changes introduced by this module.
- [ ] P12-M40-05-03 — Update environment-variable/example configuration documentation if this module introduces new configuration.
- [ ] P12-M40-05-04 — Create/update the **Manual QA Handoff** guide for **Public Demo / Trial Sandbox** at `docs/module-40/M40_Public_Demo_Trial_Sandbox_manual-qa-guide.md` (or the repository's canonical equivalent). It must explain what the module is, its role in the project, delivered scope, roles/permissions, routes/APIs, data/integrations, complete user workflows, prerequisites/test data, happy/negative/edge/security/tenant test cases, expected results, regression scope, known limitations, bug-reporting requirements, evidence expectations, and QA sign-off checklist.


- [ ] P12-M40-GATE — Final acceptance: all module-specific checklist items above are verified, `VS-GLOBAL-01` through `VS-GLOBAL-16` pass, documentation/registry are current, and the module is accepted before the next module starts.

**Module Gate:** `[M40] Public Demo / Trial Sandbox = COMPLETE ✅` only after every required checkbox above is verified.
---

# Final Execution Order

- [x] ORDER-01 — M00 Existing Project Audit & SaaS Foundation — Target: MVP — Dependencies: None
- [x] ORDER-02 — M01 Authentication — Target: MVP — Dependencies: M00
- [x] ORDER-03 — M02 Organizations / Tenants — Target: MVP — Dependencies: M01
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

- [x] MVP-GATE-M00 — M00 Existing Project Audit & SaaS Foundation completed and accepted.
- [x] MVP-GATE-M01 — M01 Authentication completed and accepted.
- [x] MVP-GATE-M02 — M02 Organizations / Tenants completed and accepted.
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
→ 01 Scope & Technical Design
→ 02 Backend, Persistence & API
→ 03 Frontend & Integrations
→ 04 Security & QA
→ 05 Documentation & Acceptance
→ GLOBAL VERTICAL SLICE GATE
→ COMPLETE ✅
→ NEXT MODULE
```

Do not mark a module complete because only its API, database, or UI exists. Completion means the approved end-to-end user/business outcome works and has been verified.
