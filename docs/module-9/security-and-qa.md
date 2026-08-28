# Module 09 — Security & QA evidence

| Field | Value |
| --- | --- |
| Module | M09 — Voice Cloning |
| Submodule | 09.04 |
| Status | Verified — 28 August 2026 |

## Security controls

| Control | Evidence |
| --- | --- |
| Consent required before submit | `VoiceClonesService.submitForUser` rejects when `consentCount === 0` → `VOICE_CLONE_CONSENT_REQUIRED`; unit test `submit requires consent and samples` |
| No automatic cloning | Submit only via explicit `POST .../submit` after consent + samples; draft created separately |
| Private sample storage | Samples uploaded via multipart → `ObjectStoragePort.putObject` at `org/{orgId}/biz/{bizId}/voice-samples/...`; no public URL endpoint |
| Sample paths not exposed | `toDetail` returns sample `{ id, originalFilename, byteSize, contentType }` only — no `storageKey`; unit + e2e JSON scan |
| Retention / deletion | `deleteForUser` deletes object-storage blobs, mappings, `voice_assets`, clone row; blocked while agents assigned (`VOICE_CLONE_IN_USE`) |
| Revoke vs delete | Revoke sets `status = revoked` + archives library asset; delete requires unassigned + non-processing state |
| Audit logging | Structured logs: `voice_clone.created`, `.consent_recorded`, `.sample_uploaded`, `.submitted`, `.ready`, `.failed`, `.revoked`, `.deleted` |
| Tenant / Business isolation | `findOwnedClone(businessId, cloneId)`; active org + business cookies; cross-business → `VOICE_CLONE_NOT_FOUND` |
| RBAC | `voice-clone-permissions.ts`: viewer list/view; manager+ create/samples/consent/submit; owner/admin revoke/delete |
| Provider credentials server-side | `VoiceClonePort` / ElevenLabs adapter uses `ELEVENLABS_API_KEY` from config only; e2e excludes keys from clone API JSON |
| Agent assign reuse (M08) | Ready clone → one `voice_assets` row; assign via M08 `PUT /agents/:id/voice`; cross-business clone → `VOICE_NOT_ELIGIBLE` (M08 unit) |
| Unassign preserves clone | M08 `clearAgentVoiceForUser` nulls `agent_configs.voice_id` only — clone asset unchanged (M08 unit regression) |

## Automated QA (executed 28 August 2026)

| Suite | Result |
| --- | --- |
| Backend `npm run build` | Pass |
| `test/unit/voice-clones-domain.test.js` | Pass (11 tests: draft, consent+samples gate, submit→asset, delete blocked, viewer forbidden, cross-business, upload private, storage disabled, manager revoke forbidden, delete cleans storage) |
| `test/app.voice-clones.e2e-test.js` | Pass (6 tests: list, create, consent, delete blocked, secrets scan, 404) |
| `test/unit/voices-domain.test.js` | Pass (M08 regression: assign clone, cross-business, clear assignment, reuse A+B) |
| `test/app.voices.e2e-test.js` | Pass (M08 regression) |
| `test/unit/agents-domain.test.js` | Pass (M05 regression) |
| `test/app.agents.e2e-test.js` | Pass (M05/M06 regression) |
| `test/app.knowledge.e2e-test.js` | Pass (M07 regression) |
| Frontend `npx tsc --noEmit` | Pass |
| Frontend `npm run lint` | Pass |

## Manual QA mapping (09.04 checklist)

| Item | Covered by |
| --- | --- |
| P03-M09-04-01 Consent required | Unit submit gate + wizard UI + Manual TC-M09-02 |
| P03-M09-04-02 Private samples | Object storage path + no URL in API + Manual TC-M09-SEC-02 |
| P03-M09-04-03 Retention/deletion | Service delete/revoke + unit delete cleans storage + Manual TC-M09-09 |
| P03-M09-04-04 Audit log | Logger events listed above + server log review in Manual TC-M09-SEC-04 |
| P03-M09-04-05 Tenant isolation | Unit cross-business + org/biz cookies + Manual TC-M09-SEC-03 |
| P03-M09-04-06 Test consent | Unit + e2e consent |
| P03-M09-04-07 Test upload | Unit upload + Manual TC-M09-03 |
| P03-M09-04-08 Clone lifecycle | Unit submit→ready + detail/status UI + Manual TC-M09-04 |
| P03-M09-04-09 Assign reuse | M08 voices unit assign + Manual TC-M09-06 |
| P03-M09-04-10 Cross-business blocked | Unit + e2e 404 + M08 `VOICE_NOT_ELIGIBLE` |
| P03-M09-04-11 Regression | agents/knowledge/voices unit & e2e |
| P03-M09-04-12 Manual E2E journey | Manual QA guide WF-1…WF-7 |
| P03-M09-04-13 Unassign preserves clone | M08 clear assignment unit + Manual TC-M09-07 |
| P03-M09-04-14 Delete/revoke while assigned | Unit `VOICE_CLONE_IN_USE` + UI modals + Manual TC-M09-08/09 |
| P03-M09-04-15 No secrets / no public sample URLs | E2e JSON scan + FE grep + Manual TC-M09-SEC-01/02 |

## Residual risk / known limits

- Live ElevenLabs IVC (`POST /v1/voices/add`) not exercised in CI (mocked `VoiceClonePort`).
- Object storage (S3/MinIO) required for sample upload in production-like environments.
- No dedicated audit_events table — structured application logs only (M29 hardening later).
- In-browser recording quality varies by browser; file upload is the primary path.
- Premium/plan gating for clones not implemented (stub flag only in design).
- Provider network timeouts may leave clone in `failed` — retry supported.
