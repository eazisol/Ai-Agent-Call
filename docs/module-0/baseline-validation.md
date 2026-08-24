# Module 0 baseline and validation

## Supplied snapshot (before)

| Check                     | Result                                                                                        |
| ------------------------- | --------------------------------------------------------------------------------------------- |
| Backend build             | Passed                                                                                        |
| Backend tests             | Could not start: Jest 30 / ts-jest 29 incompatibility                                         |
| Backend lint              | 529 findings (527 errors, 2 warnings), largely generated formatting/scaffold debt             |
| Frontend TypeScript       | Passed                                                                                        |
| Frontend lint             | Passed with one unused-import warning                                                         |
| Frontend production build | Blocked in the audit environment by Windows-only SWC binaries in the uploaded dependency tree |
| Database migrations       | None; runtime `synchronize: true`                                                             |
| Frontend tests            | None                                                                                          |

## Module 0 result (after)

| Check                  | Result on 24 August 2026                                                   |
| ---------------------- | -------------------------------------------------------------------------- |
| Backend compile        | Passed (`nest build`)                                                      |
| Backend lint           | Passed, zero findings                                                      |
| Backend unit tests     | Passed: 5/5                                                                |
| Backend API smoke test | Passed: 1/1                                                                |
| Frontend TypeScript    | Passed                                                                     |
| Frontend lint          | Passed, zero findings                                                      |
| Frontend tests         | Passed: 2/2                                                                |
| Production build       | Code path repaired; rerun with `npm ci` on a clean Node 22 Linux runner/CI |
| Docker runtime         | Compose prepared; Docker was unavailable in the implementation environment |
| Live providers         | Not run; requires explicit sandbox credentials and may incur usage         |

## Acceptance checks

- Only `.example` environment templates are included in source.
- No `.env`, `.env.local`, `.env.docker`, dependency tree, Git history, or build
  output is included in the clean delivery ZIP.
- TypeORM runtime synchronization is disabled.
- Production cannot expose the unauthenticated prototype call-read API.
- Twilio webhooks can require official request signatures.
- Media streams require a short-lived, call-bound HMAC token before provider
  audio is opened.
- API errors carry stable codes and correlation IDs without raw webhook/audio
  payload logging.

## Re-run

```bash
cd ai-call-agent-backend
npm ci
npm run format:check
npm run lint
npm run typecheck
npm test
npm run test:e2e

cd ../ai-call-agent-frontend
npm ci
npm run check
npm run build
```
