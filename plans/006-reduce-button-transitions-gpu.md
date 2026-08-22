# 006 — Reduce Button transitions to GPU-only properties

- **Status**: TODO
- **Commit**: 47be59b
- **Severity**: HIGH
- **Category**: Performance + Purpose & Frequency
- **Estimated scope**: 1 file, ~5 lines changed

## Problem

Button component animates non-GPU properties on every press/hover (high-frequency interaction, 10s×/day):

```tsx
// web/src/components/ui/button.tsx:9 — current
const buttonVariants = cva(
  "[&_svg]:-mx-0.5 relative inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg border font-medium text-base outline-none transition-[scale,box-shadow,background-color,border-color,color] duration-fast ease-out not-disabled:active:scale-[0.96] not-disabled:data-pressed:scale-[0.96] motion-reduce:not-disabled:active:scale-100 motion-reduce:not-disabled:data-pressed:scale-100 motion-reduce:transition-[box-shadow,background-color,border-color,color] before:pointer-events-none before:absolute before:inset-0 before:rounded-[calc(var(--radius-lg)-1px)] pointer-coarse:after:absolute pointer-coarse:after:size-full pointer-coarse:after:min-h-11 pointer-coarse:after:min-w-11 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-64 sm:text-sm [&_svg:not([class*='opacity-'])]:opacity-80 [&_svg:not([class*='size-'])]:size-4.5 sm:[&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
```

Issues:
1. `transition-[scale,box-shadow,background-color,border-color,color]` — animates `box-shadow`, `background-color`, `border-color`, `color` → triggers paint on every interaction (AUDIT.md: "Animate `transform` and `opacity` only")
2. High-frequency control (button press/hover) should not animate color/shadow — instant feedback is correct per AUDIT.md frequency table
3. `motion-reduce:transition-[box-shadow,background-color,border-color,color]` keeps color/shadow transitions under reduced motion — should drop all non-opacity transitions

## Target

```tsx
// web/src/components/ui/button.tsx:9 — target
const buttonVariants = cva(
  "[&_svg]:-mx-0.5 relative inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg border font-medium text-base outline-none transition-[scale,opacity] duration-fast ease-out not-disabled:active:scale-[0.96] not-disabled:data-pressed:scale-[0.96] motion-reduce:not-disabled:active:scale-100 motion-reduce:not-disabled:data-pressed:scale-100 motion-reduce:transition-opacity before:pointer-events-none before:absolute before:inset-0 before:rounded-[calc(var(--radius-lg)-1px)] pointer-coarse:after:absolute pointer-coarse:after:size-full pointer-coarse:after:min-h-11 pointer-coarse:after:min-w-11 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-64 sm:text-sm [&_svg:not([class*='opacity-'])]:opacity-80 [&_svg:not([class*='size-'])]:size-4.5 sm:[&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
```

Changes:
- `transition-[scale,box-shadow,background-color,border-color,color]` → `transition-[scale,opacity]`
- `motion-reduce:transition-[box-shadow,background-color,border-color,color]` → `motion-reduce:transition-opacity`
- Color/shadow/border changes become instant (no transition)

## Repo conventions to follow

- Motion tokens in `web/src/styles.css:115-120`: `--motion-duration-fast: 150ms`, `--motion-ease-out: cubic-bezier(0.23, 1, 0.32, 1)`
- Tailwind `duration-fast` maps to `--motion-duration-fast`
- Button press scale `0.96` is correct per AUDIT.md ("Never use a value smaller than 0.95")
- Base UI primitive handles `data-pressed` attribute

## Steps

1. Edit `web/src/components/ui/button.tsx:9`: replace the long `transition-[...]` string with GPU-only version
2. Run `cd web && bun run typecheck && bun run check`
3. Feel-check: open app, hover/press buttons — color changes instant, scale smooth; toggle reduced motion — scale disabled, opacity transition remains

## Boundaries

- Do NOT touch other components (AlertDialog, Dialog, DropdownMenu, Drawer) — they have separate transition strings
- Do NOT change markup/structure — motion properties only
- Do NOT add new dependencies

## Verification

- **Mechanical**: `cd web && bun run typecheck && bun run check` — both pass
- **Feel check**: 
  - Hover any button — background color changes instantly (no fade), scale subtle
  - Press button — scale to 0.96, snaps back on release
  - DevTools Animations panel at 10%: verify only `transform` and `opacity` animate
  - Rendering panel → Emulate `prefers-reduced-motion: reduce`: press button — no scale, color instant, no transition
- **Done when**: typecheck + lint pass, feel-check confirms GPU-only animation