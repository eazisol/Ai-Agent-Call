# Module 05 — Domain logic

| Field | Value |
| --- | --- |
| Module | M05 — AI Agent Management |
| Status | Implemented — 27 August 2026 |

See Nest `AgentsService` / `agent-permissions.ts`.

## Summary

- Resolve membership + active business ownership before any mutation.
- Create inserts `agents` + `agent_configs` + `agent_prompts` in one transaction.
- List excludes `archived` unless requested.
- Activate/deactivate blocked when archived (`AGENT_ARCHIVED`).
- Unarchive via PATCH `status` requires archive privilege (owner/admin).
- Name uniqueness among non-archived siblings → `AGENT_NAME_CONFLICT`.
- No provider port calls; `providerMappings` always `[]` in API views for M05.
- Business hard-delete now also counts `agents` as dependents.
