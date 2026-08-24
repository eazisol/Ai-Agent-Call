# EaziAICall UI Handoff / Migration Report

**Date:** 2026-08-24  
**Status:** Audit only — **no code was modified**  
**Direction:** Port approved Lovable UI/UX **into** the existing Next.js production frontend. Do **not** replace Next.js with TanStack Start. Do **not** modify the NestJS backend in this phase.

| Project | Role | Path |
|---------|------|------|
| **Ai-Agent-Call** (production) | Real product repo — NestJS + Next.js App Router | `ai-call-agent-backend/`, `ai-call-agent-frontend/` |
| **EaziAICall-Lovable-UI** | Design system + shell reference only (TanStack Start) | `EaziAICall-Lovable-UI/` |

---

## Executive summary

The Lovable project is a **complete design-system and platform-shell reference** (tokens, shadcn/Radix UI kit, customer/admin/public shells, patterns). The production frontend is a **working Module-0 business portal** with live Calls list/detail wired to NestJS via server `fetch`, plus placeholder Dashboard and Settings.

**Migration principle:** copy portable UI assets into `ai-call-agent-frontend`, adapt Tailwind/fonts/providers for Next.js, rewrite routes and navigation for App Router, and **preserve** `callsApi`, `Call` types, Calls SSR pages, env/Docker API wiring, and backend contracts.

**Out of scope for this handoff phase:** Authentication, multi-tenant org/business APIs, Admin portal backend, Marketing site content, future vertical-slice modules, backend changes.

---

## Part 1 — Lovable inventory (audit findings)

### 1. Design token files

| Path | Classification | Notes |
|------|----------------|-------|
| `EaziAICall-Lovable-UI/src/styles.css` | **COPY WITH MINOR ADAPTATION** | Single source of truth: oklch tokens, `@theme inline`, status/sidebar/chart/radius/shadow. Comments already target Next `globals.css`. Adapt Tailwind v4 `@source` / PostCSS for Next (`@tailwindcss/postcss`). |
| `EaziAICall-Lovable-UI/components.json` | **COPY WITH MINOR ADAPTATION** | shadcn new-york; set `rsc: true` (or keep false + `"use client"`), point CSS to `src/app/globals.css`. |

### 2. Typography

| Concern | Location | Classification |
|---------|----------|----------------|
| Font tokens (Geist sans/display/mono) | `src/styles.css` | **COPY WITH MINOR ADAPTATION** |
| Google Fonts `<link>` load | `src/routes/__root.tsx` | **REWRITE FOR NEXT.JS** — prefer `next/font` (Geist) in root layout |
| Type scale | Utility classes in components (no separate scale file) | **COPY AS-IS** (pattern) |

### 3. UI primitives (`src/components/ui/` — 48 files)

All shadcn **new-york** / Radix primitives:

`accordion`, `alert`, `alert-dialog`, `aspect-ratio`, `avatar`, `badge`, `breadcrumb`, `button` (incl. custom `soft`), `calendar`, `card`, `carousel`, `chart`, `checkbox`, `collapsible`, `command`, `context-menu`, `dialog`, `drawer`, `dropdown-menu`, `form`, `hover-card`, `input`, `input-otp`, `label`, `menubar`, `navigation-menu`, `pagination`, `popover`, `progress`, `radio-group`, `resizable`, `scroll-area`, `select`, `separator`, `sheet`, `sidebar`, `skeleton`, `slider`, `sonner`, `switch`, `table`, `tabs`, `textarea`, `toggle`, `toggle-group`, `tooltip`

| Classification | Rule |
|----------------|------|
| **COPY WITH MINOR ADAPTATION** | Add `"use client"` where Radix/hooks require it; verify `@/` imports; keep CVA variants |
| Helper `src/lib/utils.ts` (`cn`) | **COPY AS-IS** |

### 4. Required npm packages (UI-relevant)

**Must add to production frontend (not present today):**

- All `@radix-ui/react-*` used by copied primitives  
- `class-variance-authority`, `cmdk`, `vaul`, `sonner`, `input-otp`, `react-day-picker`, `date-fns`, `embla-carousel-react`, `react-resizable-panels`, `tw-animate-css`  
- `react-hook-form`, `@hookform/resolvers`, `zod` (when forms land; `form.tsx` depends on them)  
- Optionally `@tanstack/react-query` (portable; currently scaffold-only in Lovable)

