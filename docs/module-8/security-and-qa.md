# Module 08 — Security & QA evidence

| Field | Value |
| --- | --- |
| Module | M08 — Voice Library |
| Submodule | 08.04 |
| Status | Verified — 28 August 2026 |

## Security controls

| Control | Evidence |
| --- | --- |
| No provider secrets in preview flow | `VoicesService.previewForUser` calls `VoiceCatalogPort.previewVoice` server-side; API returns `{ contentType, audioBase64 }` only — no `external_voice_id`, no API key. E2e asserts response JSON excludes `xi-api-key`, `ELEVENLABS`, `externalVoiceId` |
| No provider secrets in browser | Frontend `src/` grep: no `ELEVENLABS`, `xi-api-key`, or `external_voice` strings; UI calls SaaS `/voices*` only |
| Tenant/Business-scoped assignment | Active org + business cookies; `findOwnedAgent(businessId)`; voice eligibility: `business_id IS NULL` (catalogue) OR `business_id = activeBusiness`; clone cross-business → `VOICE_NOT_ELIGIBLE` |
| Shared asset reuse | One `voice_assets` row; multiple `agent_configs.voice_id` FKs; changing Agent A does not update Agent B (unit test) |
| Provider-neutral domain | Core tables use `voice_provider_mappings.external_voice_id`; no `elevenlabs_*` columns on `voice_assets` / `agent_configs` |
| Sanitized provider errors | `ElevenLabsVoiceCatalogAdapter` maps to `VOICE_CATALOG_UNAVAILABLE`, `VOICE_PREVIEW_FAILED`, `PROVIDER_*`; never returns raw provider body to client |
| RBAC | `voice-permissions.ts`: viewer list/preview/view; manager+ assign; assign blocked → `FORBIDDEN` (unit) |
| Catalogue cache isolation | Platform catalogue rows (`business_id NULL`) readable by all businesses in org context; business clones scoped by `business_id` |

## Automated QA (executed 28 August 2026)

| Suite | Result |
| --- | --- |
| Backend `npm run build` | Pass |
| `test/unit/voices-domain.test.js` | Pass (list, assign, cross-business clone, reuse A+B, A change ≠ B, warnings, preview, viewer forbidden, archived blocked, clear) |
| `test/app.voices.e2e-test.js` | Pass (list, preview, assign, get assignment, cross-business, preview failure) |
| `test/unit/agents-domain.test.js` | Pass (M05 regression + `voiceSummary`) |
| `test/unit/agent-provider-sync.test.js` | Pass (M06 regression + `voiceExternalId` resolution) |
| `test/app.agents.e2e-test.js` | Pass (M05/M06 regression) |
| `test/app.knowledge.e2e-test.js` | Pass (M07 regression) |
| Frontend `npm run typecheck` | Pass |

## Manual QA mapping (08.04 checklist)

| Item | Covered by |
| --- | --- |
| List voices | Unit list + e2e GET `/voices` + Manual TC-M08-01 |
| Preview | Unit preview + e2e POST preview + Manual TC-M08-02 |
| Assign voice | Unit + e2e PUT assign + Manual TC-M08-03 |
| Persist mapping / no duplicate asset | Unit reuse + Manual TC-M08-04 |
| Invalid/unavailable voice | Unit archived + e2e preview failure + Manual TC-M08-05 |
| Same voice on A and B | Unit reuse test + Manual TC-M08-06 |
| Change A ≠ B | Unit isolation test + Manual TC-M08-07 |
| Language compatibility warning | Unit warnings + Manual TC-M08-08 |
| Cross-business clone blocked | Unit + e2e `VOICE_NOT_ELIGIBLE` + Manual TC-M08-SEC-04 |
| Provider secrets | E2e JSON scan + FE grep + Manual TC-M08-SEC-01…03 |
| Regression M05/M06/M07 | agents/knowledge unit & e2e |

## Residual risk / known limits

- Live ElevenLabs catalogue fetch and TTS preview are not exercised in CI (mocked / env-gated).  
- No rate-limit on preview endpoint in M08 MVP (optional hardening later).  
- Catalogue refresh TTL in-memory per process (`VoiceCatalogSyncService.lastSyncedAt`).  
- M09 business clones not live until M09 — cross-business clone tests use seeded rows only.  
- Keep `ELEVENLABS_API_KEY=` empty in committed `.env.example`.
