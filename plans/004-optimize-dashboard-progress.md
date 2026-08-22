# 004 — Move dashboard progress to the compositor

- **Status**: DONE
- **Commit**: 4503c05
- **Severity**: MEDIUM
- **Category**: Performance, duration
- **Estimated scope**: 1 file, small

## Problem

The upload progress indicator animates a layout property for 500ms.

```tsx
// web/src/routes/_app/dashboard.tsx:318-322 — current
<div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
  <div
    className="h-full rounded-full bg-primary transition-[width] duration-500"
    style={{ width: `${pct}%` }}
  />
</div>
```

Animating `width` triggers layout and paint. The 500ms duration also exceeds the under-300ms UI budget for a routine dashboard state update.

## Target

Keep the fill at `width: 100%` and represent progress with `transform: scaleX(pct / 100)`. Use `transform-origin: left`, a 200ms `cubic-bezier(0.23, 1, 0.32, 1)` transition, and disable the transition under reduced motion.

```tsx
// target shape
<div
  className="h-full origin-left rounded-full bg-primary transition-transform duration-normal ease-out motion-reduce:transition-none"
  style={{ transform: `scaleX(${pct / 100})` }}
/>
```

## Repo conventions to follow

- `duration-normal` maps to the 200ms motion token in `web/src/styles.css:61,115`.
- Plan 002 exposes `ease-out` as the strong repository token.
- Dynamic values already use an inline style in this component.

## Steps

1. In `web/src/routes/_app/dashboard.tsx`, replace inline width with a full-width bar and inline `transform: scaleX(...)`.
2. Replace `transition-[width] duration-500` with `origin-left transition-transform duration-normal ease-out`.
3. Add `motion-reduce:transition-none` so period changes snap to the correct value without sweeping.
4. Preserve the percentage calculation, labels, dimensions, colors, and rounded clipping.

## Boundaries

- Do NOT change dashboard data fetching, calculations, labels, or surrounding layout.
- Do NOT add JavaScript animation logic or dependencies.
- Preserve all unrelated uncommitted dashboard work.
- If these excerpts have drifted since commit `4503c05`, stop and report instead of improvising.

## Verification

- **Mechanical**: from `web/`, run `bunx tsc --noEmit` and `bun run lint`; both must exit 0.
- **Feel check**: change periods and inspect at 10% speed. The bar must grow from the left without changing layout. In Performance tools, the transition should animate transform rather than width. Under reduced motion it must update instantly.
- **Done when**: no progress animation targets `width`, the duration is 200ms, and the visual percentage remains correct at 0%, partial, and 100%.
