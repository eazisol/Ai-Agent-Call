# Module 07 — Domain logic (implemented)

| Field | Value |
| --- | --- |
| Module | M07 — Knowledge Base |
| Status | **Implemented** — 27 August 2026 |

## Create source (Business)

1. Authorize (membership + active business + RBAC).  
2. Validate type-specific payload (file MIME/size, URL scheme, text length, FAQ items).  
3. Persist `knowledge_sources` (`active`).  
4. For `file`: require `OBJECT_STORAGE_ENABLED` + credentials; upload via `ObjectStoragePort.putObject` under `org/{orgId}/biz/{businessId}/knowledge/{sourceId}/{filename}`; store `object_key`. If storage disabled → `OBJECT_STORAGE_NOT_CONFIGURED` 503.  
5. Do **not** auto-publish to provider; mapping stays absent / `not_provisioned` until explicit sync.

## Update source

1. Same ownership + RBAC.  
2. Bump `version` / refresh `content_hash` when content changes.  
3. UI may show `needsSync` when `version` > `last_synced_version` (or no mapping / error).

## Sync / resync

```text
not_provisioned ──sync──► pending ──success──► synced
                              │
                              └──failure──► error ──resync──► pending …
```

1. Load source + file/text/url/faq projection.  
2. Upsert `knowledge_provider_mappings` pending (stale-pending guard ~60s).  
3. Call `KnowledgeSyncPort.publish` (first) or `update` (existing external id).  
4. Success: external id + synced + `last_synced_version`; Failure: sanitized error.  
5. Never delete canonical source on provider failure.

ElevenLabs adapter: create via text/url/file endpoints; **update = best-effort delete + recreate** (no dedicated update API).

## Assign / unassign

- Assign: assert same `business_id`; insert mapping; duplicate → `KNOWLEDGE_ASSIGNMENT_CONFLICT`.  
- Cross-business agent not in active business → `AGENT_NOT_FOUND` (or `KNOWLEDGE_CROSS_BUSINESS` if both loaded).  
- Unassign: delete assignment row only.  
- List agent knowledge: join assignments → sources (exclude archived).

## Delete / archive

| Action | Rule |
| --- | --- |
| Archive | Soft-hide; assignments may remain; new assigns blocked; agent list hides archived |
| Hard delete | **Block** if any `agent_knowledge_sources` (`KNOWLEDGE_HAS_ASSIGNMENTS`). After empty, delete source + object + best-effort provider remove |

## Provider boundary

- Port methods outside domain service (`KnowledgeSyncPort`).  
- Secrets server-side only.  
- Provider outage must not corrupt local rows.

## Errors

`KNOWLEDGE_NOT_FOUND`, `KNOWLEDGE_HAS_ASSIGNMENTS`, `KNOWLEDGE_TYPE_INVALID`, `KNOWLEDGE_FILE_TOO_LARGE`, `KNOWLEDGE_URL_INVALID`, `KNOWLEDGE_ASSIGNMENT_CONFLICT`, `KNOWLEDGE_CROSS_BUSINESS`, `OBJECT_STORAGE_NOT_CONFIGURED`, `PROVIDER_*` (M06 vocabulary), plus auth/business codes.
