# 001 — Disable command palette motion

- **Status**: DONE
- **Commit**: 4503c05
- **Severity**: HIGH
- **Category**: Purpose & frequency, interruptibility
- **Estimated scope**: 2 files, small

## Problem

The `Cmd/Ctrl+K` search palette is a keyboard-driven, high-frequency surface, but it inherits the shared dialog entrance and exit keyframes.

```tsx
// web/src/components/layout/app-shell.tsx:137 — current
if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
  e.preventDefault()
  setSearchOpen((v) => !v)
}
```

```tsx
// web/src/components/ui/command.tsx:53 — current
<DialogContent
  className={cn(
    "top-1/3 translate-y-0 overflow-hidden rounded-4xl! p-0",
    className
  )}
```

`DialogContent` contributes `data-open:animate-in` and `data-closed:animate-out`. Rapid keyboard toggles therefore restart keyframes and make the palette feel slower than the shortcut.

## Target

The command palette must open and close instantly while preserving the shared dialog motion for ordinary dialogs. Add an explicit motion opt-out to `DialogContent` and set it only from `CommandDialog`. Do not replace the shortcut behavior or add a different animation.

## Repo conventions to follow

- Optional primitive behavior is exposed as a typed prop, following `showCloseButton` in `web/src/components/ui/dialog.tsx:40-46`.
- Conditional classes use `cn(...)` from `web/src/lib/utils.ts`.
- The command palette composes the shared primitive in `web/src/components/ui/command.tsx:53-59`.

## Steps

1. In `web/src/components/ui/dialog.tsx`, add an optional `motion?: boolean` prop to `DialogContent`, defaulting to `true`.
2. Keep the structural classes unchanged. Move all entrance/exit animation classes behind `motion && ...` so `motion={false}` contributes no `animate-in`, `animate-out`, fade, zoom, or motion duration classes.
3. In `web/src/components/ui/command.tsx`, pass `motion={false}` to `DialogContent`.
4. Do not change standard `Dialog` and `AlertDialog` behavior in this plan.

## Boundaries

- Do NOT change keyboard handling, focus management, search logic, or dialog markup.
- Do NOT add a replacement animation.
- Do NOT add dependencies.
- If these excerpts have drifted since commit `4503c05`, stop and report instead of improvising.

## Verification

- **Mechanical**: from `web/`, run `bunx tsc --noEmit` and `bun run lint`; both must exit 0.
- **Feel check**: open and close search with `Cmd/Ctrl+K`, including rapid repeated toggles. Confirm the palette never fades, zooms, restarts, or waits for an exit animation. Confirm ordinary dialogs still animate.
- **Done when**: the command palette has no animation classes in rendered state and standard dialogs retain their motion.
