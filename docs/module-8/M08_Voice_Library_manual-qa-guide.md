# M08 — Voice Library — Manual QA Handoff

| Field | Value |
| --- | --- |
| Module | M08 — Voice Library |
| Phase | P03 — Knowledge & Voice |
| Status | Implementation complete — 28 August 2026 |
| Depends on | M05 agents, M06 provider sync pattern, M07 shared-asset UX precedent |
| Audience | Manual QA Engineer / Tester |
| Build reference | Record commit SHA and test date in sign-off |

---

## 1. Module overview

M08 delivers a **Shared Business Voice Library** with **per-agent voice selection**. Provider catalogue voices are cached canonically in EaziAiCall (`voice_assets` + `voice_provider_mappings`); agents reference a shared row via `agent_configs.voice_id` — the same voice (e.g. Sarah) can be assigned to Agent A and Agent B without duplicating the asset.

**Role in product:** Choose and preview receptionist voices before calls go live. Voice cloning (M09), telephony (M10+), and call-time TTS orchestration (M12+) are out of scope.

## 2. Delivered scope

### In scope

- Business Voice Library: list, search/filter, preview  
- Agent voice tab: view assignment, pick from library, save/clear  
- Provider catalogue via `VoiceCatalogPort` (ElevenLabs first adapter)  
- Compatibility warnings on assign (language mismatch)  
- M06 sync uses assigned `voice_id` when set  
- Portal: `/voices`, `/agents/[id]/voice`, nav **Voices**

### Out of scope (do not file as bugs)

- Voice cloning / consent (M09)  
- Auto-sync to provider on every assign (explicit M06 sync)  
- Premium voice billing (M25)  
- Retell / custom catalogue adapters  
- Replacing M05 `voice_preference` on create (remains fallback filter)

## 3. Dependencies and prerequisites

| Requirement | Notes |
| --- | --- |
| M05–M06 | Active org + business; at least one agent; optional prior M06 sync |
| Migration | `1756100000000-VoiceLibrary` applied |
| Cookies | `eazi_org` + `eazi_biz` |
| Catalogue + preview | `ELEVENLABS_API_KEY` set on backend |
| Optional | `VOICE_CATALOG_CACHE_TTL_SECONDS` (default 3600) |

**Suggested test accounts**

- Owner / Admin / Manager / Viewer in Org A, Business A  
- Two agents in Business A (Agent A, Agent B)  
- Owner in Org B, Business B (tenant isolation)

## 4. Roles and permissions

| Action | owner | admin | manager | viewer |
| --- | --- | --- | --- | --- |
| List / preview voices | ✓ | ✓ | ✓ | ✓ |
| View agent voice assignment | ✓ | ✓ | ✓ | ✓ |
| Assign / clear agent voice | ✓ | ✓ | ✓ | ✗ |

## 5. User-facing surfaces

| Route | Purpose |
| --- | --- |
| `/voices` | Shared Business voice library + filters + preview |
| `/voices?pickFor=:agentId` | Browse while picking for an agent |
| `/agents/[id]/voice` | Current voice, picker, save, M06 sync panel |
| Agent list / overview | Voice column / assigned voice summary |
| Sidebar **Voices** | Enabled → `/voices` |

## 6. Backend / API surface

