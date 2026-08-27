# Module 05 — API contracts (design)

| Field | Value |
| --- | --- |
| Module | M05 — AI Agent Management |
| Status | Designed — 27 August 2026 |
| Base | `/api/v1` |
| Auth | Session cookies + `AuthGuard` |
| Context | `eazi_org` + `eazi_biz` required |

## Endpoints

### `POST /agents`

Create agent under active business.

**Body (illustrative):**

```json
{
  "name": "Front Desk",
  "roleLabel": "Receptionist",
  "personality": "Warm, concise, professional",
  "greeting": "Thanks for calling. How can I help you today?",
  "instructions": "Answer FAQs. Collect caller name and reason for calling.",
  "language": "en",
  "escalationEnabled": false,
  "escalationKeywords": [],
  "escalationContactPhone": null,
  "escalationContactEmail": null,
  "escalationMessage": null
}
```

**Response:** `201` agent detail (includes nested config + prompts).

### `GET /agents`

List for active business. Query: `includeArchived=true` optional.

### `GET /agents/:id`

Single agent detail (nested config + prompts). Provider mappings omitted or empty array in M05.

### `PATCH /agents/:id`

Partial update of name, role/personality, greeting, instructions, language, escalation stub fields, and unarchive via `status` when privileged.

### `POST /agents/:id/activate`

Sets `status` to `active`.

### `POST /agents/:id/deactivate`

Sets `status` to `inactive`.

### Supporting

- `POST /agents/:id/archive` — `status = archived`
- `DELETE /agents/:id` — hard delete when allowed

## Response envelope

Use M00 global error envelope and correlation id. Success payloads follow existing Nest JSON style used by businesses (plain objects or `{ data }` — match M04 implementation convention in 05.02).
