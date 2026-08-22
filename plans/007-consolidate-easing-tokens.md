# 007 — Consolidate easing tokens to strong curves

- **Status**: TODO
- **Commit**: 47be59b
- **Severity**: MEDIUM
- **Category**: Easing & Duration
- **Estimated scope**: 1 file (styles.css), ~5 lines changed

## Problem

Three easing tokens defined but weak/default curve used inconsistently:

```css
/* web/src/styles.css:118-120 — current */
--motion-ease-default: cubic-bezier(0.4, 0, 0.2, 1);      /* Material-ish, weak for UI */
--motion-ease-out: cubic-bezier(0.23, 1, 0.32, 1);        /* strong ease-out for UI (AUDIT.md) */
--motion-ease-entrance: cubic-bezier(0, 0.55, 0.45, 1);   /* iOS-like entrance */
```

Issues:
1. `--motion-ease-default` is weak (Material default) — AUDIT.md: "Built-in CSS easings are too weak for deliberate motion; plans should introduce strong custom curves"
2. `--motion-ease-out` (strong) exists but NOT used anywhere — components use Tailwind's `ease-out` (`cubic-bezier(0, 0, 0.2, 1)`) instead
3. No token for `ease-in-out` (on-screen movement) — AUDIT.md recommends `--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1)`

## Target

```css
/* web/src/styles.css:118-120 — target */
--motion-ease-out: cubic-bezier(0.23, 1, 0.32, 1);        /* strong ease-out for UI entrances/exits */
--motion-ease-entrance: cubic-bezier(0, 0.55, 0.45, 1);   /* iOS-like staged entrance */
--motion-ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);    /* strong ease-in-out for on-screen movement */
```

Changes:
- Remove `--motion-ease-default`
- Add `--motion-ease-in-out` per AUDIT.md
- Update `@theme inline` to expose new token

```css
/* web/src/styles.css:63-66 — add */
--ease-out: var(--motion-ease-out);
--ease-entrance: var(--motion-ease-entrance);
--ease-in-out: var(--motion-ease-in-out);
```

## Repo conventions to follow

- Tokens defined in `:root` block, exposed via `@theme inline` for Tailwind
- Components currently use Tailwind `ease-out`, `ease-in-out`, `ease` — should migrate to `ease-out` → `ease-[--ease-out]` etc. but that's a separate migration; this plan only fixes tokens
- Exemplar: `web/src/components/ui/alert-dialog.tsx:54` uses `ease-out` (Tailwind) — should use strong token

## Steps

1. Edit `web/src/styles.css:118-120`: replace three lines with target three lines
2. Edit `web/src/styles.css:63-66`: add three `--ease-*` mappings in `@theme inline`
3. Run `cd web && bun run typecheck && bun run check`
4. Feel-check: no visual change yet (components still use Tailwind easings), but tokens ready for migration

## Boundaries

- Do NOT migrate component `ease-*` classes to new tokens — separate plan
- Do NOT change durations
- Do NOT touch other files

## Verification

- **Mechanical**: `cd web && bun run typecheck && bun run check` — both pass
- **Feel check**: no visual change expected (tokens not yet used)
- **Done when**: typecheck + lint pass, tokens defined and exposed