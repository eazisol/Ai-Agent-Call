# Module 07 — Knowledge Base: Scope & Requirements

| Field | Value |
| --- | --- |
| Module | M07 — Knowledge Base |
| Submodule | 07.01 — Scope & Technical Design |
| Status | Requirements locked — 27 August 2026 |
| Depends on | M04, M05, M06 Complete |
| Target | MVP |

## 1. Objective

Deliver a **Business-owned shared knowledge library** with **per-agent assignments**, so knowledge (files, URLs, text, FAQ) is uploaded once, stored canonically in EaziAiCall, optionally synchronized to a provider knowledge system via a **provider-neutral adapter**, and reused across agents in the same Business without duplicate uploads.

EaziAiCall PostgreSQL (+ object storage for file originals) remains the **source of truth**. ElevenLabs (or future RAG providers) hold a projection.

## 2. Boundaries

### In scope (M07) — maps to 07.01 checklist

| ID | Capability | Acceptance intent |
| --- | --- | --- |
| P03-M07-01-01 | Objective & ownership model | This document; Business assets + agent assignments |
| P03-M07-01-02 | Upload file | Business knowledge source type `file` → object storage + metadata |
| P03-M07-01-03 | Add URL | Type `url` with validated http(s) URL |
| P03-M07-01-04 | Add plain text | Type `text` with body stored in DB (or object storage if large — prefer DB for MVP text) |
| P03-M07-01-05 | Add FAQ | Type `faq` (structured Q/A list or markdown FAQ body — see decisions) |
| P03-M07-01-06 | List Business sources | Shared library for active business |
| P03-M07-01-07 | Store original | Canonical `knowledge_sources` (+ object key for files) |
| P03-M07-01-08 | Sync to provider | `KnowledgeSyncProvider` publish/update/remove |
| P03-M07-01-09 | Display sync state | On Business source; surface on agent assignment UI |
| P03-M07-01-10 | Delete/archive | Safe assignment handling (detect / confirm / block) |
| P03-M07-01-11 | Resync failed | Explicit resync; canonical source retained |
| P03-M07-01-12 | Out of scope | Section 3 |
| P03-M07-01-13 | View source | Detail: metadata, summary, sync, assigned agents |
| P03-M07-01-14 | Update source | Edit metadata/content without per-agent copies |
| P03-M07-01-15 | Assign to agents | Same-Business only |
| P03-M07-01-16 | Unassign | Removes assignment only |
| P03-M07-01-17 | List agent knowledge | Assignments for one agent |
| P03-M07-01-18 | Reuse across agents | One source row; many assignment rows |
| P03-M07-01-19 | Ownership rules | Documented below + Phase 03 lock |

### Decisions locked in 07.01

