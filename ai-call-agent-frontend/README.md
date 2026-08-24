# EaziAiCall frontend

Next.js 16 business portal for the EaziAiCall SaaS.

## Run locally

```bash
cp .env.example .env.local
npm ci
npm run dev
```

The local portal uses port `3000` when run directly and port `3001` through the
root Docker Compose stack. `INTERNAL_API_BASE_URL` is server-only and should use
the backend container/service address. `NEXT_PUBLIC_API_BASE_URL` is only the
browser-safe fallback and must never contain credentials.

Calls pages opt into runtime rendering with Next.js `connection()`, use uncached
server fetches, and show explicit loading, empty, unavailable, and retry states.
Builds therefore do not require a running backend.

```bash
npm run lint
npm run typecheck
npm test
npm run build
```
