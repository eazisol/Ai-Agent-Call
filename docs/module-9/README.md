# Module 09 — Voice Cloning

| Field | Value |
| --- | --- |
| Module | M09 — Voice Cloning |
| Status | **Complete** — 28 August 2026 |
| Depends on | M05, M06, M07 (object storage), M08 Complete |
| Next | M10 — Twilio Telephony Provider (Phase 04) |

## Documents

| Doc | Covers |
| --- | --- |
| [scope-and-requirements.md](./scope-and-requirements.md) | Locked MVP scope, consent, out of scope |
| [data-model.md](./data-model.md) | Clones, consents, samples, M08 asset linkage |
| [domain-logic.md](./domain-logic.md) | Lifecycle, revoke/delete, provider sync |
| [api-contracts.md](./api-contracts.md) | Clone CRUD + status + M08 assign reuse |
| [frontend-surfaces.md](./frontend-surfaces.md) | Portal surfaces |
| [security-and-qa.md](./security-and-qa.md) | 09.04 evidence |
| [M09_Voice_Cloning_manual-qa-guide.md](./M09_Voice_Cloning_manual-qa-guide.md) | Manual QA handoff |

## Objective (one line)

Business-owned reusable cloned voices with explicit consent — upload samples, create one canonical clone asset, preview it, assign it to multiple agents via the M08 library, and revoke safely when no longer needed.

## Architecture lock (Phase 03)

```text
Business
├── voice_clones (lifecycle + consent anchor)
│    ├── voice_consents
│    └── voice_samples → private object storage
├── voice_assets (source_type = business_clone)  ← M08 library row
│    └── voice_provider_mappings → provider clone id
└── Agents
     └── agent_configs.voice_id → shared clone asset (many agents OK)
```

## Configuration (server-side)

| Env | Notes |
| --- | --- |
| `ELEVENLABS_API_KEY` | Required for clone submit + preview (reuse M06/M08). **Instant Voice Cloning requires a paid ElevenLabs plan** — free tier returns `paid_plan_required`. |
| `OBJECT_STORAGE_ENABLED` | **Required** for sample upload (`true`) |
| `OBJECT_STORAGE_ENDPOINT` | S3-compatible endpoint (local: `http://localhost:9000` MinIO) |
| `OBJECT_STORAGE_BUCKET` | Bucket name (local default: `eazi-ai-call`) |
| `OBJECT_STORAGE_ACCESS_KEY_ID` / `SECRET` | Server-side credentials only |
| `VOICE_CLONE_MAX_SAMPLE_BYTES` | Per-file cap (default 25MB) |
| `VOICE_CLONE_MAX_SAMPLES` | Max files per clone (default 5) |

### Local dev — MinIO

```bash
docker run -d --name ai_call_agent_minio -p 9000:9000 -p 9001:9001 \
  -e MINIO_ROOT_USER=minioadmin -e MINIO_ROOT_PASSWORD=minioadmin \
  -v ai_call_agent_minio_data:/data minio/minio server /data --console-address ":9001"

# Create bucket (once)
docker run --rm --network container:ai_call_agent_minio --entrypoint /bin/sh minio/mc \
  -c "mc alias set local http://localhost:9000 minioadmin minioadmin && mc mb local/eazi-ai-call --ignore-existing"
```

Set `OBJECT_STORAGE_ENABLED=true` in `ai-call-agent-backend/.env` and restart the API.

Or use `docker compose up -d minio minio-init` (requires root `.env.docker` for other services).

Never expose provider credentials or signed sample URLs to unauthenticated clients.

## M08 reuse (locked)

- Completed clones appear in **Voice Library** as `source_type = business_clone`.
- Assignment uses existing **`PUT /api/v1/agents/:id/voice`** — no per-agent clone recreation.
- Preview reuses M08 preview path (`previewAudioUrl` / TTS fallback).

## Module gate

**M09 Voice Cloning = COMPLETE** — 28 August 2026 (09.01–09.05).