**Already in production:** `react`, `react-dom`, `next`, `clsx`, `tailwind-merge`, `lucide-react`, `recharts`, `tailwindcss` (+ `@tailwindcss/postcss`)

**Do not add (TanStack Start stack):** `@tanstack/react-router`, `@tanstack/react-start`, `@tanstack/router-plugin`, `@tailwindcss/vite`, `@lovable.dev/vite-tanstack-config`, `vite`, `nitro`, `vite-tsconfig-paths`

### 5. Reusable patterns (`src/components/patterns/`)

| File | Classification |
|------|----------------|
| `status-badge.tsx` | **COPY AS-IS** |
| `form-field.tsx` | **COPY AS-IS** |
| `empty-state.tsx` | **COPY AS-IS** |
| `error-state.tsx` | **COPY AS-IS** |
| `loading-state.tsx` (`Spinner`, `LoadingState`, `CardSkeleton`, `TableSkeleton`) | **COPY AS-IS** |
| `patterns/index.ts` | **COPY AS-IS** |

### 6–10. Status / forms / tables / toast / empty-loading-error

| Asset | Path | Classification |
|-------|------|----------------|
| StatusBadge | `patterns/status-badge.tsx` | **COPY AS-IS** |
| Generic Badge | `ui/badge.tsx` | **COPY WITH MINOR ADAPTATION** |
| RHF Form kit | `ui/form.tsx` + inputs | **COPY WITH MINOR ADAPTATION** |
| Table primitives | `ui/table.tsx` | **COPY AS-IS** (not TanStack Table) |
| Call table showcase | inside `routes/ui-kit.tsx` | **REFERENCE ONLY** — restyle production `CallsTable` using primitives |
| Sonner toaster | `ui/sonner.tsx` + root mount | **COPY WITH MINOR ADAPTATION** — mount in Next client `Providers` |
| Alert / AlertDialog | `ui/alert.tsx`, `ui/alert-dialog.tsx` | **COPY WITH MINOR ADAPTATION** |
| Empty / loading / error patterns | `patterns/*` | **COPY AS-IS** |
| Route 404/error (TanStack) | `__root.tsx` NotFound/Error | **REWRITE FOR NEXT.JS** → `not-found.tsx` / `error.tsx` |
| Lovable SSR error libs | `lib/error-capture.ts`, `error-page.ts`, `lovable-error-reporting.ts` | **DO NOT COPY** |

### 11. Customer Portal shell

| Path | Classification |
|------|----------------|
| `components/shell/app-shell.tsx` | **COPY WITH MINOR ADAPTATION** |
| `components/shell/app-sidebar.tsx` | **COPY WITH MINOR ADAPTATION** — nav must map to real Next routes (`/dashboard`, `/calls`, `/settings`) initially |
| `organization-switcher.tsx`, `business-switcher.tsx` | **COPY WITH MINOR ADAPTATION** — UI only; wire to mocks until Auth/Module APIs |
| `top-header.tsx`, `sidebar-nav.tsx`, `global-search.tsx`, `notifications-menu.tsx`, `help-menu.tsx`, `user-menu.tsx`, `breadcrumbs.tsx`, `usage-indicator.tsx` | **COPY WITH MINOR ADAPTATION** |
| `shell/index.ts` | **COPY AS-IS** |
| `routes/portal.tsx` | **REWRITE FOR NEXT.JS** — becomes layout wiring, not TanStack route |
| `mocks/portal.ts` | **REFERENCE ONLY** (temporary fixtures OK under `src/mocks` until APIs exist) |

### 12. Admin Portal shell

| Path | Classification |
|------|----------------|
| `components/shell/platform-shell.tsx` | **COPY WITH MINOR ADAPTATION** |
| Shared shell chrome (reuse from customer shell) | Same as above |
| `routes/admin.tsx` | **REWRITE FOR NEXT.JS** (optional later route group `(admin)`) |
| `mocks/admin.ts` | **REFERENCE ONLY** |

**Note:** Admin is approved shell UX only. No Admin backend in this phase — preview/stub routes only if needed.

### 13. Public / Marketing shell

