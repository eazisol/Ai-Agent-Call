# M07 — Knowledge Base — Manual QA Handoff

| Field | Value |
| --- | --- |
| Module | M07 — Knowledge Base |
| Phase | P03 — Knowledge & Voice |
| Status | Implementation complete — 27 August 2026 |
| Depends on | M01–M06 (esp. M04 business, M05 agents, M06 provider secrets pattern) |
| Audience | Manual QA Engineer / Tester |
| Build reference | Record commit SHA and test date in sign-off |

---

## 1. Module overview

M07 delivers a **Business-owned shared knowledge library** with **per-agent assignments**. Sources (file, URL, text, FAQ) are uploaded once, stored canonically in EaziAiCall (Postgres + optional object storage), optionally synced to ElevenLabs knowledge via a provider-neutral adapter, and assigned to multiple agents without re-upload.

**Role in product:** Static business knowledge for receptionists. Voice library (M08/M09), live call RAG orchestration (M12+), and knowledge-gap detection (M21) are out of scope.

## 2. Delivered scope

### In scope

- Business library: list / create (file, URL, text, FAQ) / view / update / archive / delete  
- Provider sync / resync / status on sources  
- Agent assign / unassign / list assignments  
- Portal: `/knowledge*`, `/agents/[id]/knowledge`  
- Safe delete when assignments exist  

### Out of scope (do not file as bugs)

- Voice library / cloning (M08/M09)  
- Translation of sources  
- Full-text embedding search UI  
- Knowledge gap approval (M21)  
- Auto-sync on every edit  
- Signed browser download of original files (MVP: no public download UI)  

## 3. Dependencies and prerequisites

| Requirement | Notes |
| --- | --- |
| M04–M05 | Active org + business; at least one agent for assignment tests |
| Migration | `1756090000000-KnowledgeBase` applied |
| Cookies | `eazi_org` + `eazi_biz` |
| File uploads | `OBJECT_STORAGE_ENABLED=true` + S3-compatible credentials |
| Sync happy path | `ELEVENLABS_API_KEY` set |
| Optional | `KNOWLEDGE_MAX_FILE_BYTES` (default 10485760) |

**Suggested test accounts**

- Owner / Admin / Manager / Viewer in Org A, Business A  
- Owner in Org B, Business B  
- Same org, Business A vs Business B  

## 4. Roles and permissions

| Action | owner | admin | manager | viewer |
| --- | --- | --- | --- | --- |
| List / view library & agent assignments | ✓ | ✓ | ✓ | ✓ |
| Create / update / sync / assign | ✓ | ✓ | ✓ | ✗ |
| Archive / hard delete | ✓ | ✓ | ✗ | ✗ |

## 5. User-facing surfaces

| Route | Purpose |
| --- | --- |
| `/knowledge` | Shared Business library |
| `/knowledge/new` | Create File / URL / Text / FAQ |
| `/knowledge/[id]` | Detail, sync, assigned agents, edit, archive/delete |
| `/agents/[id]/knowledge` | Multi-select assign + link to library |
| Sidebar **Knowledge** | Enabled |

## 6. Backend / API surface

Prefix `/api/v1` — session + active org + active business.

| Method | Path | Notes |
| --- | --- | --- |
| GET/POST | `/knowledge`, `/knowledge/files\|url\|text\|faq` | Library |
| GET/PATCH/DELETE | `/knowledge/:id` | Detail / update / safe delete |
| POST | `/knowledge/:id/archive\|sync\|resync` | Lifecycle |
| GET | `/knowledge/:id/provider-status` | Status |
| GET/POST/DELETE | `/agents/:agentId/knowledge[/:knowledgeId]` | Assignments |

See [api-contracts.md](./api-contracts.md). Never return storage or provider secrets.

## 7. Data and integrations

- Tables: `knowledge_sources`, `agent_knowledge_sources`, `knowledge_provider_mappings`  
- Object storage for `file` type; url/text/faq without S3  
- `KnowledgeSyncPort` → ElevenLabs `/v1/convai/knowledge-base/*`  

## 8. End-to-end workflows

### WF-1 — Create text/FAQ and sync

