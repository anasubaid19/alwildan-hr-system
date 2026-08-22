# 008 — Fix reduced-motion on Button color/shadow transitions

- **Status**: TODO
- **Commit**: 47be59b
- **Severity**: MEDIUM
- **Category**: Accessibility
- **Estimated scope**: 1 file (button.tsx), ~2 lines changed (after Plan 006)

## Problem

After Plan 006 reduces Button transitions to `transition-[scale,opacity]`, the `motion-reduce` variant still needs correction:

```tsx
// web/src/components/ui/button.tsx:9 — after Plan 006
motion-reduce:not-disabled:active:scale-100 motion-reduce:not-disabled:data-pressed:scale-100 motion-reduce:transition-opacity
```

Issues:
1. `motion-reduce:transition-opacity` keeps opacity transition — AUDIT.md: "Reduced motion means fewer and gentler animations, not zero — keep transitions that aid comprehension, remove position changes"
2. Scale is correctly disabled (`scale-100`), but opacity transition on press/hover may still be distracting
3. Should verify color changes (background, border) are instant under reduced motion

## Target

```tsx
// web/src/components/ui/button.tsx:9 — target
motion-reduce:not-disabled:active:scale-100 motion-reduce:not-disabled:data-pressed:scale-100 motion-reduce:transition-none
```

Change:
- `motion-reduce:transition-opacity` → `motion-reduce:transition-none`

Rationale: Under reduced motion, button press/hover should have zero animation — color changes instant, no scale, no fade. This matches AUDIT.md: "remove position changes" and "keep transitions that aid comprehension" — a button press doesn't need comprehension aid; the visual state change is immediate.

## Repo conventions to follow

- Other components (AlertDialog, Dialog, DropdownMenu) use `motion-reduce:data-starting-style:scale-100 motion-reduce:data-ending-style:scale-100` — they keep opacity transition via `transition-opacity` in base
- Button is high-frequency → AUDIT.md: "Tens of times/day (hover effects, list navigation) → Remove or drastically reduce"
- `transition-none` is valid Tailwind utility

## Steps

1. Edit `web/src/components/ui/button.tsx:9`: change `motion-reduce:transition-opacity` to `motion-reduce:transition-none`
2. Run `cd web && bun run typecheck && bun run check`
3. Feel-check: toggle reduced motion → hover/press buttons — zero animation, instant color change

## Boundaries

- Do NOT touch other components' reduced-motion handling
- Depends on Plan 006 being applied first (same file, same line)

## Verification

- **Mechanical**: `cd web && bun run typecheck && bun run check` — both pass
- **Feel check**: 
  - DevTools Rendering → Emulate `prefers-reduced-motion: reduce`
  - Hover any button — background changes instantly, no fade
  - Press button — no scale, instant color
  - Toggle back to no-preference — scale + opacity restored
- **Done when**: typecheck + lint pass, reduced-motion feels correct