| Path | Classification |
|------|----------------|
| `components/public/public-shell.tsx` | **COPY WITH MINOR ADAPTATION** |
| `routes/marketing-shell.tsx` | **REWRITE FOR NEXT.JS** (optional `(marketing)` group later) |
| `mocks/public.ts` | **REFERENCE ONLY** |

### 14. Navigation abstractions

| Path | Classification |
|------|----------------|
| `shell/shell-navigation.tsx` | **COPY AS-IS** — designed for `usePathname` + `router.push` |
| `shell/sidebar-nav.tsx`, `breadcrumbs.tsx` | **COPY WITH MINOR ADAPTATION** |
| `lib/preview-nav.ts` | **DO NOT COPY** (toast stub navigation) |
| Any `@tanstack/react-router` `Link` / `useNavigate` in routes | **DO NOT COPY** |

### 15. Responsive behavior

| Path | Classification |
|------|----------------|
| `hooks/use-mobile.tsx` (768px) | **COPY AS-IS** |
| `ui/sidebar.tsx` mobile drawer + icon collapse | **COPY WITH MINOR ADAPTATION** |
| Marketing Sheet hamburger | Part of public shell — **COPY WITH MINOR ADAPTATION** |

### 16. Mock data dependencies

| Path | Classification |
|------|----------------|
| `mocks/portal.ts`, `admin.ts`, `public.ts`, `calls.ts` | **REFERENCE ONLY** — may temporarily copy for shell demos; **must not** replace `callsApi` for production Calls pages |
| Fake APIs / MSW | None present |

### 17. TanStack-specific (must not migrate as runtime)

| Path / package | Classification |
|----------------|----------------|
| `@tanstack/react-start`, `@tanstack/react-router`, `@tanstack/router-plugin` | **DO NOT COPY** |
| `src/routes/**`, `router.tsx`, `routeTree.gen.ts`, `start.ts`, `server.ts` | **DO NOT COPY** / **REWRITE FOR NEXT.JS** (IA reference only) |
| `vite.config.ts`, `@lovable.dev/vite-tanstack-config`, `nitro`, `bunfig.toml` | **DO NOT COPY** |
| `@tanstack/react-query` | **COPY WITH MINOR ADAPTATION** (optional; usable in Next — decide later) |
| `@tanstack/react-table` | Not used — N/A |

### Other Lovable assets

| Path | Classification |
|------|----------------|
| `routes/ui-kit.tsx` | **REFERENCE ONLY** (optional later `/ui-kit` showcase) |
| `routes/index.tsx` | **REFERENCE ONLY** |
| `.lovable/plan/*.md` | **REFERENCE ONLY** |
| `AGENTS.md` (Lovable git warning) | **DO NOT COPY** |

---

## Part 2 — Production Next.js inventory (audit findings)

### 1. Existing globals.css

- `ai-call-agent-frontend/src/app/globals.css` — minimal Tailwind import + gray `#f9fafb` / Arial  
- `postcss.config.mjs` — `@tailwindcss/postcss`  
- **No** design tokens, dark mode, or shadcn CSS variables

### 2. Existing layout.tsx

- `src/app/layout.tsx` — root metadata + `html`/`body` only  
- **No** nested App Router layouts  
- Shell via component: `src/components/layout/DashboardLayout.tsx`

### 3. Existing components

| Path | Role |
|------|------|
| `components/layout/DashboardLayout.tsx` | App shell wrapper |
| `components/layout/Sidebar.tsx` | Nav: Dashboard, Calls, AI Settings |
| `components/layout/Topbar.tsx` | Static portal title |
| `components/cards/StatCard.tsx` | Dashboard metric card |
| `components/calls/CallsTable.tsx` | Live call list + links |
| `components/feedback/ApiNotice.tsx` | API failure banner |

### 4–6. Pages

| Route | Path | Status |
|-------|------|--------|
| `/` | `app/page.tsx` | Redirect → `/dashboard` |
| `/dashboard` | `app/dashboard/page.tsx` | Placeholder StatCards (hardcoded zeros) |
| `/calls` | `app/calls/page.tsx` | **Live** SSR `callsApi.list()` |
| `/calls/[id]` | `app/calls/[id]/page.tsx` | **Live** SSR `callsApi.find(id)` |
| `/calls` loading/error | `loading.tsx`, `error.tsx` | Present |
| `/settings` | `app/settings/page.tsx` | Explicit Module-1 stub |

### 7–8. API client & types

