# Production API Route Matrix

**Source of truth:** NestJS controllers in `ai-call-agent-backend/src`  
**Global prefix:** `api/v1` (health endpoints excluded)  
**Generated:** 2026-09-02  
**Total REST endpoints:** 93

## Context model

| Context | Mechanism |
|---|---|
| Session | `eazi_access` / `eazi_refresh` cookies (`AuthGuard`) |
| Organization | `eazi_org` cookie (`requireActiveOrganization`) |
| Business | `eazi_biz` cookie (`requireActiveBusiness`) |

Browser traffic uses same-origin proxy: `/api/backend/*` → CloudFront `/api/v1/*`.

---

## Health & Root

| Method | Route | Auth | Org | Business | Request | Success | Prod smoke |
|---|---|---|---|---|---|---|---|
| GET | `/health/live` | No | No | No | none | 200 | SAFE READ |
| GET | `/health/ready` | No | No | No | none | 200/503 | SAFE READ |
| GET | `/api/v1` | No | No | No | none | 200 | SAFE READ |

## Auth (8)

| Method | Route | Auth | Request | Success | Prod smoke | Side effects |
|---|---|---|---|---|---|---|
| POST | `/api/v1/auth/register` | No | JSON | 201 | VALIDATION ONLY | email |
| POST | `/api/v1/auth/login` | No | JSON | 200 | SAFE VALIDATION / AUTH LIVE | session cookies |
| POST | `/api/v1/auth/logout` | No | none | 200 | AUTH LIVE | clears cookies |
| POST | `/api/v1/auth/forgot-password` | No | JSON | 200 | NOT EXECUTED | email |
| POST | `/api/v1/auth/reset-password` | No | JSON | 200 | NOT EXECUTED | password change |
| POST | `/api/v1/auth/verify-email` | No | JSON | 200 | VALIDATION ONLY | none |
| POST | `/api/v1/auth/refresh` | refresh cookie | none | 200 | AUTH LIVE | rotates session |
| GET | `/api/v1/auth/me` | Yes | none | 200 | SAFE READ / AUTH LIVE | none |

## Organizations & Team (14)

| Method | Route | Auth | Org cookie | Request | Success | Prod smoke |
|---|---|---|---|---|---|---|
| POST | `/api/v1/organizations` | Yes | No | JSON | 201 | CONTROLLED CRUD (sets `eazi_org`) |
| GET | `/api/v1/organizations` | Yes | No | none | 200 | SAFE READ |
| GET | `/api/v1/organizations/active` | Yes | No | none | 200 | SAFE READ |
| POST | `/api/v1/organizations/active` | Yes | No | JSON | 200 | CONTROLLED CRUD |
| DELETE | `/api/v1/organizations/active` | Yes | No | none | 200 | NOT EXECUTED |
| GET | `/api/v1/organizations/:id` | Yes | No | none | 200 | SAFE READ |
| PATCH | `/api/v1/organizations/:id` | Yes | No | JSON | 200 | NOT EXECUTED |
| GET | `/api/v1/organizations/:id/members` | Yes | No | none | 200 | SAFE READ |
| PATCH | `/api/v1/organizations/:id/members/:memberId` | Yes | No | JSON | 200 | NOT EXECUTED |
| DELETE | `/api/v1/organizations/:id/members/:memberId` | Yes | No | none | 200 | NOT EXECUTED |
| GET | `/api/v1/organizations/:id/invitations` | Yes | No | none | 200 | SAFE READ |
| POST | `/api/v1/organizations/:id/invitations` | Yes | No | JSON | 201 | NOT EXECUTED (email) |
| DELETE | `/api/v1/organizations/:id/invitations/:invitationId` | Yes | No | none | 200 | NOT EXECUTED |
| POST | `/api/v1/organizations/:id/transfer-ownership` | Yes | No | JSON | 200 | NOT EXECUTED |

## Invitations (2)

| Method | Route | Auth | Request | Success | Prod smoke |
|---|---|---|---|---|---|
| GET | `/api/v1/invitations/preview` | No | query | 200 | VALIDATION ONLY |
| POST | `/api/v1/invitations/accept` | Yes | JSON | 200 | NOT EXECUTED |

## Businesses (9)

