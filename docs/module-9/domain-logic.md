# Module 09 — Domain logic (09.01)

| Field | Value |
| --- | --- |
| Module | M09 — Voice Cloning |
| Submodule | 09.02 (implement) |
| Status | **Design locked** — 28 August 2026 |

## Clone lifecycle

```text
draft ──(consent + samples + submit)──► processing ──► ready
                              │                │
                              │                └──► failed (retry allowed → new submit)
                              │
revoked ◄──(owner/admin revoke)── ready
```

| Status | Library visible | Assignable | Preview |
| --- | --- | --- | --- |
| `draft` | No | No | No |
| `processing` | No | No | No |
| `ready` | Yes | Yes | Yes |
| `failed` | No | No | No |
| `revoked` | No | No | No |

## Create flow

1. **Create draft** — `POST /voices/clones` with display name; status `draft`.
2. **Upload samples** — one or more files to private storage; linked in `voice_samples`.
3. **Record consent** — `POST /voices/clones/:id/consent` with consent version + hash; stores user/timestamp.
4. **Submit** — validates:
   - ≥1 consent row
   - ≥1 sample, total duration heuristic optional (warn if &lt; 60s aggregate — ElevenLabs recommendation)
   - user role `create_voice_clone`
5. **Provider provision** — set `processing`, call `VoiceClonePort.createClone(samples, name, labels)`.
6. **On success** — create/update `voice_assets` + mapping, link `voice_clones.voice_asset_id`, set `ready`.
7. **On failure** — `failed` + `last_error`; samples retained for retry.

Idempotency: resubmit on `failed` reuses same clone id unless user creates new draft.

## Preview

- Only when `status = ready` and mapping exists.
- Delegate to M08 `VoicesService.previewForUser` using linked `voice_asset_id`.
- Prefer provider `previewUrl` in mapping metadata (same as M08 catalogue fix).

## Assign to agent(s)

- **No M09-specific assign endpoint** — use M08 `PUT /agents/:id/voice` with `voice_asset_id`.
- Eligibility: asset `source_type = business_clone`, `business_id = agent.business_id`, clone `status = ready`.
- Agent A and Agent B may share the same clone asset id.

## Unassign / change agent voice

- `DELETE /agents/:id/voice` or assign different voice — does **not** delete clone or samples.

## Revoke / delete

### Soft revoke (default)

- Allowed: owner/admin.
- Sets clone `revoked`, archives `voice_assets` (`status = archived`).
- Agents still holding `voice_id` → M08 assign validation should warn on sync; optional auto-clear deferred (show warning in UI).

### Hard delete

- Only when `assignedAgentCount = 0` and clone not `processing`.
- Deletes samples from object storage, consent rows, clone row, voice_asset + mapping (CASCADE order enforced in service).
- If assigned → `VOICE_CLONE_IN_USE` (409) with list of agent names.

## Provider port

```typescript
interface VoiceClonePort {
  readonly providerName: string;
  isConfigured(): boolean;
  createClone(input: {
    displayName: string;
    description?: string;
    samples: { buffer: Buffer; filename: string; contentType: string }[];
    labels?: Record<string, string>;
  }): Promise<{ externalVoiceId: string; previewUrl?: string; metadata?: Record<string, unknown> }>;
  deleteClone?(externalVoiceId: string): Promise<void>; // best-effort on revoke
}
```

ElevenLabs adapter: `POST /v1/voices/add` multipart.

Provider failure must **not** silently mark `ready`. Canonical asset created only after provider success.

## Audit events (application log)

| Event | Fields |
| --- | --- |
| `voice_clone.created` | cloneId, businessId, userId |
| `voice_clone.consent_recorded` | cloneId, consentId, version |
| `voice_clone.submitted` | cloneId, sampleCount |
| `voice_clone.ready` | cloneId, voiceAssetId, externalVoiceId |
| `voice_clone.failed` | cloneId, errorCode |
| `voice_clone.revoked` | cloneId, userId |
| `voice_clone.delete_blocked` | cloneId, assignedAgents |

Structured audit table deferred unless compliance requires — MVP uses structured logger + correlation id.

## Compatibility warnings

Reuse M08 `buildCompatibilityWarnings` when assigning clone (language codes from labels / defaults).

## Error codes (proposed)

| Code | HTTP | When |
| --- | --- | --- |
| `VOICE_CLONE_NOT_FOUND` | 404 | Wrong business or id |
| `VOICE_CLONE_CONSENT_REQUIRED` | 400 | Submit without consent |
| `VOICE_CLONE_SAMPLES_REQUIRED` | 400 | Submit without samples |
| `VOICE_CLONE_INVALID_STATE` | 409 | Action wrong for status |
| `VOICE_CLONE_IN_USE` | 409 | Delete while assigned |
| `VOICE_CLONE_PROVIDER_FAILED` | 400 | ElevenLabs rejected samples (format, duration, quality) |
| `VOICE_CLONE_PLAN_REQUIRED` | 402 | ElevenLabs free tier / plan without Instant Voice Cloning |
| `PROVIDER_NOT_CONFIGURED` | 503 | No API key |