| Path | Role |
|------|------|
| `src/lib/api.ts` | `callsApi.list` / `find`; `ApiResult<T>`; server `fetch` |
| `src/lib/api-url.mjs` + `api-url.d.ts` | Dual base URL: internal vs public |
| `src/types/call.ts` | `Call`, `CallStatus` aligned with Nest |

### 9. Existing dependencies (production)

**Deps:** `next@16.2.6`, `react@19.2.4`, `react-dom@19.2.4`, `axios` (unused), `clsx`, `tailwind-merge`, `lucide-react`, `recharts` (unused)  
**Dev:** `tailwindcss` / `@tailwindcss/postcss` v4, TypeScript, ESLint + `eslint-config-next`

### 10. Routing / layout architecture

```
src/app/
├── layout.tsx, globals.css, page.tsx
├── dashboard/page.tsx
├── calls/{page,loading,error}.tsx + [id]/page.tsx
└── settings/page.tsx
```

- App Router under `src/app/`  
- No middleware, auth, or route groups  
- Path alias `@/*` → `./src/*`  
- Env: `INTERNAL_API_BASE_URL`, `NEXT_PUBLIC_API_BASE_URL` → Nest `/api/v1`

---

## Classification legend (used below)

| Label | Meaning |
|-------|---------|
| **COPY AS-IS** | Portable; drop into Next with path/alias alignment |
| **COPY WITH MINOR ADAPTATION** | Same component; `"use client"`, providers, fonts, or nav wiring |
| **REWRITE FOR NEXT.JS** | Keep UX/IA; reimplement as App Router layouts/pages |
| **REFERENCE ONLY** | Study patterns/visuals; do not ship as production data/routes |
| **DO NOT COPY** | Framework/Lovable/preview plumbing or would replace production truth |

---

## A. Lovable → Next.js file mapping

| Lovable source | Production target | Classification |
|----------------|-------------------|----------------|
| `src/styles.css` | `src/app/globals.css` (replace/merge tokens) | COPY WITH MINOR ADAPTATION |
| `components.json` | `ai-call-agent-frontend/components.json` | COPY WITH MINOR ADAPTATION |
| `src/lib/utils.ts` | `src/lib/utils.ts` | COPY AS-IS |
| `src/hooks/use-mobile.tsx` | `src/hooks/use-mobile.tsx` | COPY AS-IS |
| `src/components/ui/*` | `src/components/ui/*` | COPY WITH MINOR ADAPTATION |
| `src/components/patterns/*` | `src/components/patterns/*` | COPY AS-IS |
| `src/components/shell/*` | `src/components/shell/*` | COPY WITH MINOR ADAPTATION |
| `src/components/public/public-shell.tsx` | `src/components/public/public-shell.tsx` | COPY WITH MINOR ADAPTATION |
| `shell-navigation.tsx` provider host | New `src/components/providers/*` or portal `layout.tsx` | REWRITE FOR NEXT.JS |
| `routes/__root.tsx` providers/fonts/toaster | `src/app/layout.tsx` + client Providers | REWRITE FOR NEXT.JS |
| `routes/portal.tsx` | `src/app/(portal)/layout.tsx` (recommended) | REWRITE FOR NEXT.JS |
| `routes/admin.tsx` | `src/app/(admin)/layout.tsx` (later) | REWRITE FOR NEXT.JS |
| `routes/marketing-shell.tsx` | `src/app/(marketing)/layout.tsx` (later) | REWRITE FOR NEXT.JS |
| `routes/ui-kit.tsx` | Optional `src/app/ui-kit/page.tsx` | REFERENCE ONLY |
| `mocks/*` | Optional `src/mocks/*` (non-Calls) | REFERENCE ONLY |
| `router.tsx`, `routeTree.gen.ts`, `start.ts`, `server.ts`, `routes/*` framework glue | — | DO NOT COPY |
| Preview nav / Lovable error libs | — | DO NOT COPY |
| Production `lib/api.ts`, `types/call.ts`, Calls pages | Keep; restyle with new UI | PRESERVE (see E) |
| Production `DashboardLayout` / `Sidebar` / `Topbar` | Superseded by AppShell | Replace after shell wired |

**Recommended route mapping (production paths preserved):**

