# Module 06 — Security & QA evidence

| Field | Value |
| --- | --- |
| Module | M06 — ElevenLabs Voice Agent Provider |
| Submodule | 06.04 |
| Status | Verified — 27 August 2026 |

## Security controls

| Control | Evidence |
| --- | --- |
| API key server-side only | `ELEVENLABS_API_KEY` via Nest `ConfigService` → `elevenlabs.apiKey`; sent only as `xi-api-key` header from `ElevenLabsVoiceAgentSyncAdapter` |
| No browser credentials | Frontend `src/` has no `ELEVENLABS_*` / `xi-api-key`; `.env.example` has no provider keys; UI calls SaaS `/agents/:id/sync` only |
| Sanitized errors | Adapter maps HTTP status → `ApplicationError` with customer-safe messages; sync service `sanitizeError` + `lastError` truncated; unit test asserts 401 body secrets not returned |
| Tenant isolation | Sync/status require membership + active business; `findOwnedAgent({ id, businessId })`; cross-business → `AGENT_NOT_FOUND` (agents-domain unit test) |

## Automated QA (executed 27 August 2026)

| Suite | Result |
| --- | --- |
| `npm run build` (backend) | Pass |
| `node --test test/unit/agent-provider-sync.test.js` | Pass (create, update, not configured, sanitized error, status) |
| `node --test test/unit/agents-domain.test.js` | Pass (incl. cross-business / RBAC) |
| `node --test test/app.agents.e2e-test.js` | Pass (incl. sync + provider-status routes) |
| Frontend `npx tsc --noEmit` | Pass |

## Manual QA mapping (06.04 checklist)

| Item | Covered by |
| --- | --- |
| Create local then provider | Unit create path + Manual QA WF-1 / TC-M06-01 |
| Update sync | Unit update-when-external-id + TC-M06-02 |
| Failed call safe error | Unit PROVIDER_UNAVAILABLE → `lastError` + TC-M06-03 |
| Retry succeeds | Update path after error + TC-M06-04 |
| Mapping persists | Unique `(agent_id, provider)` + reload status + TC-M06-05 |
| Regression M05 | agents-domain + agents e2e + FE agents pages unchanged CRUD |
| E2E journey | Manual QA guide WF-1…WF-3 |

## Residual risk / known limits

- Live ElevenLabs calls in CI are not automated (require real key); adapter is mocked in unit tests.
- ConvAI has no soft-deactivate; archive leaves remote agent until hard delete best-effort.
- Default voice IDs are env heuristics until M08.
- **Key hygiene:** `.env.example` must keep `ELEVENLABS_API_KEY=` empty. If a real key was ever committed there, rotate it in the ElevenLabs dashboard (local `.env` remains gitignored).