| Topic | Decision |
| --- | --- |
| Ownership | **Business** owns `knowledge_sources`. Agents consume via `agent_knowledge_sources` |
| Container table | **No** separate `knowledge_bases` table for MVP. The Business **is** the library container (`knowledge_sources.business_id`). Checklist “knowledge_bases” satisfied by this equivalent |
| Org column | **Do not** duplicate `organization_id` on knowledge tables; derive tenant via `business_id` → `businesses.organization_id` |
| Source types | `file` \| `url` \| `text` \| `faq` |
| FAQ shape (MVP) | JSON array of `{ question, answer }` (validated); rendered to provider as concatenated text/FAQ document |
| File storage | Existing `OBJECT_STORAGE_*` / `ObjectStoragePort`. Keys tenant-scoped: `org/{orgId}/biz/{businessId}/knowledge/{sourceId}/{filename}` |
| Provider contract | New **`KnowledgeSyncPort`** (registry name `KnowledgeSyncProvider`): publish / update / remove / getStatus. First adapter: **ElevenLabs**. Separate from `VoiceAgentSyncPort` |
| Provider IDs | Store in **`knowledge_provider_mappings`** (`provider`, `external_source_id`, sync fields) — **not** `elevenlabs_knowledge_id` on core tables |
| Sync trigger | **Explicit** sync/resync (API + UI). Create source does **not** require immediate provider publish (may offer “sync now” after create) |
| Sync status | `not_provisioned` \| `pending` \| `synced` \| `error` (same vocabulary as M06) on mapping (and denormalized display fields OK) |
| Sync logs | Prefer **mapping-only MVP** (like M06). Add `knowledge_sync_logs` in 07.02 **only if** status history is required for QA; otherwise defer |
| Assign uniqueness | Unique `(agent_id, knowledge_source_id)` |
| Cross-business | Assign blocked if agent.business_id ≠ source.business_id |
| Delete policy | **Block** hard delete while any assignments exist (`KNOWLEDGE_HAS_ASSIGNMENTS`); provide archive/unassign-all + delete flow. Soft **archive** hides from default library list |
| Unassign | Never deletes the Business source |
| API style | Prefer **cookie-scoped** active business (`eazi_biz`) under `/api/v1/knowledge*` and `/api/v1/agents/:id/knowledge*`, consistent with M05 agents. Path `:businessId` in checklist is architectural intent — implement as active-business context unless multi-business admin tools appear later |
| RBAC | See matrix below |
| Languages | Optional `language` metadata on source later; **no** translation/localization in M07 |
| Malware | MVP: MIME/extension allowlist + max size; deep AV scanning out of scope |
| Async workers | MVP may sync inline (HTTP) with `pending`→result; durable outbox/worker deferred if timeouts force it in 07.02 |

### MVP permission matrix

| Action | owner | admin | manager | viewer |
| --- | --- | --- | --- | --- |
| List / view Business knowledge | ✓ | ✓ | ✓ | ✓ |
| Create / update / resync knowledge | ✓ | ✓ | ✓ | ✗ |
| Archive / delete knowledge | ✓ | ✓ | ✗ | ✗ |
| Assign / unassign to agent | ✓ | ✓ | ✓ | ✗ |
| List agent assignments | ✓ | ✓ | ✓ | ✓ |

(Align with agent update for assign; archive/delete with agent archive roles.)

### Planned data / API / UI

- [data-model.md](./data-model.md)  
- [domain-logic.md](./domain-logic.md)  
- [api-contracts.md](./api-contracts.md)  
- [frontend-surfaces.md](./frontend-surfaces.md)

## 3. Out of scope (do not pull forward)

| Item | Deferred to |
| --- | --- |
| Voice library / cloning | M08 / M09 |
| Live call-time RAG orchestration details | M12+ |
| Knowledge gap detection / approval | M21 |
| Translation / multi-language variants of sources | Later |
| Fine-tuning / custom model training | Never default |
| Retell / custom RAG adapters | Future adapters on same port |
| Auto-ingest email/crawl entire website | Later |
| Full-text search UI over embeddings | Later |
| Billing for storage/tokens | M20+ |
| Changing M06 agent sync contract | Unrelated |

## 4. Dependencies

| Module | Why |
| --- | --- |
| M04 | Business tenancy + active business |
| M05 | Agents to assign sources to |
| M06 | Provider secrets pattern; agent already on ElevenLabs for later call-time use |
| Object storage | File originals (may be disabled in local env with files blocked until enabled) |

## 5. Success criteria for 07.01

- [x] Ownership model locked (Business library + assignments)  
- [x] Source types + provider-neutral mapping locked  
- [x] Delete/assign rules locked  
- [x] Out of scope explicit  
- [x] Design docs under `docs/module-7/`  
- [x] Implementation starts only in **07.02** — backend shipped 27 August 2026

## 6. Open items for 07.02 (non-blocking)

1. Exact ElevenLabs knowledge/RAG API endpoints and payload mapping.  
2. Whether inline sync vs job queue is required for large files.  
3. Whether `knowledge_sync_logs` is needed beyond mapping columns.  
4. Max file size / allowed MIME list finalized in env.
