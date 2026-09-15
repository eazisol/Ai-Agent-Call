# Marketing Website — Design System Reuse (P1.01)

| Field | Value |
| --- | --- |
| Status | **Design locked** — 15 September 2026 |
| Source of truth | `ai-call-agent-frontend/src/app/globals.css` + `src/components/ui/*` |

## 1. Principle

Marketing uses the **same EaziAICall visual language** as the portal (tokens already ported from Lovable reference into production CSS). Do not create a disconnected brand system.

## 2. Lovable / Figma reference

| Finding | Detail |
| --- | --- |
| `EaziAICall-Lovable-UI/` | **Not in this workspace** (`Test-Path` = false) |
| Documented strategy | `docs/EaziAICall_UI_Foundation_Final_Status.md` — Lovable = design reference only |
| Already ported | Tokens, PublicShell chrome, UI primitives under Next App Router |
| Do not | Blind-copy obsolete Vite/TanStack routes or mock portal data |

### Reusable from production today

| Asset | Path | Use |
| --- | --- | --- |
| Tokens / Tailwind v4 | `src/app/globals.css` | Colors, radius, shadows, fonts |
| Typography | Geist via `src/app/layout.tsx` (`--font-geist-sans`, `--font-display`) | Body + display |
| Button | `src/components/ui/button.tsx` | CTA hierarchy |
| Card | `src/components/ui/card.tsx` | Feature/pricing cards if needed |
| Sheet | `src/components/ui/sheet.tsx` | Mobile nav (already in PublicHeader) |
| Separator | `src/components/ui/separator.tsx` | Footer |
| Empty / Error / Loading | `src/components/patterns/*` | Pricing & section states |
| PublicShell | `src/components/public/public-shell.tsx` | **EXTEND** |
| Icons | `lucide-react` | Consistent icon strategy |

### Incompatible / mock-only

| Asset | Path | Action |
| --- | --- | --- |
| Marketing fixtures | `src/mocks/marketing-shell.ts` | **REFACTOR** nav/CTA hrefs |
| Toast “coming soon” host | `marketing-shell-host.tsx` `toastComingSoon` | Replace with real navigation |
| Placeholder marketing page | `(marketing)/marketing-shell/page.tsx` | **REMOVE-LATER** |

## 3. Layout & rhythm

| Token / rule | Recommendation |
| --- | --- |
| Max content width | Header/footer `max-w-7xl`; prose sections often `max-w-6xl` (matches shell) |
| Section padding | `py-16`–`py-24` mobile/desktop scale; horizontal `px-4 sm:px-6 lg:px-8` |
| Cards | Prefer bordered panels (`border`, `rounded-lg`) over heavy shadows; use `--shadow-card` sparingly |
| Radius | `--radius` scale from globals |
| Brand mark | Existing PhoneCall lockup in PublicShell **or** `public/icon.svg` — keep consistent |

## 4. Button hierarchy

| Role | Variant |
| --- | --- |
| Primary CTA | `Button` default |
| Secondary CTA | `outline` or `secondary` |
| Tertiary / Log in | `ghost` |
| Soft emphasis | `soft` |

## 5. Color / dark mode

Light-first B2B (globals comment). Marketing pages: light by default. Respect existing `.dark` tokens if user preference exists; do not invent purple/glow themes.

## 6. Responsive breakpoints

Reuse Tailwind defaults already used in PublicShell:

- Mobile nav: Sheet below `lg`
- Grids: `sm` / `md` / `lg` progressive
- Pricing: stack cards on narrow screens; no horizontal page overflow

## 7. Motion

Prefer CSS/`tw-animate-css` already imported. Avoid new heavy animation libraries. Honor `prefers-reduced-motion` when adding transitions.
