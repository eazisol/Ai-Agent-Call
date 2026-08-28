# Module 09 — Scope & requirements (09.01)

| Field | Value |
| --- | --- |
| Module | M09 — Voice Cloning |
| Submodule | 09.01 — Scope & Technical Design |
| Status | **Locked** — 28 August 2026 |

## Objective

Deliver **Business-owned reusable cloned voices + per-agent assignment**: one canonical clone asset per Business voice identity (e.g. “Owner Custom Clone”), explicit consent at asset creation, private sample handling, provider provisioning behind an abstraction, and safe revoke/delete while agents may still reference the voice.

## Checklist mapping (09.01)

| ID | Requirement | Design decision |
| --- | --- | --- |
| P03-M09-01-01 | Business-owned clone + per-agent assignment | One `voice_clones` row + one `voice_assets` row (`business_clone`); many agents via `agent_configs.voice_id` |
| P03-M09-01-02 | Explicit consent at asset level | `voice_consents` row required before provider submit; records user, business, timestamp, consent text version, sample refs |
| P03-M09-01-03 | Upload/record samples | Multipart upload to private object storage; optional in-browser record → upload same pipeline |
| P03-M09-01-04 | Submit clone request | `POST /voices/clones` creates draft → validates consent + samples → calls `VoiceClonePort` |
| P03-M09-01-05 | Track processing status | Clone lifecycle: `draft` → `processing` → `ready` \| `failed` \| `revoked` |
| P03-M09-01-06 | Preview cloned voice | Reuse M08 preview once `ready` (provider mapping exists) |
| P03-M09-01-07 | Assign to agent(s) | M08 assign API only; library lists clone alongside catalogue voices |
| P03-M09-01-08 | Revoke/delete while assigned | Block hard delete while `assignedAgentCount > 0`; offer unassign guidance; soft-revoke sets `revoked` + archives asset |
| P03-M09-01-09 | Audit sensitive actions | Log clone create, consent capture, provider submit result, revoke, delete attempt |
| P03-M09-01-10 | Out of scope documented | See below |
| P03-M09-01-11 | M08 library eligibility | On `ready`, upsert `voice_assets` + `voice_provider_mappings` |
| P03-M09-01-12 | Unassign without destroying clone | Clearing agent voice only nulls `agent_configs.voice_id` |
| P03-M09-01-13 | Provider sync/mapping | `VoiceClonePort`; failures set `failed` + last_error; never orphan canonical asset without status |
| P03-M09-01-14 | No automatic cloning | UI + API reject submit without consent record |

## Ownership model (locked)

| Layer | Owns | Rule |
| --- | --- | --- |
| **Clone lifecycle** | `voice_clones` | One row per Business clone identity |
| **Consent evidence** | `voice_consents` | Tied to clone; not duplicated per agent assign |
| **Samples** | `voice_samples` | Business-scoped blobs in private storage |
| **Library asset** | `voice_assets` | Canonical EaziAiCall voice id used by M08 |
| **Agent selection** | `agent_configs.voice_id` | Many agents → same clone asset id |

Example: Business creates “Owner Custom Clone” once. Receptionist and Appointment Agent both set `voice_id` to the same `voice_assets.id`.

## MVP provider scope

| Provider | MVP | Notes |
| --- | --- | --- |
| ElevenLabs Instant Voice Cloning | **Yes (first)** | `POST /v1/voices/add` multipart; returns `voice_id` |
| Retell / other | No | Port interface only |

## Roles & permissions (proposed)

| Action | owner | admin | manager | viewer |
| --- | --- | --- | --- | --- |
| List clones / library | ✓ | ✓ | ✓ | ✓ |
| Create clone + consent | ✓ | ✓ | ✓ | ✗ |
| Preview clone | ✓ | ✓ | ✓ | ✓ |
| Assign clone to agent | ✓ | ✓ | ✓ | ✗ |
| Revoke/delete clone | ✓ | ✓ | ✗ | ✗ |

Aligns with M08 voice permissions; revoke is elevated to owner/admin only.

## Out of scope (M09)

| Item | Module / phase |
| --- | --- |
| Professional Voice Cloning (PVC) long-training workflows | Later / provider-specific |
| Real-time call recording as sample source | M12+ |
| Per-agent duplicate clones for same person | Never — violates ownership model |
| Public sample URLs or CDN exposure | Never |
| Automatic cloning without consent checkbox + audit | Never |
| Billing/entitlement gating for premium clone | Product layer — stub `enabled` flag OK |
| In-call voice switching | M12+ |
| Telephony / Twilio | M10+ |

## Dependencies

| Module | Use |
| --- | --- |
| M05 | Agents, `agent_configs.voice_id` |
| M06 | ElevenLabs credentials, agent provider sync on assign |
| M07 | Object storage patterns for private files |
| M08 | `voice_assets`, library list, preview, assign APIs |

## 09.01 acceptance

- [x] Objective and boundaries confirmed
- [x] Consent model documented
- [x] Sample upload/storage approach documented
- [x] Lifecycle + provider port documented
- [x] M08 integration path documented
- [x] Out of scope listed
