# 003 — Honor reduced motion across shared UI

- **Status**: DONE
- **Commit**: 4503c05
- **Severity**: MEDIUM
- **Category**: Accessibility
- **Estimated scope**: 7 files, medium

## Problem

Movement is enabled without a reduced-motion branch in the shared overlays, auth-card entrances, dashboard hover/progress feedback, and reusable loading spinner.

```tsx
// web/src/routes/sign-in.tsx:48 — current
className="... animate-in fade-in-0 zoom-in-95 duration-normal ease-entrance"
```

```tsx
// web/src/components/ui/spinner.tsx:10 — current
className={cn("size-4 animate-spin", className)}
```

```tsx
// web/src/routes/_app/dashboard.tsx:286 — current
<ChevronRight className="... transition-transform group-hover:translate-x-0.5" />
```

Repository search finds no `motion-reduce`, `motion-safe`, or `prefers-reduced-motion` handling in `web/src`.

## Target

- Reduced motion removes translation, scale, and continuous rotation.
- Opacity and color feedback remain available for comprehension.
- Shared popup transitions created by plan 002 use `motion-reduce:transform-none` and no scale change while retaining a 150-200ms opacity transition.
- Auth cards keep a 200ms fade but remove zoom under reduced motion.
- Dashboard hover translation and progress transform are disabled under reduced motion.
- Spinners replace continuous rotation with a gentle opacity pulse or a static visible loading glyph under reduced motion.

## Repo conventions to follow

- Tailwind utility classes are colocated with component classes throughout `web/src/components/ui`.
- The app imports global styles from `web/src/styles.css`; prefer Tailwind `motion-reduce:*` utilities for component-specific behavior and a small global media query only when utility coverage is insufficient.
- Preserve the existing semantic duration tokens: fast 150ms and normal 200ms.

## Steps

1. Add reduced-motion transform overrides to the dialog, alert-dialog, dropdown, and popover transitions created by plan 002.
2. Add reduced-motion handling to the auth entrance classes in `web/src/routes/sign-in.tsx` and `web/src/routes/sign-up.tsx`: preserve fade, remove zoom.
3. In `web/src/components/ui/spinner.tsx`, stop rotation for reduced-motion users while leaving an unmistakable loading indicator.
4. In `web/src/components/ui/sonner.tsx`, apply the same behavior to the custom `LoaderCircle` icon.
5. In `web/src/routes/_app/dashboard.tsx`, disable hover translation and progress transform transitions under reduced motion.
6. Do not remove focus, pressed, loading, opacity, or color feedback.

## Boundaries

- Do NOT set every transition or animation globally to `none`.
- Do NOT hide loading indicators.
- Do NOT change layout, content, data fetching, or state logic.
- Do NOT add dependencies.
- If these excerpts have drifted since commit `4503c05`, stop and report instead of improvising.

## Verification

- **Mechanical**: from `web/`, run `bunx tsc --noEmit`, `bun run lint`, and `bun run build`; all must exit 0.
- **Feel check**: emulate `prefers-reduced-motion: reduce`. Confirm overlays fade without moving, auth cards fade without zooming, chevrons do not translate, progress does not sweep, and loading remains visually clear without rotation.
- **Done when**: every source movement identified above has an explicit reduced-motion outcome and static feedback remains.
