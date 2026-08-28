# M09 — Voice Cloning — Manual QA Handoff

| Field | Value |
| --- | --- |
| Module | M09 — Voice Cloning |
| Phase | P03 — Knowledge & Voice |
| Status | Implementation complete — 28 August 2026 |
| Depends on | M05 agents, M06 provider sync, M07 object storage pattern, M08 voice library |
| Audience | Manual QA Engineer / Tester |
| Build reference | Record commit SHA and test date in sign-off |

---

## 1. Module overview

M09 delivers **Business-owned reusable cloned voices** with **explicit consent**, **private sample handling**, and **per-agent assignment via the M08 Voice Library**. One canonical clone lifecycle (`voice_clones`) produces one library asset (`voice_assets` with `source_type = business_clone`); multiple agents reference the same asset through `agent_configs.voice_id`.

**Role in product:** Let a business create a custom voice identity (e.g. “Owner Custom Clone”) once, preview it, and assign it to Receptionist and Appointment agents without duplicating the clone or re-uploading samples.

## 2. Delivered scope

### In scope

- Clone dashboard: list, status, agent usage count  
- Create wizard: consent (m09-v1) → sample upload/record → submit  
- Processing status with polling; retry on failure; revoke when ready  
- Private sample storage (S3-compatible)  
- Ready clones appear in **Voice Library** with **Custom** badge  
- Assign via existing agent Voice tab / M08 APIs  
- RBAC aligned with design (viewer read-only; revoke/delete owner/admin)

### Out of scope (do not file as bugs)

- Professional Voice Cloning (PVC) long-training  
- Premium plan / billing gating UI  
- Public or CDN sample URLs  
- Per-agent duplicate clones for the same person  
- In-call voice switching (M12+)  
- Telephony (M10+)

## 3. Dependencies and prerequisites

| Requirement | Notes |
| --- | --- |
| M05–M08 | Active org + business; agents exist; voice library works |
| Migration | `1756110000000-VoiceCloning` applied |
| Cookies | `eazi_org` + `eazi_biz` |
| Object storage | `OBJECT_STORAGE_ENABLED=true` + bucket credentials |
| Clone submit | `ELEVENLABS_API_KEY` set on backend — **paid ElevenLabs plan with Instant Voice Cloning** (free tier returns `paid_plan_required`) |
| Optional caps | `VOICE_CLONE_MAX_SAMPLE_BYTES` (default 25MB), `VOICE_CLONE_MAX_SAMPLES` (default 5) |

**Suggested test accounts**

- Owner / Admin / Manager / Viewer in Org A, Business A  
- Two agents in Business A  
- Owner in Org B, Business B (tenant isolation)

## 4. Roles and permissions

| Action | owner | admin | manager | viewer |
| --- | --- | --- | --- | --- |
| List / view clones | ✓ | ✓ | ✓ | ✓ |
| Create / consent / upload / submit | ✓ | ✓ | ✓ | ✗ |
| Preview ready clone (library) | ✓ | ✓ | ✓ | ✓ |
| Assign clone to agent (M08) | ✓ | ✓ | ✓ | ✗ |
| Revoke ready clone | ✓ | ✓ | ✗ | ✗ |
| Delete draft/failed/revoked | ✓ | ✓ | ✗ | ✗ |

## 5. User-facing surfaces

| Route | Purpose |
| --- | --- |
| `/voices/clones` | Clone list + create CTA |
| `/voices/clones/new` | 3-step wizard |
| `/voices/clones/[id]` | Detail, timeline, preview, retry, revoke/delete |
| `/voices` | Library; filter **Custom clones**; **Custom** badge |
| `/agents/[id]/voice` | Assign ready clone (unchanged M08 flow) |
| Voice Library → **Custom clones** | Link from library header |

## 6. Backend / API surface

