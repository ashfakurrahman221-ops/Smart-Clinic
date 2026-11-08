---
name: design-consistency
description: Enforce the Smart Clinic design system when writing, reviewing or fixing any UI (smart-clinic/ React + Tailwind v4 + daisyUI). Use before creating pages, components, forms, tables, modals or marketing sections, and when asked to make the UI "consistent", "clean", or to fix color/spacing drift.
---

# Smart Clinic — Design Consistency

`design.md` at this repo root is the contract. Load it when a rule here is ambiguous. Never invent a new visual language.

Frontend root: `smart-clinic/`. Backend `clinic_backend/` has no UI concerns — never touch it for design work.

## Before writing UI

1. Read `smart-clinic/src/App.css` (`@theme` + daisyUI bindings) — these are the only colors.
2. Read `smart-clinic/src/components/ui/index.js` — reuse a primitive before writing markup.
3. If the pattern is missing and will be used twice, add `smart-clinic/src/components/ui/<Name>.jsx` and export it from `index.js`.

## Hard rules

- **Colors:** `#1e3a8a` primary, `#172554` primary-hover, `#0d9488` teal, `#0f766e` teal-hover, `#0284c7` accent, `#F1F5F9` app canvas. Everything else is `slate`/`emerald`/`amber`/`rose`/`teal`/`blue` Tailwind scales. Zero other hex literals — not `#283891`, not `#2534a5`, not `#0ea5e9`.
- **Type:** 10/11/12/14/16/20/24/30/36–60 px only. Body `text-xs`/`text-sm`, headings `font-bold tracking-tight`, micro labels `uppercase tracking-wider`, numerals `font-mono tabular-nums`.
- **Shape:** cards & modals `rounded-2xl`, controls `rounded-xl`, badges `rounded-md`, pills `rounded-full`. Card shadow `shadow-xs`, modal `shadow-xl`, never arbitrary shadows.
- **Space:** 4px grid; card `p-5`; header bar `px-5 py-4`; footer bar `px-5 py-3`; sections `py-14 lg:py-16`; dashboard content `max-w-[1600px]`, public `max-w-7xl`, padding `px-4 sm:px-6 lg:px-8`.
- **Borders:** `border-slate-200` default, `border-slate-100` hairline. Surfaces: `bg-white`, `bg-slate-50/50`, canvas `bg-[#F1F5F9]`.
- **Text:** `slate-900` primary, `slate-700` body, `slate-500` muted, `slate-400` placeholder only.
- **Light theme only.** No `dark:` classes.

## Component discipline

| Need | Use | Not |
| --- | --- | --- |
| Button | `ActionButton` (`primary` once per view) | raw `<button>` with colors |
| KPI tile | `MetricCard` | custom stat div |
| Page title | `PageHeader` | ad-hoc `<h1>` block |
| Table | `TableShell` (with `loading`, `empty`) | `<table>` in a page |
| Dialog | `ModalShell` (with `footer`) | custom fixed overlay |
| Status pill | `StatusBadge` + `STATUS_CONFIGS` | inline colored span |
| Form control | daisyUI `input input-bordered text-sm` + `label text-xs font-bold` | styled divs |

## Required states

Every async block renders loading (`Loader2` or `.skeleton-shimmer`), empty (icon + message), and error (`bg-rose-50 border-rose-200 text-rose-700`). Missing values render `—`.

## Copy

All user-facing text through `useLanguage()`/`t()`, English + Bangla. Allow `break-words` and `leading-relaxed` — Bangla is taller. Currency `৳`, Latin digits only.

## Accessibility

`aria-label` on icon-only buttons, `aria-hidden` on decorative icons, `aria-invalid` + `border-rose-300` on errors, visible `focus:ring-2 focus:ring-[#1e3a8a]/30`, touch targets ≥ 44px.

## Review procedure

```powershell
# 1. new/odd colors (should list only approved token values)
Get-ChildItem smart-clinic/src -Recurse -Include *.jsx,*.css | Select-String -Pattern '#[0-9a-fA-F]{6}' -AllMatches |
  ForEach-Object { $_.Matches.Value.ToLower() } | Group-Object | Sort-Object Count -Descending

# 2. radius drift
Get-ChildItem smart-clinic/src -Recurse -Include *.jsx | Select-String -Pattern 'rounded-(none|sm|md|3xl|\[)' | Select-Object Path,LineNumber,Line

# 3. primitives bypassed
Get-ChildItem smart-clinic/src/pages -Recurse -Include *.jsx | Select-String -Pattern '<table|<button className' | Select-Object Path,LineNumber
```

Then confirm: one `primary` action per view, heights align across a row, 360/768/1440 px show no horizontal scroll, print output unchanged.

## When fixing drift

Follow §15 of `design.md` in order (collapse `#283891`/`#1f2c73` → `#1e3a8a`/`#172554` first). Replace mechanically, then screenshot-check the affected screens. Do not mix a cleanup commit with a feature commit.
