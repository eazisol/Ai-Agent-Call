# Module 06 — ElevenLabs Voice Agent Provider: Scope & Requirements

| Field | Value |
| --- | --- |
| Module | M06 — ElevenLabs Voice Agent Provider |
| Submodule | 06.01 — Scope & Technical Design |
| Status | Requirements locked — 27 August 2026 |
| Date | 27 August 2026 |
| Depends on | M05 Complete |
| Target | MVP |

## 1. Objective

Introduce a **provider-neutral voice-agent sync/provisioning contract** and the first adapter — **ElevenLabs** — so that a local SaaS agent (M05) can be **created, updated, deactivated/deleted, and status-checked** on the provider, with durable **provider mapping**, **retry**, and **normalized errors**.

EaziAICall remains the **source of truth**. ElevenLabs holds a synchronized runtime voice agent derived from local config.

## 2. Boundaries

### In scope (M06)

| ID | Capability | Acceptance intent |
| --- | --- | --- |
| P02-M06-01-01 | Objective & boundaries | This document; M06 MVP locked |
| P02-M06-01-02 | VoiceAgentProvider contract | Nest port for provisioning/sync (not the OpenAI Realtime WebSocket port) |
| P02-M06-01-03 | Create ElevenLabs agent | First successful sync creates external agent + mapping row |
| P02-M06-01-04 | Update ElevenLabs agent | Local edits can re-sync prompts/language/voice-compatible fields |
| P02-M06-01-05 | Delete/deactivate provider agent | Safe remote deactivate/delete policy when local agent archived/deleted |
| P02-M06-01-06 | Fetch provider status | Read remote/local sync status without leaking secrets |
| P02-M06-01-07 | Store provider mapping | Persist `agent_provider_mappings` (`provider=elevenlabs`) |
| P02-M06-01-08 | Retry failed sync | Explicit retry path from `error` / `pending` → success or safe error |
| P02-M06-01-09 | Normalize provider errors | Customer-safe messages; raw ElevenLabs payloads never shown |
| P02-M06-01-10 | Out of scope | Section 3 |

### Decisions locked in 06.01

| Topic | Decision |
| --- | --- |
| Source of truth | **Local** `ai_agents` + configs + prompts. Provider is a projection |
| Provider key | Canonical string **`elevenlabs`** in `agent_provider_mappings.provider` |
| Contract vs realtime | **Split ports.** Existing `VoiceAgentProviderPort` (`createRealtimeConnection`) stays the **realtime session** prototype (OpenAI). M06 introduces a separate **`VoiceAgentSyncPort`** (name locked for 06.02) for create/update/delete/getStatus. Registry “VoiceAgentProvider” maps to this **sync** port for commercial providers |
| Adapter location | `providers/elevenlabs/` (or Nest module under `modules/elevenlabs-sync/`) implementing the sync port only |
| Mapping table | Reuse M05 `agent_provider_mappings`. Unique `(agent_id, provider)`. M05 schema is sufficient for MVP; optional `provider_logs` / extra sync metadata columns only if 06.02 proves gaps |
| Sync trigger | **Explicit sync** (API + UI button). Auto-sync on every PATCH is **not** required for MVP (may be added later as optional). Create-local does **not** require immediate provider create |
| Optional HTTP APIs | `POST /api/v1/agents/:id/sync`, `GET /api/v1/agents/:id/provider-status` (checklist). Auth + active org + active business + RBAC: same as agent **update** for sync; **view** for status |
| Language mapping | Map effective languages (inherit business or agent subset), default/fallback, detection + switching flags into ElevenLabs-compatible settings where supported. Unsupported language → **compatibility warning**; **do not** clear local languages |
| Voice mapping | Map `voice_preference` to a **default/system** ElevenLabs voice selection heuristic for MVP. Concrete library voice IDs / cloning = **M08/M09**. Do not store ElevenLabs voice IDs as the primary domain on `agent_configs.voice_id` |
| Prompts | Push `role_label`, `personality`, `greeting`, `instructions` into provider agent config/system prompt fields as mapped in 06.02 |
| Sync statuses | Use existing: `not_provisioned` \| `pending` \| `synced` \| `error`. Set `pending` while in flight; `synced` + `last_synced_at` on success; `error` + sanitized `last_error` on failure |
| Idempotency | Re-sync with existing `external_agent_id` updates remote; never create a second mapping row for the same `(agent_id, elevenlabs)` |
| Delete policy | Local archive → prefer remote **deactivate** if API supports; local hard delete → best-effort remote delete, then cascade removes mapping. Failures recorded safely; do not block local archive solely on provider outage (document exact behavior in 06.02) |
| Secrets | `ELEVENLABS_API_KEY` (and related) **server-only**. Never return to browser or logs in full |
| Tenant isolation | Sync only for agents owned by active org + business; cross-tenant → `AGENT_NOT_FOUND` |
| RBAC | Sync = `update_agent`; status read = `view_agent` |
| Retell / OpenAI sync adapters | **Out of M06** — contract must allow future adapters |
| Knowledge publish | **M07** (`KnowledgeSyncProvider` / ElevenLabs knowledge) |
| Voice catalog / clone | **M08** / **M09** |
| Twilio / inbound calls | **M10–M12** — M06 does not place or answer calls |
| Prototype OpenAI Realtime | Leave running; do not replace media path in M06 |

