# 005 — Unify button press feedback

- **Status**: DONE
- **Commit**: 4503c05
- **Severity**: MEDIUM
- **Category**: Physicality, cohesion, UI polish
- **Estimated scope**: 3 files, small

## Problem

The shared button transitions only its shadow even though variants also change background, border, and color. It has no common press-scale feedback. Two auth submit buttons independently add a different motion language.

```tsx
// web/src/components/ui/button.tsx:8-9 — current
const buttonVariants = cva(
  "... transition-shadow ...",
```

```tsx
// web/src/routes/sign-in.tsx:81 — current
className="... transition-[box-shadow,transform,background-color] duration-fast hover:shadow-lg active:scale-[0.98]"
```

## Target

- Shared enabled buttons use an exact `active:scale-[0.96]` press state from the selected `better-ui` guidance.
- Transition only `scale`, `box-shadow`, `background-color`, `border-color`, and `color` for 150ms using the strong ease-out token.
- Reduced-motion users retain color/shadow feedback but do not scale.
- Remove redundant local transform/duration utilities from the two auth submit buttons while preserving their size and hover shadow.

## Repo conventions to follow

- Shared variants live in `buttonVariants` in `web/src/components/ui/button.tsx`.
- `duration-fast` is the 150ms token from `web/src/styles.css:60,114`.
- Pressed visual states already use `:active` and `[data-pressed]` selectors in the variant classes.

## Steps

1. In the base Button class, replace `transition-shadow` with `transition-[scale,box-shadow,background-color,border-color,color] duration-fast ease-out`.
2. Add enabled press feedback covering native `:active` and Base UI `[data-pressed]`: scale to exactly 0.96.
3. Add reduced-motion overrides that suppress the scale/transform transition without suppressing color or shadow feedback.
4. Remove redundant `transition-[box-shadow,transform,background-color] duration-fast active:scale-[0.98]` utilities from `web/src/routes/sign-in.tsx` and `web/src/routes/sign-up.tsx`; preserve `shadow-md` and `hover:shadow-lg`.
5. Confirm disabled/loading buttons never scale.

## Boundaries

- Do NOT change Button markup, sizing, variants, accessibility attributes, loading behavior, or click handlers.
- Do NOT change non-button links or cards.
- Do NOT add dependencies.
- If these excerpts have drifted since commit `4503c05`, stop and report instead of improvising.

## Verification

- **Mechanical**: from `web/`, run `bunx tsc --noEmit`, `bun run lint`, and `bun run build`; all must exit 0.
- **Feel check**: press default, outline, ghost, destructive, icon, disabled, and loading buttons at 10% playback. Enabled controls should compress subtly to 0.96 and reverse immediately; disabled/loading controls should remain still. Under reduced motion, scale must be absent while color/shadow feedback remains.
- **Done when**: one shared Button implementation controls press motion and the auth pages contain no one-off press-scale utilities.