1. Active business → Knowledge → Create → Text (or FAQ).  
2. Open detail → Sync.  
3. Expect **Synced** (with key) or safe `PROVIDER_NOT_CONFIGURED` / error without secrets.

### WF-2 — URL source

1. Create URL source with https URL.  
2. Sync; invalid URL rejected at create (`KNOWLEDGE_URL_INVALID`).

### WF-3 — File upload (if S3 enabled)

1. Upload allowed type (pdf/txt/md/docx/csv) under size limit.  
2. Oversized / bad extension rejected.  
3. Sync when provider configured.

### WF-4 — Assign to multiple agents

1. Create one FAQ.  
2. Agent A Knowledge → check FAQ; Agent B → check same FAQ.  
3. Unassign A → B still assigned; source remains in library.

### WF-5 — Delete safety

1. With assignments → Delete fails with clear message.  
2. Unassign all → Delete succeeds.  
3. Archive hides from default list (show archived).

## 9. Negative and edge cases

| Case | Expected |
| --- | --- |
| No active business | Empty CTA / `ACTIVE_BUSINESS_REQUIRED` |
| Viewer create/assign | UI blocked / 403 |
| Manager delete | 403 |
| Cross-business assign | `KNOWLEDGE_CROSS_BUSINESS` |
| Duplicate assign | `KNOWLEDGE_ASSIGNMENT_CONFLICT` |
| File without S3 | `OBJECT_STORAGE_NOT_CONFIGURED` |
| Sync without key | `PROVIDER_NOT_CONFIGURED` |

## 10. Security / tenant cases

| ID | Case | Expected |
| --- | --- | --- |
| TC-M07-SEC-01 | Network tab on sync | No API keys / storage secrets |
| TC-M07-SEC-02 | FE env / source | No `ELEVENLABS_API_KEY` / `OBJECT_STORAGE_SECRET` |
| TC-M07-SEC-03 | Org B access Org A source id | Not found / denied |
| TC-M07-SEC-04 | Business B assign Business A source | Cross-business blocked |
| TC-M07-SEC-05 | Object key pattern (server logs/DB) | Contains org + biz ids |
| TC-M07-SEC-06 | Provider 401 body | Safe message only in UI/`lastError` |

## 11. Happy-path test cases

| ID | Steps | Expected |
| --- | --- | --- |
| TC-M07-01 | Text create → sync | Source + mapping synced (or safe config error) |
| TC-M07-02 | URL create → sync | Same |
| TC-M07-03 | Assign → delete blocked → unassign → delete | Safe flow |
| TC-M07-04 | Force sync fail → resync after fix | Error then synced |
| TC-M07-05 | Same source on Agent A and B | Both assigned |
| TC-M07-06 | Unassign A only | B unchanged; source remains |
| TC-M07-07 | Detail shows assigned agent names | Links to agents |
| TC-M07-08 | Agent page Manage Business Knowledge | Navigates to `/knowledge` |

## 12. Regression scope

- M05 agent CRUD / language / activate  
- M06 agent provider sync panel  
- M04 business switcher  

## 13. Known limitations

- No portal signed download of original files  
- No `knowledge_sync_logs` history table  
- CI does not call live S3/ElevenLabs  
- Deep AV scanning not included  

## 14. Evidence expectations

Screenshots: library list, create tabs, sync success/error, multi-agent assign, delete blocked, viewer denial. Capture `error.code` + correlation ID on failures.

## 15. Bug-reporting guide

Include: role, org, business, knowledge id, agent id (if any), route, HTTP status, `error.code`, whether S3/ElevenLabs configured (yes/no only). Do **not** paste `.env`, cookies, or provider keys.

## 16. QA sign-off checklist

| Item | Value |
| --- | --- |
| Tester name | |
| Date | |
| Build / commit | |
| Tests executed | TC-M07-01 … TC-M07-08 + SEC-01 … SEC-06 |
| Open blockers | |
| Evidence links | |
| Recommendation | ☐ Pass ☐ Pass with known issues ☐ Fail |

**Automated evidence (dev):** backend build + knowledge/agents unit & e2e; frontend typecheck — 27 August 2026. See [security-and-qa.md](./security-and-qa.md).
