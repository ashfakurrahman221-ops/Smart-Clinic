# Smart Clinic — Design System & Consistency Rules

**Status:** authoritative. If code disagrees with this file, the code is wrong.
**Repo:** monorepo root. Frontend = `smart-clinic/`, backend = `clinic_backend/` (no UI concerns).
**Stack:** React 19 + Tailwind CSS v4 (`@theme` tokens) + daisyUI 5 (`light` theme only) + lucide-react icons.
**Scope:** every surface — public marketing, auth, patient, doctor, receptionist, clinic admin, super admin, print output.

> All paths below are relative to this root. Frontend source = `smart-clinic/src/`.

---

## 1. Non-negotiables

1. **One palette.** Only the tokens in §3. No new hex values, no `bg-[#...]` unless it is a listed token.
2. **One type scale.** Only the sizes in §4. No `text-[13px]` one-offs.
3. **One component per job.** Buttons/inputs/cards/tables/modals come from `smart-clinic/src/components/ui/*`. Never re-style a raw `<button>` when `ActionButton` fits.
4. **One radius and shadow per element class.** Card = `rounded-2xl`, control = `rounded-xl`, badge = `rounded-md`, pill = `rounded-full`.
5. **Light theme only.** No dark-mode variants, no `prefers-color-scheme` branches. `data-theme="light"` is the contract.

> Rule of thumb: a new screen must look like it was built by the same person who built `ClinicAdminDashboard` — same header rhythm, same card density, same borders.

---

## 2. Source of truth

| Concern | File |
| --- | --- |
| Tokens, theme, print isolation | `smart-clinic/src/App.css` |
| Buttons | `smart-clinic/src/components/ui/ActionButton.jsx` |
| KPI tiles | `smart-clinic/src/components/ui/MetricCard.jsx` |
| Page titles | `smart-clinic/src/components/ui/PageHeader.jsx` |
| Data tables | `smart-clinic/src/components/ui/TableShell.jsx` |
| Dialogs | `smart-clinic/src/components/ui/ModalShell.jsx` |
| Status states | `smart-clinic/src/components/ui/StatusBadge.jsx` |
| Barrel import | `smart-clinic/src/components/ui/index.js` |

```jsx
import { ActionButton, MetricCard, PageHeader, TableShell, ModalShell, StatusBadge } from "../components/ui";
```

If a pattern is needed twice, add it to `smart-clinic/src/components/ui/` and export it from `index.js`. Do not copy-paste markup between pages.

---

## 3. Color

### 3.1 Brand tokens (`smart-clinic/src/App.css` → `@theme`)

| Token | Hex | Use |
| --- | --- | --- |
| `brand-primary` | `#1e3a8a` | Primary buttons, active nav, links, h1 accents, icon chips, KPI hairlines |
| `brand-primary-hover` | `#172554` | Hover/active of anything primary |
| `brand-teal` | `#0d9488` | Secondary brand, wordmark accent, "clinic" side of identity |
| `brand-teal-hover` | `#0f766e` | Hover of teal |
| `brand-accent` | `#0284c7` | Informational highlight, charts, tertiary accent |

`--color-primary: #1e3a8a` and `--color-secondary: #0d9488` are also bound to daisyUI, so `btn-primary`, `text-primary`, `bg-secondary` resolve to the same values.

### 3.2 Neutrals & surfaces

| Role | Utility | Value |
| --- | --- | --- |
| App canvas (dashboards) | `bg-[#F1F5F9]` | `#F1F5F9` |
| Card / modal surface | `bg-white` | `#FFFFFF` |
| Subtle fill, table head, modal header/footer | `bg-slate-50`, `bg-slate-50/50`, `bg-slate-50/80` | `#F8FAFC` |
| Border (default) | `border-slate-200` | `#E2E8F0` |
| Border (hairline / divider) | `border-slate-100` | `#F1F5F9` |
| Hover fill | `bg-slate-100` | `#F1F5F9` |
| Text primary | `text-slate-900` | `#0F172A` |
| Text body | `text-slate-700` | `#334155` |
| Text muted / label | `text-slate-500` | `#64748B` |
| Placeholder / idle icon | `text-slate-400` | `#94A3B8` |
| Disabled surface | `bg-slate-100` + `text-slate-400` | — |

### 3.3 Semantic status colors

