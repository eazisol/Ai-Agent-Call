# Marketing Website — Scope & Requirements (P1.01)

| Field | Value |
| --- | --- |
| Gate | `COMMERCIAL-GATE-P1` — Marketing Website launch scope |
| Submodule | **P1.01 — Scope & Technical Design** |
| Status | **Design locked** — 15 September 2026 |
| Depends on | M25 public plans API; existing auth routes; UI foundation |
| Blocks | P1.02+ implementation |
| Runtime change in P1.01 | **NONE** |

## 1. Objective

Deliver a public **EaziAICall marketing website** that explains the commercial AI receptionist SaaS and converts visitors to:

1. **Primary:** Create account / Get started → `/register`
2. **Secondary:** Contact / request demo → `/contact` (launch-safe approach TBD)

A visitor must understand: what it does, who it is for, how it works, core capabilities, value, plans when configured, how to start, how to log in, and how to contact the company.

## 2. Non-goals (P1 launch)

| Out of scope | Notes |
| --- | --- |
| Redesigning Customer Portal / Admin | Do not move or restyle `(portal)` / `(admin)` |
| Stripe / checkout | M27 |
| Fake plans/prices | M25 catalog only |
| Blog / CMS / case studies | Future |
| Analytics pixels / GA | OUT OF SCOPE until approved |
| Fake testimonials, logos, statistics | Forbidden |
| Deep industry booking/reservation claims | M18/M19 incomplete |
| Duplicate auth flows | Use `/login`, `/register` |

## 3. Repo audit summary (15 September 2026)

### Route groups (Next.js App Router)

| Group | Path | Role |
| --- | --- | --- |
| Root | `src/app/page.tsx` | **`/` → redirect `/dashboard`** (portal assumption) |
| `(portal)` | `/dashboard`, `/agents`, … | Authenticated customer app |
| `(auth)` | `/login`, `/register`, … | Public auth surfaces |
| `(admin)` | `/admin` | Admin placeholder shell |
| `(marketing)` | `/marketing-shell` only | PublicShell foundation placeholder |
| `invitations` | `/invitations/accept` | Invite acceptance |

### Current public/marketing UI classification

| Path | Classification | Notes |
| --- | --- | --- |
| `src/app/(marketing)/marketing-shell/` | **EXTEND** → become route group host; placeholder page **REMOVE-LATER** after `/` lives under marketing | Foundation only |
| `src/components/public/public-shell.tsx` | **EXTEND** | Header/footer/mobile Sheet — real chrome |
| `src/components/public/marketing-shell-host.tsx` | **EXTEND** | Enable real marketing routes; drop toast-only nav |
| `src/mocks/marketing-shell.ts` | **REFACTOR** | Replace dead hrefs (`/start-free-trial`, `/book-demo`, deep industry URLs) with launch IA |
| `src/app/page.tsx` | **REFACTOR** (P1.03) | Stop blind redirect; marketing owns `/`; authed users → dashboard |
| `src/app/(auth)/*` | **KEEP** | CTAs target these routes |
| `src/app/(portal)/*` | **KEEP** | Untouched by marketing content |
| `src/app/(admin)/*` | **KEEP** | Untouched |
| `src/app/globals.css` | **KEEP** | Tailwind v4 + Lovable-ported tokens |
| `src/components/ui/*` | **KEEP** | Button, Card, Sheet, etc. |
| `src/components/patterns/{empty,error,loading}-state.tsx` | **KEEP** | Reuse for pricing empty/error |
| `public/favicon.ico`, `icon.svg`, `apple-icon.png` | **KEEP** | Brand assets |
| `EaziAICall-Lovable-UI/` | **PARK** | **Not present in this workspace**; documented as external design reference only (`docs/EaziAICall_UI_Foundation_Final_Status.md`) |
| Fake nav targets in mocks (`/integrations`, `/resources`, `/help`, `/docs`, `/security`, `/industries/*`, `/features/ai-receptionist`) | **REMOVE-LATER** from launch nav | Do not ship dead links |

