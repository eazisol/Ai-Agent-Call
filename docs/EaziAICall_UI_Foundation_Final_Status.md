# EaziAICall UI Foundation — Final Status

**Date:** 2026-08-24  
**Status:** **LOVABLE → CURSOR UI FOUNDATION HANDOFF COMPLETE**  
**Production host:** `ai-call-agent-frontend`  
**Design reference only:** `EaziAICall-Lovable-UI`

---

## 1. Architecture

| Layer | Choice |
|-------|--------|
| Framework | **Next.js 16.2.6** (App Router) |
| UI | **React 19.2.4** + TypeScript |
| Styling | **Tailwind CSS v4** via `@tailwindcss/postcss` |
| Design system | shadcn **new-york** + Radix + CVA + CSS variables |
| Fonts | **Geist** / **Geist Mono** via `next/font/google` |

**Not in production:** TanStack Start, TanStack Router, Vite, Nitro, Lovable runtime.

Lovable remains a **reference/design source**. Production components live only under `ai-call-agent-frontend/`.

---

## 2. Design system status

Present in `src/app/globals.css`:

- Enterprise blue primary (`oklch(0.46 0.09 252)`)
- Geist typography tokens (`--font-sans` / `--font-display` / `--font-mono`)
- Light-first + `.dark` theme tokens
- Semantic status (success / warning / info / destructive + `-strong`)
- Sidebar + chart tokens
- Radius scale + elevation shadows
- Border-first surfaces
- Global `:focus-visible` styling

Foundation folders:

- `src/components/ui/`
- `src/components/patterns/`
- `src/components/providers/`
- `src/components/shell/`
- `src/components/public/`
- `src/hooks/`
- `src/lib/utils.ts`
- `components.json`

**Non-blocking gap:** no explicit `prefers-reduced-motion` rule yet (document for M0 polish).

---

## 3. Customer Portal shell

**Adapter:** `PortalShell` → `AppShell`  
**Layout:** `src/app/(portal)/layout.tsx`

Includes: sidebar, org/business switchers, search, notifications, help, user menu, breadcrumbs, usage, responsive nav (desktop expanded / tablet collapsed default / mobile Sheet).

Chrome fixtures: `src/mocks/portal-shell.ts` (temporary UI only).

---

## 4. Admin Portal shell

**Adapter:** `AdminShell` → `PlatformShell`  
**Route:** `/admin` via `src/app/(admin)/admin/`

Grouped collapsible nav; header chrome reused from shared shell primitives.  
Unimplemented items toast: *“Coming in a future module”*.  
No Admin backend.

Fixtures: `src/mocks/admin-shell.ts`.

---

## 5. Marketing shell

**Adapter:** `MarketingShellHost` → `PublicShell`  
**Route:** `/marketing-shell` via `src/app/(marketing)/marketing-shell/`

`PublicHeader` / `PublicFooter`, Industries dropdown, CTAs, mobile Sheet.  
Placeholder body only — **no homepage**.  
Production `/` still redirects to `/dashboard`.

Fixtures: `src/mocks/marketing-shell.ts`.

---

## 6. Current production routes

| URL | Notes |
|-----|--------|
| `/` | Redirect → `/dashboard` |
| `/dashboard` | Customer AppShell + placeholder stats |
| `/calls` | Customer AppShell + **live** `callsApi.list()` |
| `/calls/[id]` | Customer AppShell + **live** `callsApi.find(id)` |
| `/settings` | Customer AppShell + Module-1 stub |
| `/admin` | Admin PlatformShell overview placeholder |
| `/marketing-shell` | PublicShell foundation placeholder |

Docker frontend healthcheck remains **`/dashboard`**.

---

## 7. Real Calls integration (must preserve)

| Asset | Role |
|-------|------|
| `src/lib/api.ts` | Server `fetch` → NestJS; `callsApi.list` / `find` |
| `src/lib/api-url.mjs` | Dual base URL builder |
| `src/types/call.ts` | Domain types aligned with backend |
| `(portal)/calls/*` | SSR pages + loading/error; `ApiNotice` |

