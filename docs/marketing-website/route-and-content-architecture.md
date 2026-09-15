# Marketing Website — Route & Content Architecture (P1.01)

| Field | Value |
| --- | --- |
| Status | **Implemented in P1.03** — 15 September 2026 |
| Runtime | See [p1-03-implementation.md](./p1-03-implementation.md) |

## 1. Coexistence with portal / auth / admin

```text
src/app/
  layout.tsx                 # root metadata + fonts + providers
  (marketing)/               # PUBLIC site (expand)
    layout.tsx               # PublicShell host
    page.tsx                 # `/` homepage
    features/page.tsx
    how-it-works/page.tsx
    solutions/page.tsx
    pricing/page.tsx
    about/page.tsx
    contact/page.tsx
    faq/page.tsx
    privacy/page.tsx
    terms/page.tsx
  (auth)/                    # KEEP — /login /register …
  (portal)/                  # KEEP — /dashboard …
  (admin)/                   # KEEP — /admin
  invitations/               # KEEP
```

**Canonical decision:** Marketing owns **`/`**. Authenticated visitors are **not** auto-forced away from marketing home in P1.03 (portal entry remains `/dashboard`).

**Conflict resolved:** Root `src/app/page.tsx` dashboard redirect **removed**. `(marketing)/page.tsx` is `/`.

**`/marketing-shell`:** Redirects to `/` (legacy preview non-canonical).

## 2. Canonical launch routes

| Route | Purpose | Priority |
| --- | --- | --- |
| `/` | Home | Required |
| `/features` | Product features (truthful) | Required |
| `/how-it-works` | Setup workflow | Required |
| `/solutions` | Industries / use cases (positioning, not deep modules) | Required |
| `/pricing` | M25 public plans | Required |
| `/about` | Company | Required |
| `/contact` | Contact / demo inquiry | Required |
| `/faq` | FAQ | Required |
| `/privacy` | Privacy policy | Required (copy approval TBD) |
| `/terms` | Terms of service | Required (copy approval TBD) |
| `/login` | Existing auth | Required CTA |
| `/register` | Existing auth | Required CTA |

### Not in launch IA (mock debt)

Do **not** create unless later approved: `/integrations`, `/resources`, `/help`, `/docs`, `/security`, `/book-demo`, `/start-free-trial`, `/industries/*` deep trees, `/features/ai-receptionist`.

Industry presentation lives on **`/solutions`** (single overview), not ten stub pages.

## 3. Homepage section architecture

| # | Section | Content rules |
| --- | --- | --- |
| 1 | Header | Compact nav (see §5) |
| 2 | Hero | AI receptionist positioning; primary **Get Started** → `/register`; secondary **Contact** → `/contact` or Log in |
| 3 | Trust / value strip | 24/7 answering, business knowledge, natural AI voice, call handling — no fake metrics |
| 4 | How it works | Create business → configure agent → knowledge/voice → connect number → receive calls |
| 5 | Core features | Only truth-map features |
| 6 | Business outcomes | Missed-call recovery, consistent greeting, multi-business readiness — qualitative |
| 7 | Solutions / use cases | Positioning categories; **not** booking/reservation claims |
| 8 | Product workflow visual | Diagram/illustration; no invented screenshots of unfinished modules |
| 9 | Pricing teaser | Real `GET /api/v1/public/plans` or empty CTA to contact |
| 10 | FAQ preview | Link to `/faq` |
| 11 | Final CTA | Get Started + Contact |
| 12 | Footer | Product / Company / Resources / Legal — live links only |

## 4. Solutions / industries wording strategy

Safe: “AI receptionist for clinics, salons, restaurants, professional services, home services, real estate…” as **use-case examples**.

Unsafe: claiming native appointment booking, reservation engines, or vertical CRMs until M18/M19/M20 complete.

## 5. Navigation (launch)

### Header

Left: brand → `/`  
Center (desktop): Features · How It Works · Solutions · Pricing · FAQ  
Right: **Log in** → `/login` · **Get Started** → `/register`  
Optional tertiary: Contact (or rely on footer)

Mobile: Sheet menu (reuse existing `PublicHeader` Sheet pattern).

### Footer

| Group | Links |
| --- | --- |
| Product | Features, How It Works, Pricing, Solutions |
| Company | About, Contact |
| Resources | FAQ |
| Legal | Privacy, Terms |

No Help Center / Docs until COMMERCIAL-GATE-P6 / M34.

## 6. Contact / demo strategy (P1.02 recorded)

| Decision | Value |
| --- | --- |
| Mode | `/contact` page + Get Started → `/register` |
| Mailto | Only if approved public email configured |
| Public email in repo | **None** → `PUBLIC CONTACT EMAIL = DECISION REQUIRED` |
| New contact backend | **Not in P1** |

## 7. Auth CTA contract

| Marketing label | Route |
| --- | --- |
| Log in | `/login` |
| Get Started / Create account / Start with EaziAICall | `/register` |
| Book demo / Contact | `/contact` (not `/book-demo`) |

Do not invent `/start-free-trial` until product defines a trial landing distinct from register.

## 8. Dynamic UI states (all marketing pages that fetch)

Especially `/pricing`: **loading · success · empty · error · fallback/retry**. Never invent plans.

## 9. Production / Vercel note

Current production behavior (from UI foundation docs): `/` redirects to dashboard; `/marketing-shell` is placeholder. Launch changes `/` ownership — coordinate deploy carefully; no production change in P1.01.