### MVP permission matrix (provider sync)

| Action | owner | admin | manager | viewer |
| --- | --- | --- | --- | --- |
| View provider status | ✓ | ✓ | ✓ | ✓ |
| Sync / retry | ✓ | ✓ | ✓ | ✗ |

### Planned data (for 06.02)

See [data-model.md](./data-model.md).

- Confirm/use `agent_provider_mappings`
- Decide whether MVP needs `provider_sync_logs` (append-only) or columns on mapping only

### Planned APIs (for 06.02)

See [api-contracts.md](./api-contracts.md).

### Planned UI (for 06.03)

See [frontend-surfaces.md](./frontend-surfaces.md).

### Security requirements (preview for 06.04)

- API key server-side only
- Sanitize provider errors (no raw body / stack / key material to clients)
- Tenant isolation on sync endpoints
- No credentials in browser network tab via our APIs

## 3. Out of scope (explicit — do not pull forward)

Documented for P02-M06-01-10:

- Knowledge base upload/sync to ElevenLabs (**M07**)
- Voice Library listing, preview, binding of library voice IDs (**M08**)
- Voice cloning / consent workflows (**M09**)
- Telephony / Twilio number assignment (**M10–M11**)
- Inbound call orchestration, streaming, transcripts (**M12**)
- Retell or OpenAI **provisioning** adapters (contract only)
- Replacing OpenAI Realtime WebSocket prototype path
- Billing / metering of provider usage (**M26**)
- Auto-sync on every agent field change (optional later)
- Making ElevenLabs the system of record for agent config
- Exposing raw ElevenLabs admin URLs/secrets in the customer portal

## 4. Port sketch (locked intent; implement in 06.02)

```ts
// Conceptual — exact Nest token/file names finalized in 06.02
interface VoiceAgentSyncPort {
  readonly providerName: 'elevenlabs' | string;
  create(input: ProviderAgentCreateInput): Promise<ProviderAgentResult>;
  update(externalId: string, input: ProviderAgentUpdateInput): Promise<ProviderAgentResult>;
  deactivate(externalId: string): Promise<void>;
  delete(externalId: string): Promise<void>;
  getStatus(externalId: string): Promise<ProviderAgentStatus>;
}
```

Application service orchestrates: load local agent → map fields → call port → upsert mapping → normalize errors / warnings.

## 5. Compatibility warnings (customer-facing)

Examples (exact copy may refine in 06.03):

- “Urdu is configured for this agent but is not supported by the currently selected voice/model.”
- “Automatic language switching is enabled locally but is limited by the provider for this configuration.”

Warnings must not wipe local `languages` / flags.

## 6. Definition of Done for Submodule 06.01

- [x] Objective, in-scope, out-of-scope locked  
- [x] Sync port vs realtime port split documented  
- [x] Mapping, sync statuses, RBAC, secret handling locked  
- [x] Language/voice/prompt mapping intent documented  
- [x] Checklist `P02-M06-01-01` … `P02-M06-01-10` marked complete after acceptance  
- [x] No Nest ElevenLabs HTTP client or live API calls in 06.01  

**Next:** **06.02 — Backend, Persistence & API** — implement sync port + ElevenLabs adapter, mapping writes, optional sync/status routes, env validation.
