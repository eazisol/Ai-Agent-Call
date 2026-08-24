# ADR-011: Jest 30 test tooling alignment

## Status

Accepted

## Context

Module 0 audit recorded a backend test startup failure because the repository paired Jest 30 with an older `ts-jest` release that did not support Jest 30. The backend `lint` script also ran ESLint with `--fix`, which made the default quality command mutating instead of read-only.

WP2 needs a low-disruption repair that:

- keeps the current Jest-based test stack;
- restores TypeScript test execution;
- makes `lint` safe by default;
- leaves room for characterization, integration, and e2e coverage before provider refactoring.

## Decision

1. Keep **Jest 30** as the test runner.
2. Upgrade **`ts-jest` to a Jest 30 compatible 29.4.x release**.
3. Use the explicit Jest 30 transform-array syntax:

   ```json
   {
     "^.+\\.(t|j)s$": ["ts-jest", { "tsconfig": "tsconfig.json" }]
   }
   ```

4. Change backend scripts so:
   - `npm run lint` is read-only;
   - `npm run lint:fix` performs autofixes intentionally.
5. Add characterization tests around calls, Twilio webhooks, the voice-stream gateway, and the OpenAI realtime session bootstrap before structural changes.

## Consequences

### Positive

- Backend unit and e2e tests can execute again on the existing Jest stack.
- The repository avoids a larger migration to another runner during Module 0.
- Default lint validation no longer rewrites files.

### Trade-offs

- `ts-jest` remains versioned independently from Jest, so future Jest upgrades still need a compatibility check.
- Integration coverage still depends on isolated test infrastructure; WP2 uses a local isolated database strategy rather than the developer database.
