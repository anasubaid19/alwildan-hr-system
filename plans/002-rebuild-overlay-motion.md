# 002 — Rebuild overlay motion with interruptible transitions

- **Status**: DONE
- **Commit**: 4503c05
- **Severity**: HIGH
- **Category**: Easing, duration, interruptibility, cohesion
- **Estimated scope**: 5 files, medium

## Problem

The shared dialog, alert-dialog, dropdown, and popover primitives use `tw-animate-css` keyframes with hard-coded `duration-100` and no easing class.

```tsx
// web/src/components/ui/dialog.tsx:54 — current
"... duration-100 ... data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
```

```tsx
// web/src/components/ui/dropdown-menu.tsx:43 — current
"... duration-100 ... data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out ... data-closed:zoom-out-95"
```

The imported `animate-in`/`animate-out` utilities resolve to separate keyframes and fall back to bare CSS `ease`. They restart when reversed and bypass the tokens in `web/src/styles.css:113-119`.

## Target

- Update the existing easing token to `--motion-ease-out: cubic-bezier(0.23, 1, 0.32, 1)` and expose it as `--ease-out: var(--motion-ease-out)` in `@theme inline`.
- Use Base UI's `data-starting-style` and `data-ending-style` attributes with interruptible CSS transitions.
- Backdrops: opacity only, 150ms for regular dialogs and alert dialogs.
- Dialog/alert popup: `transition-[scale,opacity]`, 200ms, strong ease-out, starting/ending opacity 0 and scale 0.95.
- Dropdown/popover popup: `transition-[scale,opacity,transform]`, 150ms, strong ease-out, starting/ending opacity 0 and scale 0.95; preserve `origin-(--transform-origin)`.
- Preserve directional translation where it provides trigger context, but express it with Base UI starting/ending styles rather than keyframes. If Tailwind cannot compose the directional transform without overwriting scale, prefer scale+opacity and preserve the correct transform origin.

## Repo conventions to follow

- Motion tokens live in `web/src/styles.css:113-119` and are exposed through `@theme inline` at lines 60-64.
- Base UI v1.6 supplies `data-starting-style` and `data-ending-style`; the installed documentation uses property-specific transitions on these attributes.
- Popup origins already use `origin-(--transform-origin)` in `web/src/components/ui/dropdown-menu.tsx:43` and `web/src/components/ui/popover.tsx:38`.

## Steps

1. Update and expose the strong `--motion-ease-out` token in `web/src/styles.css`.
2. Convert `DialogOverlay` and `DialogContent` in `web/src/components/ui/dialog.tsx` from `animate-in/out` keyframes to opacity/scale transitions and Base UI start/end attributes.
3. Apply the same modal timing to `AlertDialogOverlay` and `AlertDialogContent` in `web/src/components/ui/alert-dialog.tsx`.
4. Convert both root and submenu popup classes in `web/src/components/ui/dropdown-menu.tsx` to 150ms property-specific transitions with `data-starting-style`/`data-ending-style`.
5. Convert `PopoverContent` in `web/src/components/ui/popover.tsx` to the same trigger-origin transition pattern.
6. Remove obsolete `duration-100`, `animate-in/out`, `fade-*`, `zoom-*`, and `slide-*` classes from these converted primitives.

## Boundaries

- Do NOT change component APIs, positioning, focus management, portal behavior, layout, colors, shadows, or radii.
- Do NOT change `Drawer`; Vaul owns its gesture-driven transform.
- Do NOT change `CommandDialog` motion behavior beyond plan 001.
- Do NOT add dependencies.
- If these excerpts have drifted since commit `4503c05`, stop and report instead of improvising.

## Verification

- **Mechanical**: from `web/`, run `bunx tsc --noEmit`, `bun run lint`, and `bun run build`; all must exit 0.
- **Feel check**: rapidly reverse each popup while DevTools Animations runs at 10% speed. Dropdowns and popovers must scale from their trigger, not the viewport center. Dialogs must remain centered. No animation may restart from scale 0.95 after reversal.
- **Done when**: converted primitives contain no `animate-in/out` keyframes, use tokenized strong ease-out transitions, and reverse smoothly.
