# Module 07 — Security & QA evidence

| Field | Value |
| --- | --- |
| Module | M07 — Knowledge Base |
| Submodule | 07.04 |
| Status | Verified — 27 August 2026 |

## Security controls

| Control | Evidence |
| --- | --- |
| File type/size validation | `ALLOWED_EXTENSIONS` / `ALLOWED_CONTENT_TYPES` + `KNOWLEDGE_MAX_FILE_BYTES` (default 10MB) in `knowledge.service.ts`; rejects with `KNOWLEDGE_TYPE_INVALID` / `KNOWLEDGE_FILE_TOO_LARGE` |
| Tenant-scoped object keys | `org/{organizationId}/biz/{businessId}/knowledge/{sourceId}/{filename}` |
| Signed/private storage | Bucket accessed only via server `OBJECT_STORAGE_*` credentials; browser never receives access keys or public object URLs; `getObject` used server-side for provider sync. Portal does not expose direct file download in M07 MVP (known limit) |
| URL validation | `requireHttpUrl` — http(s) only → `KNOWLEDGE_URL_INVALID` |
| Tenant isolation | Active org + business cookies; `findOwnedSource({ businessId, id })`; assign requires same `business_id` → `KNOWLEDGE_CROSS_BUSINESS`; unit + e2e covered |
| No provider/storage secrets in browser | Frontend `src/` has no `ELEVENLABS_API_KEY` / `OBJECT_STORAGE_SECRET_*` / `xi-api-key`; UI calls SaaS `/knowledge*` only |
| Sanitized provider errors | `KnowledgeSyncService.sanitizeError` + mapping `lastError`; adapter maps to `PROVIDER_*` codes |
| Delete safety | Hard delete blocked while assignments exist → `KNOWLEDGE_HAS_ASSIGNMENTS` |
| RBAC | `knowledge-permissions.ts` matrix (viewer list/view; manager create/update/assign; owner/admin archive/delete) |

## Automated QA (executed 27 August 2026)

| Suite | Result |
| --- | --- |
| Backend `npm run build` | Pass |
| `test/unit/knowledge-domain.test.js` | Pass (create, assign, cross-business, delete blocked, sync not configured, file without storage) |
| `test/unit/agents-domain.test.js` | Pass (M05 regression) |
| `test/app.knowledge.e2e-test.js` | Pass (routes + assign + cross-business) |
| `test/app.agents.e2e-test.js` | Pass (M05/M06 regression) |
| Frontend `npx tsc --noEmit` | Pass |

## Manual QA mapping (07.04 checklist)

| Item | Covered by |
| --- | --- |
| Upload→store→sync | Manual WF-1 / TC-M07-01 (needs S3 + ElevenLabs) |
| URL/text sync | Unit create + Manual TC-M07-02 |
| Delete/archive + assignments | Unit delete-blocked + Manual TC-M07-03 |
| Failed sync / resync | Sync not configured unit + Manual TC-M07-04 |
| Cross-tenant / cross-business | Unit + e2e `KNOWLEDGE_CROSS_BUSINESS` |
| Multi-agent reuse / unassign isolation | Manual TC-M07-05…07 + domain assign uniqueness |
| Provider secrets | Network/env scan + Manual SEC cases |
| Regression M05/M06 | agents unit/e2e |

## Residual risk / known limits

- Live ElevenLabs knowledge sync and live S3 uploads are not exercised in CI (mocked / env-gated).  
- No time-limited signed download URL endpoint in M07 portal MVP — originals stay private server-side.  
- Deep malware scanning deferred.  
- Keep `ELEVENLABS_API_KEY=` and storage secrets empty in `.env.example`.