Fixed meaning. Do not reuse a hue for a different meaning.

| Meaning | Family | Fill / border / text |
| --- | --- | --- |
| Success, paid, check-in, active chamber | emerald | `bg-emerald-50 border-emerald-200 text-emerald-700` |
| Warning, prayer break, held, pending | amber | `bg-amber-50 border-amber-200 text-amber-800` |
| Danger, emergency, cancel, delete | rose | `bg-rose-50 border-rose-200 text-rose-700` |
| Info, brand-tinted chip, "in progress" | blue | `bg-blue-50 border-blue-200 text-[#1e3a8a]` |
| Neutral, unknown, archived | slate | `bg-slate-100 border-slate-200 text-slate-700` |
| Secondary / teal action | teal | `bg-teal-50 border-teal-200 text-[#0d9488]` |

Canonical status→style mapping already lives in `STATUS_CONFIGS` (`StatusBadge.jsx`). Extend it there; never hardcode a status color in a page.

### 3.4 Forbidden values (drift found in the codebase)

These are **live violations** to be replaced, not added to:

| Legacy value | Count | Replace with |
| --- | --- | --- |
| `#283891` | 194 | `#1e3a8a` (hover `#172554`) |
| `#1f2c73`, `#1c278a`, `#1c2885`, `#1a2578`, `#2a37ad` | 21 | `#172554` |
| `#2534a5` | 7 | `#1e3a8a` |
| `#1e40af` | 5 | `#1e3a8a` |
| `#0ea5e9` | 6 | `#0284c7` |
| `#ef4444`, `#f59e0b` | 8 | `rose-600`, `amber-500` |
| `#8c3494`, `#6c1b7a`, `#8b5cf6` | 7 | `brand-primary` / `brand-teal` |
| `#e2136e`, `#d91a6e`, `#f7941d` | 7 | `rose-600` / `brand-teal` |
| `#141b2d`, `#0b101d`, `#0e131f` | 7 | `slate-900` / `slate-950` |

Also banned: purple/fuchsia/indigo gradient heroes, `#000000` text (use `slate-900`), and any gradient other than the documented brand gradient.

**Approved gradient:** `bg-gradient-to-r from-[#1e3a8a] to-[#0d9488]` (brand), and the documented soft section background
`bg-gradient-to-b from-slate-50 via-white to-slate-50`.

---

## 4. Typography

**Family:** Tailwind defaults — `font-sans` for all UI, `font-mono` for numerals/IDs/tokens/currency.
No webfont is loaded; do not add one without updating this file.

| Size | Class | Weight | Where |
| --- | --- | --- | --- |
| 10px | `text-[10px]` | 600 | Table `th`, micro status pills (uppercase + `tracking-wider`) |
| 11px | `text-[11px]` | 600 | Table meta, badge text, secondary row hints |
| 12px | `text-xs` | 400–700 | **Default UI size**: labels, table cells, helper text, modal body |
| 14px | `text-sm` | 400–700 | Form values, navbar, card titles, marketing body |
| 16px | `text-base` | 400 | Long-form / marketing paragraphs, modal title (`text-base font-bold`) |
| 20px | `text-xl` | 700 | Dashboard `h1` (mobile), section headings |
| 24px | `text-2xl` | 700 | Dashboard `h1` (desktop), KPI values |
| 30px | `text-3xl` | 700 | Hero KPI numbers |
| 36–60px | `text-4xl/5xl/6xl` | 900 | Public hero headline only |

**Weights:** 400 body · 500 meta · 600 labels/buttons · 700 headings/KPI · 900 wordmark and hero.
**Tracking:** `tracking-tight` on headings ≥20px; `tracking-wide`/`wider` + `uppercase` on ≤11px labels. Never both on the same element.
**Leading:** `leading-relaxed` for prose, `leading-tight` for KPI stacks, `leading-[1.12]` for the hero only.

**Numerals:** money, counters, serials, percentages → `font-mono tabular-nums`, always with `৳` for currency.
Keep `—` for a missing value, never `0` or blank.

---

## 5. Spacing & layout