| Method | Route | Auth | Org | Business | Request | Success | Prod smoke |
|---|---|---|---|---|---|---|---|
| POST | `/api/v1/businesses` | Yes | Yes | No | JSON | 201 | CONTROLLED CRUD (sets `eazi_biz`) |
| GET | `/api/v1/businesses` | Yes | Yes | No | query | 200 | SAFE READ |
| GET | `/api/v1/businesses/active` | Yes | Yes | No | none | 200 | SAFE READ |
| POST | `/api/v1/businesses/active` | Yes | Yes | No | JSON | 200 | CONTROLLED CRUD |
| DELETE | `/api/v1/businesses/active` | Yes | No | none | 200 | NOT EXECUTED |
| GET | `/api/v1/businesses/:id` | Yes | Yes | No | none | 200 | SAFE READ |
| PATCH | `/api/v1/businesses/:id` | Yes | Yes | No | JSON | 200 | NOT EXECUTED |
| POST | `/api/v1/businesses/:id/archive` | Yes | Yes | No | none | 200 | NOT EXECUTED |
| DELETE | `/api/v1/businesses/:id` | Yes | Yes | No | none | 200 | NOT EXECUTED |

## Agents (10)

All require auth + org + business cookies.

| Method | Route | Request | Success | Prod smoke | Side effects |
|---|---|---|---|---|---|
| POST | `/api/v1/agents` | JSON | 201 | NOT EXECUTED | none |
| GET | `/api/v1/agents` | query | 200 | SAFE READ | none |
| GET | `/api/v1/agents/:id` | none | 200 | SAFE READ (D14 agent) | none |
| PATCH | `/api/v1/agents/:id` | JSON | 200 | NOT EXECUTED | provider |
| POST | `/api/v1/agents/:id/activate` | none | 200 | NOT EXECUTED | provider |
| POST | `/api/v1/agents/:id/deactivate` | none | 200 | NOT EXECUTED | provider |
| POST | `/api/v1/agents/:id/archive` | none | 200 | NOT EXECUTED | destructive |
| POST | `/api/v1/agents/:id/sync` | none | 200 | NOT EXECUTED | provider |
| GET | `/api/v1/agents/:id/provider-status` | none | 200 | SAFE READ | none |
| DELETE | `/api/v1/agents/:id` | none | 200 | NOT EXECUTED | destructive |

## Knowledge (12) + Agent Knowledge (3)

Knowledge routes require auth + org + business. File upload uses **multipart**.

| Method | Route | Request | Prod smoke |
|---|---|---|---|
| GET | `/api/v1/knowledge` | query | SAFE READ |
| GET | `/api/v1/knowledge/:id` | none | SAFE READ |
| GET | `/api/v1/knowledge/:id/provider-status` | none | SAFE READ |
| POST | `/api/v1/knowledge/files` | multipart | CONTRACT TESTED (local) |
| POST | `/api/v1/knowledge/url` | JSON | NOT EXECUTED |
| POST | `/api/v1/knowledge/text` | JSON | NOT EXECUTED |
| POST | `/api/v1/knowledge/faq` | JSON | NOT EXECUTED |
| PATCH | `/api/v1/knowledge/:id` | JSON | NOT EXECUTED |
| POST | `/api/v1/knowledge/:id/sync` | none | NOT EXECUTED (provider) |
| POST | `/api/v1/knowledge/:id/resync` | none | NOT EXECUTED (provider) |
| POST | `/api/v1/knowledge/:id/archive` | none | NOT EXECUTED |
| DELETE | `/api/v1/knowledge/:id` | none | NOT EXECUTED |
| GET | `/api/v1/agents/:agentId/knowledge` | none | SAFE READ |
| POST | `/api/v1/agents/:agentId/knowledge/:knowledgeId` | none | NOT EXECUTED |
| DELETE | `/api/v1/agents/:agentId/knowledge/:knowledgeId` | none | NOT EXECUTED |

## Voices (3) + Agent Voice (4)

| Method | Route | Request | Prod smoke | Side effects |
|---|---|---|---|---|
| GET | `/api/v1/voices` | query | SAFE READ | none |
| GET | `/api/v1/voices/:id` | none | SAFE READ | none |
| POST | `/api/v1/voices/:id/preview` | JSON | NOT EXECUTED | provider TTS |
| GET | `/api/v1/agents/:agentId/voice` | none | SAFE READ | none |
| PUT/POST/DELETE | `/api/v1/agents/:agentId/voice` | JSON/none | NOT EXECUTED | provider |

## Voice Clones (11)

Sample upload uses **multipart**. Submit/retry/revoke are provider-cost endpoints.

