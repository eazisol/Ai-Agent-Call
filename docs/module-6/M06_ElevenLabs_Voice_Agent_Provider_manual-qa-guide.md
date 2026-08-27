# M06 — ElevenLabs Voice Agent Provider — Manual QA Handoff

| Field | Value |
| --- | --- |
| Module | M06 — ElevenLabs Voice Agent Provider |
| Phase | P02 — AI Agent Core |
| Status | Implementation complete — 27 August 2026 |
| Depends on | M01–M05 (esp. M05 agents) |
| Audience | Manual QA Engineer / Tester |
| Build reference | Record commit SHA and test date in sign-off |

---

## 1. Module overview

M06 provisions and syncs a **local EaziAiCall agent** to an **ElevenLabs Conversational AI agent**, stores the mapping on `agent_provider_mappings`, and exposes sync status in the portal.

**Role in product:** SaaS remains the source of truth. ElevenLabs is a projection used later for live voice calls. Knowledge (M07), voice library (M08/M09), and telephony (M11+) are out of scope.

## 2. Delivered scope

### In scope

- Server-side `VoiceAgentSyncPort` + ElevenLabs ConvAI adapter  
- Explicit sync: `POST /api/v1/agents/:id/sync`  
- Status: `GET /api/v1/agents/:id/provider-status`  
- Mapping fields: `external_agent_id`, `sync_status`, `last_synced_at`, `last_error`  
- Portal: provider column on `/agents`, Voice provider panel on `/agents/[id]` (Sync / Re-sync / Retry)  
- Non-blocking language/voice compatibility **warnings**  
- Best-effort remote delete on local hard delete; archive does not wipe remote  

### Out of scope (do not file as bugs)

- Auto-sync on every agent PATCH  
- Knowledge / tools / webhooks from ElevenLabs  
- Voice library picker / cloning (M08/M09)  
- Live phone calls / Twilio (later modules)  
- `provider_sync_logs` history table  

## 3. Dependencies and prerequisites

| Requirement | Notes |
| --- | --- |
| M05 | At least one local agent under an active business |
| Backend env | `ELEVENLABS_API_KEY` set for happy-path sync (optional at boot; required at sync) |
| Optional env | `ELEVENLABS_API_BASE_URL`, `ELEVENLABS_TIMEOUT_MS`, `ELEVENLABS_DEFAULT_VOICE_*` |
| Cookies | `eazi_org` + `eazi_biz` |
| Migrations | No new M06 migration; uses M05 `agent_provider_mappings` |

**Suggested test accounts**

- Owner / Admin / Manager / Viewer in Org A, Business A  
- Owner in Org B, Business B (cross-tenant)  
- Same org, Business A vs Business B (cross-business)

## 4. Roles and permissions

| Action | owner | admin | manager | viewer |
| --- | --- | --- | --- | --- |
| View provider status | ✓ | ✓ | ✓ | ✓ |
| Sync / Retry | ✓ | ✓ | ✓ | ✗ |
| Edit local agent while sync error | ✓ | ✓ | ✓ | ✗ (cannot edit) |

Sync uses the same RBAC as **update_agent**.

## 5. User-facing surfaces

| Route | Purpose |
| --- | --- |
| `/agents` | List + **Provider** sync badge |
| `/agents/[id]` | Overview + **Voice provider** panel |
| Behavior / Escalation | Unchanged; not blocked by provider error |

## 6. Backend / API surface

Prefix `/api/v1` — session + active org + active business.

| Method | Path | RBAC | Notes |
| --- | --- | --- | --- |
| POST | `/agents/:id/sync` | update_agent | Returns `{ agent, sync }` incl. `warnings[]` |
| GET | `/agents/:id/provider-status` | view_agent | Returns `{ status }` + optional remote check |

**Error codes (provider):** `PROVIDER_NOT_CONFIGURED`, `PROVIDER_AUTH_FAILED`, `PROVIDER_UNAVAILABLE`, `PROVIDER_SYNC_FAILED`, `PROVIDER_SYNC_IN_PROGRESS`, plus existing agent/auth codes.

See [api-contracts.md](./api-contracts.md). **Never** return API keys.

## 7. Data and integrations

- Table: `agent_provider_mappings` (`provider = elevenlabs`)  
- Unique `(agent_id, provider)`  
- External HTTP: ElevenLabs ConvAI create / patch / get / delete  
- Secrets: server env only  

## 8. End-to-end workflows

### WF-1 — First-time provision

