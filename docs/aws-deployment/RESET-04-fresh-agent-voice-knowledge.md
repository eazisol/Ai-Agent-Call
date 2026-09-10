# RESET-04 — Fresh AI Agent + Voice + Knowledge Setup

**Status:** `PASS`

## Agent

| Field | Value |
|---|---|
| Name | Production Receptionist |
| Canonical ID | `12d9775c-4939-402c-84e0-ffae1e6da207` |
| Business | EaziAICall Production (`3c0680ed-320d-48ae-bf57-c129c03676b1`) |
| Status | active |
| Language | en (use business language settings) |
| Role label | Receptionist |
| Greeting | configured (66 chars) |
| Instructions | configured (351 chars) |

## Voice

| Field | Value |
|---|---|
| Canonical voice asset ID | `0ae39681-8de3-4339-b1e7-07954df664e0` |
| Display name | Bella - Professional, Bright, Warm |
| Source | provider_catalog |
| Provider voice ID | `hpp4J3VqNfWAUOO0d1Us` |
| Assignment | `agent_configs.voice_id` set |

## Knowledge

| Field | Value |
|---|---|
| ID | `f19e260d-0177-4547-ab7c-ec4dbabc37fa` |
| Name | About EaziAICall |
| Type | text |
| Business | EaziAICall Production |
| Knowledge provider sync | synced (`external_source_id=xJB3tpavf5ZXJEBzt0Nn`) |
| Assigned to agent | yes (1 assignment) |

## ElevenLabs mapping

| Field | Value |
|---|---|
| Provider | elevenlabs |
| external_agent_id | `agent_5801m1k86tc7ewdbtq36s94dfw6d` |
| sync_status | synced |
| Live GET | **200** |
| Returned name | Production Receptionist |
| Not HR Agent ID | yes |
| Not historical stale ID | yes |

## Database counts

| Table | Count |
|---|---:|
| users | 1 |
| organizations | 1 |
| organization_members | 1 |
| businesses | 1 |
| ai_agents | 1 |
| agent_configs | 1 |
| agent_prompts | 1 |
| agent_provider_mappings | 1 |
| knowledge_sources | 1 |
| knowledge_provider_mappings | 1 |
| agent_knowledge_sources | 1 |
| voice_assets | 21 (catalog refresh) |
| voice_provider_mappings | 21 |
| phone_numbers | 0 |
| phone_number_assignments | 0 |
| calls | 0 |
| call_events | 0 |
| migrations | 16 |

## Scope / infra

| Item | Result |
|---|---|
| Code | UNCHANGED (product); inspect script only |
| Schema | UNCHANGED |
| Migration | NOT RUN |
| Twilio | UNCHANGED |
| Unrelated ElevenLabs (HR Agent, webhooks) | UNCHANGED |
| Phone assignment | not performed |
| Secrets | not exposed |
| M12 | OPEN |

## Next

**RESET-05 — Existing Twilio Number Import/Link + Agent Assignment**

**STOP.**