Prefix `/api/v1` — session + active org + active business.

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/voices` | Library (filters: q, language, genderPresentation, accent) |
| GET | `/voices/:id` | Detail + assigned agents |
| POST | `/voices/:id/preview` | Server-proxied audio (base64) |
| GET | `/agents/:agentId/voice` | Current assignment |
| PUT/POST | `/agents/:agentId/voice` | `{ voiceId }` assign |
| DELETE | `/agents/:agentId/voice` | Clear assignment |

Never return provider API keys or raw `external_voice_id` in list/preview responses.

## 7. Data and integrations

- Tables: `voice_assets`, `voice_provider_mappings`; assignment on `agent_configs.voice_id`  
- `VoiceCatalogPort` → ElevenLabs `/v1/voices`, `/v1/text-to-speech/{id}`  
- M06 `VoiceAgentSyncPort` resolves `voice_id` → external mapping on sync

## 8. End-to-end workflows

### WF-1 — Browse library and preview

1. Active business → **Voices**.  
2. Expect catalogue voices (with ElevenLabs key) or safe empty/error if unconfigured.  
3. Click **Preview** on a voice — audio plays; no errors exposing secrets.

### WF-2 — Assign voice to agent

1. Open **Agents → [Agent] → Voice**.  
2. Select a voice → **Save voice**.  
3. Expect success message + optional compatibility warnings.  
4. Overview shows assigned voice name.

### WF-3 — Reuse same voice on two agents

1. Assign Sarah to Agent A; save.  
2. Assign Sarah to Agent B; save.  
3. Both show Sarah; library still has one Sarah row (not two).

### WF-4 — Change Agent A only

1. With A and B both on Sarah, change Agent A to a different voice.  
2. Agent B still shows Sarah.

### WF-5 — Sync to provider (M06)

1. After assign, use **Sync agent** on Voice tab or Overview.  
2. Expect synced status; voice applied on ElevenLabs agent (with key).

### WF-6 — Clear assignment

1. **Clear assignment** on agent Voice tab.  
2. Falls back to presentation preference until a new voice is assigned.

## 9. Negative and edge cases

| Case | Expected |
| --- | --- |
| No active business | Empty CTA / `ACTIVE_BUSINESS_REQUIRED` |
| Viewer assign | UI blocked / 403 |
| Cross-business clone (when M09 exists) | `VOICE_NOT_ELIGIBLE` |
| Preview without ElevenLabs key | `PROVIDER_NOT_CONFIGURED` or `VOICE_PREVIEW_FAILED` |
| Catalogue timeout | Safe error + retry on library |
| Archived voice | Not in list / assign blocked |

## 10. Security / tenant cases

| ID | Case | Expected |
| --- | --- | --- |
| TC-M08-SEC-01 | Network tab on preview | No `xi-api-key` / ElevenLabs key in responses |
| TC-M08-SEC-02 | FE source / env | No `ELEVENLABS_API_KEY` in frontend bundle |
| TC-M08-SEC-03 | List/detail JSON | No `externalVoiceId` in portal payloads |
| TC-M08-SEC-04 | Business B assign Business B clone while on Business A | Blocked / not visible |
| TC-M08-SEC-05 | Provider 401/503 body | Sanitized message only in UI |

## 11. Happy-path test cases

| ID | Steps | Expected |
| --- | --- | --- |
| TC-M08-01 | Open `/voices` with filters | Filtered list; shared-asset copy visible |
| TC-M08-02 | Preview voice | Audio plays; loading/error states OK |
| TC-M08-03 | Assign + save on agent Voice tab | Assignment persisted; warnings if any |
| TC-M08-04 | Two agents same voice | Both assigned; single library asset |
| TC-M08-05 | Change Agent A voice | Agent B unchanged |
| TC-M08-06 | Browse library from agent (`pickFor`) | Returns to agent with selection hint |
| TC-M08-07 | M06 sync after assign | Provider sync succeeds or safe error |
| TC-M08-08 | Agent with de-only languages + en-only voice | Warning shown; assign allowed (MVP) |

## 12. Regression scope

- M05 agent CRUD / language / list shows voice column  
- M06 agent provider sync panel  
- M07 knowledge assign (unchanged)  
- M04 business switcher  

## 13. Known limitations

- No auto-sync on voice assign  
- CI does not call live ElevenLabs  
- M09 custom clones not creatable in portal yet (badge/styling ready)  
- In-memory catalogue TTL (not shared across API instances)  

## 14. Evidence expectations

Screenshots: library list + filters, preview playing, agent Voice tab assigned state, two agents same voice, change A ≠ B, sync panel, viewer denied assign. Capture `error.code` + correlation ID on failures.

## 15. Bug-reporting guide

Include: role, org, business, voice id, agent id, route, HTTP status, `error.code`, whether ElevenLabs configured (yes/no only). Do **not** paste `.env`, cookies, or provider keys.

## 16. QA sign-off checklist

| Item | Value |
| --- | --- |
| Tester name | |
| Date | |
| Build / commit | |
| Tests executed | TC-M08-01 … TC-M08-08 + SEC-01 … SEC-05 + WF-1 … WF-6 |
| Open blockers | |
| Evidence links | |
| Recommendation | ☐ Pass ☐ Pass with known issues ☐ Fail |

**Automated evidence (dev):** backend build + voices/agents unit & e2e; frontend typecheck — 28 August 2026. See [security-and-qa.md](./security-and-qa.md).