1. Sign in → active org + business → open an **Active** agent.  
2. Voice provider shows **Not synced yet**.  
3. Click **Sync to ElevenLabs**.  
4. Expect success message, status **Synced**, provider agent ID present, list Provider column updates after refresh.

### WF-2 — Re-sync after local edit

1. Edit greeting/instructions on Behavior → Save.  
2. Overview → **Re-sync**.  
3. Expect **Synced**, same or updated remote id; local edits unchanged.

### WF-3 — Failure then retry

1. Temporarily break provider (invalid key or disconnect) → Sync.  
2. Expect safe error message (no raw JSON / no key material); status **Sync error**; `lastError` visible.  
3. Restore key → **Retry sync** → **Synced**. Local agent config never deleted.

### WF-4 — Viewer and archived

1. As viewer: see status; no Sync button (or denied if API forced).  
2. Archive agent → Sync CTA blocked until unarchive.

## 9. Negative and edge cases

| Case | Expected |
| --- | --- |
| Missing `ELEVENLABS_API_KEY` | 503 `PROVIDER_NOT_CONFIGURED` |
| Invalid key | 502 `PROVIDER_AUTH_FAILED` (safe message) |
| Provider timeout / 5xx | 503 `PROVIDER_UNAVAILABLE` |
| Concurrent double-click sync | 409 `PROVIDER_SYNC_IN_PROGRESS` or second waits |
| Sync archived agent | 400 `AGENT_ARCHIVED` |
| Unsupported language (e.g. some catalogue codes) | Sync may still succeed with **warnings**; local languages unchanged |
| Cross-business agent id + sync | 404 `AGENT_NOT_FOUND` |

## 10. Security / tenant cases

| ID | Case | Expected |
| --- | --- | --- |
| TC-M06-SEC-01 | Inspect browser Network → sync response | No API key / `xi-api-key` |
| TC-M06-SEC-02 | Inspect FE env / page source | No `ELEVENLABS_API_KEY` |
| TC-M06-SEC-03 | Force provider 401; check UI + DB `last_error` | Customer-safe text only |
| TC-M06-SEC-04 | Org B sync Org A agent id | Denied / not found |
| TC-M06-SEC-05 | Business B sync Business A agent id | `AGENT_NOT_FOUND` |
| TC-M06-SEC-06 | Viewer POST sync | 403 `FORBIDDEN` |

## 11. Happy-path test cases

| ID | Steps | Expected |
| --- | --- | --- |
| TC-M06-01 | Create local agent (M05) then Sync | Mapping `synced` + external id |
| TC-M06-02 | Change greeting → Re-sync | Remains synced; greeting projected |
| TC-M06-03 | Fail provider call | `error` + safe `lastError` |
| TC-M06-04 | Retry after fix | `synced`; prior error cleared |
| TC-M06-05 | Reload page / provider-status | Mapping persisted |
| TC-M06-06 | List Provider column | Matches overview status |
| TC-M06-07 | Soft warnings (optional language) | Warnings shown; config intact |

## 12. Regression scope

- M05 agent CRUD, language/voice preference, activate/archive  
- M04 business switcher / active business cookie  
- M03 RBAC matrix for agents  
- M01 session auth  

## 13. Known limitations

- Soft deactivate on archive is a no-op toward ElevenLabs (remote retained until hard delete).  
- Default voices are heuristic env IDs until Voice Library (M08).  
- No append-only sync log table.  
- CI does not call live ElevenLabs with a production key.

## 14. Evidence expectations

Screenshots or notes: Not synced → Synced, Re-sync, Sync error + retry, viewer denial, Network tab proving no secrets. On failure capture HTTP status, `error.code`, correlation ID.

## 15. Bug-reporting guide

Include: role, org, business, agent id, route, sync status before/after, HTTP status, `error.code`, correlation ID, whether `ELEVENLABS_API_KEY` was configured (yes/no only — **never paste the key**). Do not attach `.env`, cookies, or provider dashboards dumps with secrets.

## 16. QA sign-off checklist

| Item | Value |
| --- | --- |
| Tester name | |
| Date | |
| Build / commit | |
| Tests executed | TC-M06-01 … TC-M06-07 + SEC-01 … SEC-06 |
| Open blockers | |
| Evidence links | |
| Recommendation | ☐ Pass ☐ Pass with known issues ☐ Fail |

**Automated evidence (dev):** backend build + `agent-provider-sync` / `agents-domain` unit tests + `app.agents` e2e; frontend typecheck — 27 August 2026. See [security-and-qa.md](./security-and-qa.md).