### Auth CTAs (verified)

| Intent | Canonical route | Exists |
| --- | --- | --- |
| Log in | `/login` | YES — `src/app/(auth)/login/page.tsx` |
| Get Started / Create account | `/register` | YES — `src/app/(auth)/register/page.tsx` |
| Post-register org setup | `/onboarding/organization` | YES (portal) |

Mock CTAs `/start-free-trial` and `/book-demo` **do not exist** — must not be used.

### Contact / demo backend

No dedicated contact/demo Nest module or lead API found. **DECISION REQUIRED** for launch form transport (see [route-and-content-architecture.md](./route-and-content-architecture.md)).

### Pricing source (verified)

- Backend: `GET /api/v1/public/plans` (M25) — sanitized; no `legacy_production`
- Frontend today: `subscriptionsApi` has authenticated `listPlans` only — **no public fetch helper yet** (add in P1.03)
- Same-origin proxy: `src/app/api/backend/[...path]/route.ts`

### Analytics / cookies

No marketing tracker (GA/Meta/Plausible) in frontend app source. Launch: no consent banner for decoration. Future tracking requires consent review.

## 4. Messaging hierarchy (copy direction)

1. Product name / category: **AI receptionist for businesses**
2. Outcome: answer and handle inbound calls with natural voice, using business knowledge
3. Proof of product: workspace → agent → knowledge/voice → phone number → inbound AI calls
4. Commercial: plans via M25 public catalog (or contact when empty)
5. Trust: multi-tenant, roles, providers abstracted (Twilio / ElevenLabs) — no fake stats

## 5. Feature truth map

### Marketable now (implemented / approved modules)

| Capability | Module basis |
| --- | --- |
| Multi-tenant organizations & workspaces | M02 |
| Team / roles | M03 |
| Business profiles | M04 |
| AI receptionist agents & instructions | M05 |
| ElevenLabs conversational voice sync | M06 |
| Knowledge Base | M07 |
| Voice Library | M08 |
| Voice Cloning (where plan permits) | M09 + M25 entitlement |
| Phone Number Management | M11 |
| Twilio telephony | M10 |
| Inbound AI call path | M12 (product exists; **formal M12-GATE still open** — avoid “fully certified” language) |
| Plan / entitlement foundation | M25 |

### Do not market as available

| Capability | Reason |
| --- | --- |
| Outbound calling | M13 incomplete |
| Analytics product | M24 incomplete |
| CRM | M20 incomplete |
| Automations / n8n | M22 incomplete |
| Notifications product | M23 incomplete |
| Billing / checkout | M27 incomplete |
| Appointment booking | M18 incomplete |
| Restaurant reservations | M19 incomplete |
| Usage metering dashboard | M26 incomplete |

**Coming soon** labels only if product explicitly approves specific items.

## 6. Launch vs future

### LAUNCH REQUIRED

- Marketing route group + pages: `/`, `/features`, `/how-it-works`, `/solutions`, `/pricing`, `/about`, `/contact`, `/faq`
- Legal: `/privacy`, `/terms` (content may be draft until legal approval — **DECISION REQUIRED** for final counsel copy)
- Header/footer with **only live links**
- Auth CTAs to `/login` / `/register`
- Pricing via M25 public API + empty/error states
- SEO foundation (titles, descriptions, OG, robots, sitemap)
- Responsive + a11y baseline

### FUTURE / NICE TO HAVE

Blog, case studies CMS, ROI calculator, public demo sandbox, live chat, reseller pages, localization, large integration directory, comparison pages, per-industry deep pages, Help Center (COMMERCIAL-GATE-P6), tracking pixels.

## 7. Related documents

- [route-and-content-architecture.md](./route-and-content-architecture.md)
- [design-system-reuse.md](./design-system-reuse.md)
- [pricing-integration.md](./pricing-integration.md)
- [seo-performance-accessibility.md](./seo-performance-accessibility.md)
- [implementation-plan.md](./implementation-plan.md)