- **Grid:** 4px base; use only `gap-1 / 1.5 / 2 / 2.5 / 3 / 3.5 / 4 / 5 / 6` and `p-1.5 / 2 / 2.5 / 3 / 3.5 / 4 / 5`.
- **Card interior:** `p-5`. **Section header bar:** `px-5 py-4`. **Footer bar:** `px-5 py-3` (`py-3.5` in modals).
- **Stack spacing:** `space-y-1` title→subtitle, `space-y-2` header block, `space-y-4` modal body, `space-y-6` page sections.
- **Dashboard shell:** `min-h-screen bg-[#F1F5F9]`, sticky header `h-16 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-2xs`, content `max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6`.
- **Public shell:** `container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl`, section padding `py-14 lg:py-16` (`py-5 lg:py-6` for compact bands).
- **Grids:** `grid gap-4 sm:gap-5` for KPI rows (`grid-cols-2 lg:grid-cols-4`), `grid-cols-1 md:grid-cols-2 xl:grid-cols-3` for card lists.
- **Breakpoints:** only `sm 640 · md 768 · lg 1024 · xl 1280`. No custom media queries.
- **Rule:** nothing may overflow horizontally at 360px. Tables scroll inside `TableShell`, never the page.

---

## 6. Radius, border, elevation

| Element | Radius | Border | Shadow |
| --- | --- | --- | --- |
| Card / table wrapper / modal panel | `rounded-2xl` | `border border-slate-200` | `shadow-xs` (modal: `shadow-xl`) |
| Button, input, select, icon chip, nav control | `rounded-xl` | `border` | `shadow-2xs` |
| Badge, micro pill, trend chip | `rounded-md` | `border` | none |
| Pill, avatar, filter chip | `rounded-full` | `border` | none |
| Interactive card hover | — | `border-slate-300` | `card-hover-elevation` helper (translateY(-2px)) |

Never mix two radii in one control. Never use `shadow-2xl`/`shadow-[arbitrary]`. Marketing CTA may use `shadow-lg shadow-indigo-600/20` — that is the single allowed exception.

---

## 7. Component contracts

### PageHeader (required on every dashboard page)
`title` · `subtitle` · `actions` · `breadcrumbs` · `badge`. One per page, first child of the content area.

### MetricCard (all KPI tiles)
`accent`: `primary | teal | success | warning | danger | neutral`. Value uses `font-mono`; `—` when empty. Max 4 per row on desktop.

### TableShell (all tabular data)
Always pass `headers`; always handle `loading` and `empty`. Row actions live in the last cell, `ActionButton size="xs"`. Row height ≥ 40px; hover `hover:bg-slate-50`.

### ModalShell (all dialogs)
`size` from `sm…4xl`; `footer` for actions (right-aligned). Escape + overlay close already handled — do not reimplement. Destructive confirm uses `variant="danger"` and must name the object being deleted.

### ActionButton variants
`primary` (brand, one per view) · `secondary` (teal, supporting) · `outline` (neutral) · `ghost` (tertiary/icon) · `success` (confirm, cash collected) · `danger` (destructive) · `warning`.

### StatusBadge
Consumes `STATUS_CONFIGS` by enum key. Never build a status pill inline.

---

## 8. Forms

```jsx
<label className="label text-xs font-bold text-slate-500">First Name</label>
<input className="input input-bordered w-full text-sm" />
<p className="text-[11px] text-rose-600">…error…</p>
```

- Label above field, `text-xs font-bold`; helper/error below, `text-[11px]`.
- Errors: `border-rose-300` + `text-rose-600`, and `aria-invalid`. Never red text without a border change.
- Read-only: `bg-slate-100 text-slate-500 cursor-not-allowed`.
- Touch targets ≥ 44×44px on mobile (`min-h-[44px]`).
- Every input needs `id` + `htmlFor`, `name`, and `autoComplete`.
- Numeric/money inputs: `inputMode="numeric"`, right-aligned, `font-mono`.

---

## 9. Feedback & states

| State | Contract |
| --- | --- |
| Loading (inline) | `Loader2` 14px `animate-spin` inside the button; disable it |
| Loading (region) | `.skeleton-shimmer` blocks matching final layout, max 1 spinner per viewport |
| Empty | Icon (`text-slate-300`) + `text-xs font-semibold text-slate-600` message + one hint line |
| Error | `bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-3 text-xs` with retry action |
| Success | emerald equivalent, auto-dismiss ≥ 4s |
| No data value | `—`, never `0` or `N/A` |

---