| Current production | After shell integration |
|--------------------|-------------------------|
| `/dashboard` | Stay; render inside Customer AppShell |
| `/calls`, `/calls/[id]` | Stay; restyle with Table + StatusBadge + patterns |
| `/settings` | Stay as stub inside shell |
| Lovable `/portal/*` mock hrefs | Map subset to real routes; defer agents/customers/billing etc. |

---

## B. Dependency comparison

| Package area | Lovable | Production Next | Action |
|--------------|---------|-----------------|--------|
| Framework | TanStack Start + Vite | **Next.js 16** | Keep Next; do not add Start/Vite |
| Router | `@tanstack/react-router` | App Router | Do not add TanStack Router |
| Tailwind | v4 via `@tailwindcss/vite` | v4 via `@tailwindcss/postcss` | Keep PostCSS; port CSS tokens; add `tw-animate-css` |
| UI primitives | Full Radix + shadcn | None | Add Radix + CVA + related UI packages |
| Icons | `lucide-react` | `lucide-react` (older major) | Align version carefully when upgrading |
| Charts | `recharts` ^2 | `recharts` ^3 (unused) | Prefer one version; migrate chart.tsx if used |
| Forms | RHF + zod + resolvers | None | Add when Settings/forms land |
| Toasts | `sonner` | None | Add |
| Query | `@tanstack/react-query` (scaffold) | None | Optional later |
| HTTP | None (mocks) | `fetch` in `api.ts`; unused `axios` | Keep `fetch`/`callsApi`; consider removing `axios` later |
| `clsx` / `tailwind-merge` | Used via `cn` | Present, unused | Start using via `utils.ts` |

---

## C. Components safe to migrate

**High confidence (copy early):**

- Entire `components/ui/` kit (with client boundaries)  
- Entire `components/patterns/`  
- `lib/utils.ts`, `hooks/use-mobile.tsx`  
- `shell/shell-navigation.tsx`  
- Design tokens from `styles.css` → `globals.css`

**Safe after Next navigation provider wired:**

- `app-shell`, `platform-shell`, `app-sidebar`, `sidebar-nav`, `top-header`, menus, switchers, breadcrumbs, usage indicator  
- `public/public-shell.tsx`

**Safe as temporary fixtures only:**

- `mocks/portal.ts`, `admin.ts`, `public.ts` (not for live Calls)

---

## D. TanStack-specific code that must not migrate

- Packages: `@tanstack/react-start`, `@tanstack/react-router`, `@tanstack/router-plugin`  
- Files: `src/routes/**` (as source files), `src/router.tsx`, `src/routeTree.gen.ts`, `src/start.ts`, `src/server.ts`  
- Tooling: `vite.config.ts`, `@lovable.dev/vite-tanstack-config`, `nitro`, `bunfig.toml`, `@tailwindcss/vite`  
- Patterns: `createFileRoute`, `HeadContent`/`Scripts`/`shellComponent`, TanStack `Link`/`Outlet`/`useNavigate` in route files  
- Lovable-only: `lib/error-capture.ts`, `lib/error-page.ts`, `lib/lovable-error-reporting.ts`, `lib/preview-nav.ts`

**Clarification:** `@tanstack/react-query` is **not** Start-specific and may be adopted later in Next. `@tanstack/react-table` is unused.

---

## E. Existing production components that should be preserved

| Asset | Why |
|-------|-----|
| `src/lib/api.ts` | Live NestJS Calls contract |
| `src/lib/api-url.mjs` (+ `.d.ts`) | Docker/internal vs public URL resolution |
| `src/types/call.ts` | Backend-aligned domain model |
| `src/app/calls/page.tsx` | SSR list + `ApiResult` handling |
| `src/app/calls/[id]/page.tsx` | SSR detail |
| `src/app/calls/loading.tsx`, `error.tsx` | Operational UX |
| `src/components/calls/CallsTable.tsx` | Behavior + deep links — **restyle**, do not delete contract |
| `src/components/feedback/ApiNotice.tsx` | Or merge into `ErrorState` while keeping API messaging |
| Env examples / Docker / compose health on `/dashboard` | Ops contract |
| Routes `/dashboard`, `/calls`, `/calls/[id]`, `/settings` | Existing product surface |
| NestJS backend (entire) | Out of scope — do not touch |

**May be replaced after AppShell lands (behavior preserved):**