| Method | Route | Request | Prod smoke |
|---|---|---|---|
| GET | `/api/v1/voices/clones` | query | SAFE READ |
| GET | `/api/v1/voices/clones/:id` | none | SAFE READ |
| GET | `/api/v1/voices/clones/:id/status` | none | SAFE READ |
| POST | `/api/v1/voices/clones` | JSON | NOT EXECUTED |
| POST | `/api/v1/voices/clones/:id/samples` | multipart | CONTRACT TESTED (local) |
| POST | `/api/v1/voices/clones/:id/submit` | none | NOT EXECUTED (provider cost) |
| POST | `/api/v1/voices/clones/:id/retry` | none | NOT EXECUTED (provider) |
| POST | `/api/v1/voices/clones/:id/revoke` | none | NOT EXECUTED (provider) |
| POST | `/api/v1/voices/clones/:id/consent` | JSON | NOT EXECUTED |
| DELETE | `/api/v1/voices/clones/:id/samples/:sampleId` | none | NOT EXECUTED |
| DELETE | `/api/v1/voices/clones/:id` | none | NOT EXECUTED |

## Phone Numbers (8)

| Method | Route | Request | Prod smoke | Side effects |
|---|---|---|---|---|
| GET | `/api/v1/phone-numbers` | query | SAFE READ (D14 number) | none |
| GET | `/api/v1/phone-numbers/:id` | none | SAFE READ | none |
| POST | `/api/v1/phone-numbers/search` | JSON | NOT EXECUTED | Twilio search |
| POST | `/api/v1/phone-numbers/purchase` | JSON | NOT EXECUTED | billing/provider |
| POST | `/api/v1/phone-numbers/import` | JSON | NOT EXECUTED | provider |
| POST | `/api/v1/phone-numbers/:id/assign` | JSON | NOT EXECUTED | provider |
| POST | `/api/v1/phone-numbers/:id/unassign` | none | NOT EXECUTED | provider |
| DELETE | `/api/v1/phone-numbers/:id` | JSON | NOT EXECUTED | release |

## Calls (2)

| Method | Route | Request | Prod smoke |
|---|---|---|---|
| GET | `/api/v1/calls` | query | SAFE READ (empty list valid) |
| GET | `/api/v1/calls/:id` | none | VALIDATION ONLY |

## Telephony (1)

| Method | Route | Auth | Org | Prod smoke |
|---|---|---|---|---|
| GET | `/api/v1/telephony/provider-status` | Yes | Yes | SAFE READ |

## Webhooks (4) — CloudFront-direct, not browser proxy

| Method | Route | Auth | Prod smoke |
|---|---|---|---|
| POST | `/api/v1/webhooks/twilio/incoming-call` | Twilio sig | NOT EXECUTED (D14 verified) |
| POST | `/api/v1/webhooks/twilio/call-ended` | Twilio sig | NOT EXECUTED |
| POST | `/api/v1/webhooks/twilio/status-callback` | Twilio sig | NOT EXECUTED |
| POST | `/api/v1/webhooks/elevenlabs/conversation-events` | HMAC | NOT EXECUTED (D14 verified) |

## Controller index

| File | Controller(s) |
|---|---|
| `health/health.controller.ts` | HealthController |
| `app.controller.ts` | AppController |
| `modules/auth/auth.controller.ts` | AuthController |
| `modules/organizations/organizations.controller.ts` | OrganizationsController, InvitationsController |
| `modules/businesses/businesses.controller.ts` | BusinessesController |
| `modules/agents/agents.controller.ts` | AgentsController |
| `modules/knowledge/knowledge.controller.ts` | KnowledgeController |
| `modules/knowledge/agent-knowledge.controller.ts` | AgentKnowledgeController |
| `modules/voices/voices.controller.ts` | VoicesController, AgentVoiceController |
| `modules/voice-clones/voice-clones.controller.ts` | VoiceClonesController |
| `modules/phone-numbers/phone-numbers.controller.ts` | PhoneNumbersController |
| `modules/calls/calls.controller.ts` | CallsController |
| `modules/twilio/telephony.controller.ts` | TelephonyController |
| `modules/twilio/twilio.controller.ts` | TwilioController |
| `modules/calls/elevenlabs-webhook.controller.ts` | ElevenLabsWebhookController |

## Frontend API clients

| Client | File |
|---|---|
| authApi | `src/lib/auth-api.ts` |
| organizationsApi | `src/lib/organizations-api.ts` |
| businessesApi | `src/lib/businesses-api.ts` |
| agentsApi | `src/lib/agents-api.ts` |
| knowledgeApi | `src/lib/knowledge-api.ts` |
| voicesApi | `src/lib/voices-api.ts` |
| voiceClonesApi | `src/lib/voice-clones-api.ts` |
| phoneNumbersApi | `src/lib/phone-numbers-api.ts` |
| callsApi | `src/lib/calls-api.ts` |
| teamApi | `src/lib/team-api.ts` |
| telephonyApi | `src/lib/telephony-api.ts` |

Shared transport: `src/lib/api-client.ts` + `src/lib/api-client-core.mjs`  
Same-origin proxy: `src/app/api/backend/[...path]/route.ts`