## 10. Motion

- Durations `150ms` (micro) / `200ms` (elements). Easing `cubic-bezier(0.16, 1, 0.3, 1)`.
- Hover: `translateY(-2px)` via `card-hover-elevation`, or color/border only.
- Press: `active:scale-[0.98]`–`[0.99]`.
- Forbidden: parallax, bounce, infinite decorative loops (except documented `animate-pulse` on live status dots and shimmer skeletons).
- Respect `prefers-reduced-motion` for anything above 200ms.

---

## 11. Accessibility & bilingual (Bangla / English)

- Text contrast ≥ 4.5:1 (`slate-500` is the floor for 12px text). Never `text-slate-400` for body copy.
- Every icon-only control needs `aria-label`; decorative icons get `aria-hidden="true"` (primitives already do this).
- Focus: `focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/30`. Never remove focus styling.
- Bangla strings are ~15% taller: allow `break-words`, `leading-relaxed`, and avoid fixed-height text containers.
- All copy goes through `useLanguage()` / `t()`. No hardcoded user-facing strings in new code.
- Numbers stay Latin (`০` is not used) and money stays `৳`.

---

## 12. Print

Print output is contract, not styling: thermal slip `76mm`, prescription `A4 210mm`, monochrome, `#000` on `#fff`.
Rules live only in the `@media print` block of `smart-clinic/src/App.css`. New printable documents must reuse `.print-modal-overlay`, `.print-modal-content`, `.print-document`, `.thermal-token-slip`, `.a4-prescription-sheet` — never add a second print stylesheet.

---

## 13. Anti-patterns

| ❌ Don't | ✅ Do |
| --- | --- |
| `bg-[#283891]`, `text-[#0ea5e9]` | `bg-primary`, `text-[#0284c7]` token |
| Raw `<button className="bg-blue-600 …">` | `<ActionButton variant="primary">` |
| Inline `style={{ color: … }}` | Token utility class |
| Purple→pink hero gradient | `from-[#1e3a8a] to-[#0d9488]` |
| `rounded-2xl` card with `rounded-lg` button inside | Card 2xl, control xl |
| Two primary buttons in one view | One primary, rest outline/ghost |
| Custom `<div>` table | `TableShell` |
| Toast for validation errors | Inline field error |
| `text-[13px]`, `p-[18px]` | Scale values only |
| Dark-mode `dark:` classes | Light theme only |

---

## 14. PR checklist (copy into every UI PR)

- [ ] Zero new hex literals; `grep -r "#[0-9a-fA-F]\{6\}" smart-clinic/src --include=*.jsx` shows only token values.
- [ ] Only `rounded-lg|xl|2xl|full` used, one per element class.
- [ ] `PageHeader` present on dashboards; `TableShell` for tables; `ModalShell` for dialogs.
- [ ] One `ActionButton variant="primary"` per view.
- [ ] Loading + empty + error handled for every async block.
- [ ] No horizontal scroll at 360 / 768 / 1440 px.
- [ ] Bangla strings don't clip; all copy translated.
- [ ] Focus ring visible on every interactive element.
- [ ] Print output unchanged if the screen is printable.
- [ ] `npm run lint` clean in `smart-clinic/`.

---

## 15. Drift backlog (do in this order)

1. **Collapse the two primaries.** `#283891` (194) / `#1f2c73` → `#1e3a8a` / `#172554`;
   `#2534a5`, `#1e40af`, `#1c278a`, `#1c2885`, `#2a37ad`, `#1a2578` → same. One sed pass, then visual check.
2. **Remove the marketing gradient fork.** Hero `#2534a5` button and indigo/fuchsia gradient → brand tokens.
3. **Purge non-brand accents** (`#8c3494`, `#6c1b7a`, `#8b5cf6`, `#e2136e`, `#d91a6e`, `#f7941d`) and dark hexes (`#141b2d`, `#0b101d`, `#0e131f`) → slate/brand scale.
4. **Fix `ModalShell` focus ring** (`focus:ring-[#283891]/20`) and the stale `#283891` comment in `ActionButton`.
5. **Promote remaining hand-rolled cards/tables** to `smart-clinic/src/components/ui` and export from `index.js`.
6. **Add a CI guard:** fail the build if a new `#hex` appears outside `App.css` (a 15-line lint script is enough).