- `DashboardLayout.tsx`, `Sidebar.tsx`, `Topbar.tsx` — visual shell superseded by Lovable AppShell  
- `StatCard.tsx` — may map to `Card` + tokens

---

## F. Files that will need modification (when implementation starts)

| File | Change type |
|------|-------------|
| `ai-call-agent-frontend/package.json` | Add UI deps; optional remove unused `axios` |
| `src/app/globals.css` | Import Lovable tokens + `tw-animate-css`; adjust `@source` for Next |
| `src/app/layout.tsx` | Fonts (`next/font`), Providers (Toaster, optional QueryClient), body classes |
| `postcss.config.mjs` | Likely unchanged; verify Tailwind v4 + animate |
| New: `components.json`, `src/lib/utils.ts`, `src/hooks/*`, `src/components/ui|patterns|shell|public/**` | Add from Lovable |
| New: portal route group layout | Wire `ShellNavigationProvider` + AppShell |
| `src/app/dashboard/page.tsx` | Restyle; keep placeholder data until metrics API |
| `src/app/calls/page.tsx`, `[id]/page.tsx`, `CallsTable.tsx` | Restyle with Table/StatusBadge/EmptyState; **keep `callsApi`** |
| `src/app/calls/loading.tsx`, `error.tsx` | Align with LoadingState / ErrorState patterns |
| `src/app/settings/page.tsx` | Restyle stub inside shell |
| `src/components/layout/*` | Deprecate/remove once AppShell adopted |
| `src/components/feedback/ApiNotice.tsx` | Optionally restyle or compose with Alert/ErrorState |

---

## G. Files that must not be touched (this UI handoff phase)

| Scope | Paths / rule |
|-------|----------------|
| **Backend** | Entire `ai-call-agent-backend/**` |
| **API contract** | Do not break `GET /api/v1/calls` and `GET /api/v1/calls/:id` consumption |
| **Env secrets** | Do not commit real `.env` / credentials |
| **Lovable as production** | Do not replace `ai-call-agent-frontend` with TanStack Start app |
| **Auth / Module APIs** | Do not implement Auth or future vertical slices yet |
| **Production Calls data path** | Do not point Calls pages at `mocks/calls.ts` |
| **Git history of Lovable** | Treat Lovable as reference tree; avoid rewriting its repo as product |

---

## H. Recommended integration order

1. **Foundation**  
   - Add deps + `utils.ts` + `components.json`  
   - Port `styles.css` → `globals.css` (tokens, Geist via `next/font`)  
   - Port `components/ui/*` + verify build  

2. **Patterns**  
   - Port `patterns/*` (StatusBadge, Empty/Loading/Error, FormField)  
   - Mount Sonner in client Providers  

3. **Navigation bridge**  
   - Port `shell-navigation.tsx`  
   - Create Next provider using `usePathname` + `router.push`  

4. **Customer shell (replace DashboardLayout)**  
   - Port AppShell + sidebar/header chrome  
   - Introduce `(portal)` layout (or wrap existing pages)  
   - Map nav to `/dashboard`, `/calls`, `/settings` only at first  
   - Use portal mocks only for org/business/user chrome  

5. **Restyle live Calls**  
   - Rebuild `CallsTable` / detail with `ui/table`, StatusBadge, EmptyState  
   - Keep `callsApi` + `Call` types + ApiResult messaging  

6. **Restyle Dashboard + Settings stubs**  
   - Visual parity; no fake “live” metrics without API  

7. **Admin + Marketing shells (optional, later in handoff)**  
   - Port PlatformShell / PublicShell behind route groups  
   - Stub pages only — no Auth, no Admin APIs  

8. **UI kit route (optional)**  
   - Port showcase for design QA only  

9. **Cleanup**  
   - Remove superseded layout components  
   - Dep hygiene (`axios`, unused recharts if still unused)  
   - Do not delete Lovable repo; keep as reference  

---

