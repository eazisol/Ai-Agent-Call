# Module 09 — API contracts (09.01)

| Field | Value |
| --- | --- |
| Module | M09 — Voice Cloning |
| Submodule | 09.02 (implement) |
| Status | **Design locked** — 28 August 2026 |

All routes under `/api/v1`, auth + active org + active business cookies (same as M08).

## Clone management

### `GET /voices/clones`

List clones for active business (includes draft/processing/failed for owner dashboard).

**Query:** `status?`, `page?`, `limit?`

**Response:**

```json
{
  "clones": [
    {
      "id": "uuid",
      "displayName": "Owner Custom Clone",
      "status": "ready",
      "voiceAssetId": "uuid",
      "sampleCount": 2,
      "assignedAgentCount": 1,
      "lastError": null,
      "createdAt": "ISO8601",
      "readyAt": "ISO8601"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20
}
```

### `POST /voices/clones`

Create draft clone.

**Body:** `{ "displayName": "string", "description?": "string" }`

**Response:** `{ "clone": { ... } }` with `status: "draft"`.

### `GET /voices/clones/:id`

Clone detail + consent summary (not full PII dump) + sample filenames + linked voice asset id when ready.

### `POST /voices/clones/:id/samples`

Multipart upload — one file per request (or multi in 09.02 implementation choice).

**Response:** `{ "sample": { "id", "originalFilename", "byteSize", "contentType" } }`

No storage key or signed URL in response.

### `DELETE /voices/clones/:id/samples/:sampleId`

Remove sample from draft/failed clone; delete blob.

### `POST /voices/clones/:id/consent`

Record consent.

**Body:**

```json
{
  "consentVersion": "m09-v1",
  "consentTextHash": "sha256-hex"
}
```

**Response:** `{ "consent": { "id", "acceptedAt" } }`

### `POST /voices/clones/:id/submit`

Validate consent + samples → provider create → lifecycle update.

**Response (async-style sync MVP):**

```json
{
  "clone": { "id", "status": "ready|processing|failed", "voiceAssetId?", "lastError?" }
}
```

MVP may block until provider returns (same as M07 sync pattern). Background job optional later.

### `GET /voices/clones/:id/status`

Lightweight poll endpoint — maps checklist `GET /voices/:id/status` to clone id.

**Response:** `{ "status": "processing", "lastError": null, "voiceAssetId": null }`

### `POST /voices/clones/:id/retry`

Failed → processing retry (re-submit to provider).

### `POST /voices/clones/:id/revoke`

Soft revoke — owner/admin.

**Response:** `{ "clone": { "status": "revoked" } }`

### `DELETE /voices/clones/:id`

Hard delete when unassigned.

**Response:** 204 or `{ "deleted": true }`

**Error:** 409 `VOICE_CLONE_IN_USE` with `{ "assignedAgents": [{ "id", "name" }] }`

## Reused M08 endpoints (no duplication)

| Endpoint | M09 use |
| --- | --- |
| `GET /voices` | Library includes `business_clone` rows when `ready` |
| `GET /voices/:id` | Detail for assign picker |
| `POST /voices/:id/preview` | Preview ready clone |
| `GET /agents/:id/voice` | Current assignment |
| `PUT /agents/:id/voice` | Assign clone (`voiceId` = voice asset id) |
| `DELETE /agents/:id/voice` | Unassign |

Checklist `POST /voices/clone` → implemented as **`POST /voices/clones`** (REST plural, business-scoped via cookie).

Checklist `DELETE /voices/:id` → maps to **`DELETE /voices/clones/:id`** for clone lifecycle; **`voice_assets`** archived on revoke, not deleted while referenced.

## Voice summary extension (M08)

Add to existing `VoiceSummary` (already has `sourceType`, `previewAudioUrl`):

- Clone rows: `sourceType: "business_clone"`, `businessOwned: true`
- Optional `cloneId` in detail view only — not required in library card

## Security

- Sample download: **server-side only** when calling provider; no client GET to storage.
- Provider API key never in responses.
- Cross-business clone ids return 404.