Prefix `/api/v1` — session + active org + active business.

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/voices/clones` | List clones |
| POST | `/voices/clones` | Create draft `{ displayName, description? }` |
| GET | `/voices/clones/:id` | Detail (no sample storage keys) |
| GET | `/voices/clones/:id/status` | Poll processing |
| POST | `/voices/clones/:id/consent` | `{ consentVersion, consentTextHash }` |
| POST | `/voices/clones/:id/samples` | Multipart `file` |
| DELETE | `/voices/clones/:id/samples/:sampleId` | Draft/failed only |
| POST | `/voices/clones/:id/submit` | Provider create |
| POST | `/voices/clones/:id/retry` | Resubmit failed |
| POST | `/voices/clones/:id/revoke` | Ready only |
| DELETE | `/voices/clones/:id` | Safe delete |
| PUT | `/agents/:agentId/voice` | Assign library voice (M08) |

Never return provider API keys, `storageKey`, or signed sample URLs in portal JSON.

## 7. Data and integrations

- Tables: `voice_clones`, `voice_consents`, `voice_samples`  
- On ready: upsert `voice_assets` + `voice_provider_mappings`  
- Samples: private object storage at `org/.../voice-samples/...`  
- Provider: `VoiceClonePort` → ElevenLabs IVC `POST /v1/voices/add`

## 8. End-to-end workflows

### WF-1 — Create clone with consent and file upload

1. Active business → **Voice Library → Custom clones → Create custom voice**.  
2. Step 1: name + accept consent → continue.  
3. Step 2: upload MP3/WAV (or record) → sample appears in list.  
4. Step 3: review → **Submit clone**.  
5. Expect processing → ready (or failed with message if provider/storage misconfigured).

### WF-2 — Record sample in browser

1. Step 2 → **Record sample** → speak 5+ seconds → **Stop recording**.  
2. Expect upload success (not “unexpected error”).  
3. Too-short recording shows friendly validation message.

### WF-3 — Preview and assign

1. When clone is **Ready**, open detail → **Preview** / **Open Voice Library**.  
2. Assign to Agent A from Voice tab; repeat for Agent B.  
3. Both agents show same custom voice; library shows one **Custom** asset.

### WF-4 — Change Agent A only

1. With A and B on same clone, change Agent A to a catalogue voice.  
2. Agent B still on custom clone; clone detail still shows both or updated count.

### WF-5 — Revoke with agents assigned

1. With agents still assigned, attempt **Revoke** on ready clone.  
2. Modal warns about active assignments; confirm revoke.  
3. Clone status **Revoked**; verify assign picker behavior (not offered / library archived).

### WF-6 — Delete while assigned (blocked)

1. Assign clone to an agent.  
2. Attempt **Delete** on clone (or API).  
3. Expect block with `VOICE_CLONE_IN_USE` and agent list in error/details.

### WF-7 — Unassign then delete

1. Clear voice from all agents (M08 clear).  
2. Delete draft/failed/revoked clone → succeeds.

## 9. Negative and edge cases

| Case | Expected |
| --- | --- |
| Submit without consent | `VOICE_CLONE_CONSENT_REQUIRED` |
| Submit without samples | `VOICE_CLONE_SAMPLES_REQUIRED` |
| Upload with storage disabled | `OBJECT_STORAGE_NOT_CONFIGURED` |
| >5 samples or >25MB file | Limit error |
| Unsupported file type | `VOICE_CLONE_SAMPLE_INVALID` |
| Viewer create/submit | UI blocked / 403 |
| Manager revoke/delete | UI hidden / 403 |
| Delete while processing | `VOICE_CLONE_INVALID_STATE` |
| Cross-business clone id | 404 `VOICE_CLONE_NOT_FOUND` |
| Provider timeout/failure | `failed` + lastError + Retry |

## 10. Security / tenant cases

| ID | Case | Expected |
| --- | --- | --- |
| TC-M09-SEC-01 | Network tab on clone APIs | No `xi-api-key` / ElevenLabs key |
| TC-M09-SEC-02 | Clone detail JSON | No `storageKey`, no public sample URL |
| TC-M09-SEC-03 | Business B access Business A clone | 404 / not listed |
| TC-M09-SEC-04 | Server logs after consent/submit/revoke | `voice_clone.*` audit lines present |
| TC-M09-SEC-05 | Assign Business A clone to Business B agent | `VOICE_NOT_ELIGIBLE` (M08) |

## 11. Happy-path test cases

| ID | Steps | Expected |
| --- | --- | --- |
| TC-M09-01 | Open `/voices/clones` empty state | CTA to create; list loads |
| TC-M09-02 | Consent step | Checkbox required; consent recorded |
| TC-M09-03 | Upload + record sample | Sample listed; sizes shown |
| TC-M09-04 | Submit → ready | Timeline complete; library link works |
| TC-M09-05 | Preview ready clone | Audio plays (URL or API fallback) |
| TC-M09-06 | Assign two agents | Same voice asset reused |
| TC-M09-07 | Clear one agent voice | Clone asset remains |
| TC-M09-08 | Revoke modal with assignments | Warning shown; revoke succeeds |
| TC-M09-09 | Delete unassigned failed draft | Removed from list |

## 12. Regression scope

- M05 agent CRUD and voice column  
- M06 agent provider sync after voice assign  
- M07 knowledge assign (unchanged)  
- M08 voice library list/preview/assign/cross-business  
- M04 business switcher  

## 13. Known limitations

- CI mocks ElevenLabs clone creation  
- Object storage must be configured for uploads  
- Recording format varies (WebM primary in browser)  
- ElevenLabs connectivity may be flaky on some networks (retry)  
- Structured logs only — no audit_events table yet  

## 14. Evidence expectations

Screenshots: wizard steps, sample list, processing/ready timeline, library **Custom** badge, two agents assigned, revoke/delete modals, blocked delete error. Capture `error.code` + correlation ID on failures.

## 15. Bug-reporting guide

Include: role, org, business, clone id, agent ids, route, HTTP status, `error.code`, object storage enabled (yes/no), ElevenLabs configured (yes/no only). Do **not** paste `.env`, cookies, sample files, or provider keys.

## 16. QA sign-off checklist

| Item | Value |
| --- | --- |
| Tester name | |
| Date | |
| Build / commit | |
| Tests executed | TC-M09-01 … TC-M09-09 + SEC-01 … SEC-05 + WF-1 … WF-7 |
| Open blockers | |
| Evidence links | |
| Recommendation | ☐ Pass ☐ Pass with known issues ☐ Fail |

**Automated evidence (dev):** backend build + voice-clones/voices/agents/knowledge unit & e2e; frontend typecheck — 28 August 2026. See [security-and-qa.md](./security-and-qa.md).
