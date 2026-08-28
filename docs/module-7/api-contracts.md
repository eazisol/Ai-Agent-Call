# Module 07 — API contracts (implemented)

| Field | Value |
| --- | --- |
| Module | M07 — Knowledge Base |
| Status | **Implemented** — 27 August 2026 |
| Base | `/api/v1` |
| Auth | Session + `AuthGuard` |
| Context | `eazi_org` + `eazi_biz` (active business = library scope) |

## Business knowledge library

Checklist paths with `:businessId` are **intent**; MVP uses active business cookie.

| Method | Path (MVP) | Checklist intent | RBAC |
| --- | --- | --- | --- |
| GET | `/knowledge` | `GET …/businesses/:businessId/knowledge` | view |
| POST | `/knowledge/files` | file upload | create |
| POST | `/knowledge/url` | URL source | create |
| POST | `/knowledge/text` | text source | create |
| POST | `/knowledge/faq` | FAQ source | create |
| GET | `/knowledge/:id` | source detail | view |
| PATCH | `/knowledge/:id` | update metadata/content | update |
| POST | `/knowledge/:id/archive` | soft archive | archive |
| DELETE | `/knowledge/:id` | hard delete (safe) | delete |
| POST | `/knowledge/:id/sync` | first sync / publish | update |
| POST | `/knowledge/:id/resync` | retry / republish | update |
| GET | `/knowledge/:id/provider-status` | optional status | view |

Multipart for files (`file`, optional `name`, `description`); JSON for url/text/faq.

Query: `GET /knowledge?includeArchived=true`.

## Agent assignment

| Method | Path | RBAC |
| --- | --- | --- |
| GET | `/agents/:agentId/knowledge` | view |
| POST | `/agents/:agentId/knowledge/:knowledgeId` | assign |
| DELETE | `/agents/:agentId/knowledge/:knowledgeId` | assign |

Cross-business assign → `KNOWLEDGE_CROSS_BUSINESS` or `AGENT_NOT_FOUND` / `KNOWLEDGE_NOT_FOUND`.

## Response shapes

Source list/detail include: id, name, type, status, sync summary (`providerMappings`, `needsSync`), `assignedAgentCount`, `assignedAgents` (`{ id, name }[]`), content fields for text/faq, timestamps.  
Never include storage secrets or raw provider payloads.

## Internal

- `KnowledgeSyncPort` — publish / update / remove / getStatus / isConfigured.  
- `ObjectStoragePort` — putObject / getObject / deleteObject / healthCheck.  
- Env: `KNOWLEDGE_MAX_FILE_BYTES` (default 10MB); allowlist pdf, txt, md, docx, csv.