**Must never** use `portal-shell` / Lovable mocks for Calls data.

---

## 8. Temporary mock chrome areas

| File | Scope |
|------|--------|
| `src/mocks/portal-shell.ts` | Customer chrome |
| `src/mocks/admin-shell.ts` | Admin chrome |
| `src/mocks/marketing-shell.ts` | Marketing chrome |

Replace with real APIs during Auth / Organizations / Businesses / Billing / Marketing slices.

---

## 9. Unimplemented future modules

Customer: Agents, Customers, Bookings, Knowledge, Voice, Automations, Analytics, Team, Billing, Help.  
Admin: all child routes under `/admin/*` except Overview.  
Marketing: Features, Industries pages, Pricing, Auth CTAs, homepage, etc.

Behavior: toast — **Coming in a future module** / *This section is not available yet.*

---

## 10. Deprecated code / cleanup (Phase 5)

**Removed (unused, zero live imports):**

- `src/components/layout/DashboardLayout.tsx`
- `src/components/layout/Sidebar.tsx`
- `src/components/layout/Topbar.tsx`

---

## 11. Test configuration debt

| Item | Assessment |
|------|------------|
| Active tests | `npm test` → `test/*.test.mjs` (Node test runner) — **pass** |
| `vitest.config.mts` + `src/test/*` | **Obsolete / broken** (Vitest + Testing Library not installed; APIs outdated) |
| `tsconfig.json` exclusions | Keep excluding `vitest.config.mts` and `src/test` until M0 |

**M0 recommendation:** either delete orphaned Vitest files or reinstall Vitest/Testing Library and rewrite tests against current `callsApi` / UI — do not expand in UI handoff.

---

## 12. Lovable reference strategy

- Keep `EaziAICall-Lovable-UI/` as design reference only.
- Production must not import from it (verified: no runtime imports).
- Nested `.git` under Lovable: **not present** in this workspace (safe to keep as untracked/subtree reference).
- Prefer documenting Lovable as a sibling reference or separate repo; do not treat it as the deployable app.

---

## 13. Dependencies

| Package | Class |
|---------|--------|
| `next`, `react`, `react-dom`, `typescript`, `tailwindcss`, `@tailwindcss/postcss` | **KEEP** |
| Radix packages in use, `cva`, `clsx`, `tailwind-merge`, `lucide-react`, `sonner`, `cmdk`, `tw-animate-css` | **KEEP** |
| `axios` | **POSSIBLE CLEANUP LATER** (unused; Calls use `fetch`) |
| `recharts` | **KEEP FOR NEAR-TERM FOUNDATION** (installed; charts not wired yet) |

No TanStack Start/Router packages.

---

## 14. Known non-blocking technical debt (M0+)

1. Orphaned Vitest/`src/test` vs active Node tests  
2. Unused `axios`  
3. Calls/Dashboard/Settings page chrome still pre-design-system (intentional until page restyle)  
4. No `prefers-reduced-motion` CSS yet  
5. Mock chrome until Auth/tenant slices  
6. Marketing not yet the public `/` homepage  
7. Optional: align `lucide-react` major with Lovable later  

---

## 15. Definition of Done — UI handoff

- [x] Lint / typecheck / tests / production build pass  
- [x] Customer / Admin / Marketing shells verified  
- [x] Calls use real `callsApi` (no mocks)  
- [x] API/env dual-base contract preserved  
- [x] No TanStack Start/Router runtime  
- [x] No backend changes in Phase 5  
- [x] No secrets committed (gitignore covers `.env*`; examples only)  
- [x] Responsive foundation in place (shell patterns)  
- [x] Deprecated old shell removed  
- [x] Test debt documented  
- [x] Lovable separation verified  
- [x] This document created  

### Verdict

**LOVABLE → CURSOR UI FOUNDATION HANDOFF COMPLETE**

Next workstreams (out of scope here): Module 0 cleanup, Authentication, and vertical slices — **do not** auto-start from this handoff.