## I. Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Accidental replacement of Next with TanStack Start | Lose SSR Calls + Nest integration | Host = `ai-call-agent-frontend` only |
| Breaking `callsApi` / env URL dual-base | Calls pages fail in Docker/local | Preserve `api.ts` / `api-url.mjs`; regression test list/detail |
| Tailwind v4 Vite `@source` vs Next PostCSS | Tokens/classes missing | Adapt CSS imports for Next; visual regression on shell + calls |
| `"use client"` boundary mistakes | Hydration errors / broken Radix | Mark interactive UI client; keep Calls data fetch on server |
| `recharts` v2 (Lovable) vs v3 (Next) | Chart breakage | Defer charts or pin/adapt `chart.tsx` |
| `lucide-react` major version skew | Icon API mismatches | Align versions during dep install |
| Shipping mock portal nav as “real” features | Broken links / false product surface | Toast or hide unimplemented hrefs; only enable real routes |
| Org/business switchers without Auth | Confusing UX | Explicit “preview chrome” or disabled until Module Auth |
| Overwriting production Sidebar before shell ready | Nav regression | Feature-flag or land shell + pages in one PR slice |
| Scope creep into Auth / Admin APIs / backend | Delays handoff | Strict out-of-scope list (this report) |
| Stale frontend tests (`src/test/*`) | False confidence | Fix or quarantine tests when touching CallsTable/api |

---

## J. Verification checklist

### Build & static

- [ ] `npm run lint` / `typecheck` / `build` succeed in `ai-call-agent-frontend`
- [ ] No TanStack Start/Router imports in production frontend
- [ ] Design tokens render (primary blue, status colors, sidebar tokens)
- [ ] Geist (or approved) font loads via Next font pipeline

### Shell & responsive

- [ ] Customer AppShell wraps Dashboard, Calls, Settings
- [ ] Desktop: collapsible sidebar; Mobile: off-canvas sidebar (&lt;768px)
- [ ] Active nav highlights correct path
- [ ] Unimplemented nav items do not 404 silently (hidden or explicit stub)

### Production Calls (must pass)

- [ ] `/calls` still uses `callsApi.list()` (not mocks)
- [ ] `/calls/[id]` still uses `callsApi.find(id)`
- [ ] Backend down → user-facing error (`ApiNotice` / ErrorState), not crash
- [ ] Empty list → EmptyState pattern
- [ ] Loading → skeleton/spinner aligned with design system
- [ ] Deep link from table → detail works

### Pages

- [ ] `/` → `/dashboard`
- [ ] Dashboard renders inside new shell (placeholder metrics OK)
- [ ] Settings stub renders inside new shell
- [ ] Docker/health path `/dashboard` still healthy

### Optional later

- [ ] Admin shell preview route (mock only)
- [ ] Marketing shell preview route (mock only)
- [ ] UI kit route for design QA
- [ ] No backend files changed; API contracts unchanged

### Explicit non-goals (verify not done)

- [ ] No Authentication implementation
- [ ] No new vertical-slice modules beyond UI chrome
- [ ] Lovable project not set as production deploy target

---

## Appendix — Quick asset classification matrix

| Lovable asset category | Classification |
|------------------------|----------------|
| Global design tokens (`styles.css`) | COPY WITH MINOR ADAPTATION |
| Typography (tokens) | COPY WITH MINOR ADAPTATION |
| Typography (font loading) | REWRITE FOR NEXT.JS |
| UI primitives (`components/ui`) | COPY WITH MINOR ADAPTATION |
| Patterns (status/empty/loading/error/form-field) | COPY AS-IS |
| Customer Portal shell components | COPY WITH MINOR ADAPTATION |
| Admin Portal shell components | COPY WITH MINOR ADAPTATION |
| Public/Marketing shell | COPY WITH MINOR ADAPTATION |
| Navigation abstraction (`shell-navigation`) | COPY AS-IS |
| Responsive `use-mobile` + sidebar behavior | COPY AS-IS / MINOR ADAPTATION |
| Mock data | REFERENCE ONLY |
| TanStack routes / Start / Vite / Nitro | DO NOT COPY |
| UI kit / marketing preview routes | REFERENCE ONLY → REWRITE if ported |
| Preview-nav / Lovable error reporting | DO NOT COPY |
| react-query provider scaffold | COPY WITH MINOR ADAPTATION (optional) |

---

## Appendix — Production preserve list (short)

1. Next.js App Router architecture  
2. `callsApi` + `api-url` + env dual-base URL  
3. `Call` types  
4. Live Calls list/detail SSR pages  
5. Calls loading/error boundaries  
6. NestJS backend untouched  
7. Existing product routes for Dashboard / Calls / Settings  

---

*End of report. Implementation should not begin until this handoff is accepted.*
