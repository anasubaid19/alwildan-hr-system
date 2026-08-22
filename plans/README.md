# Animation implementation plans

| # | Plan | Severity | Status |
| --- | --- | --- | --- |
| 001 | [Disable command palette motion](001-disable-command-palette-motion.md) | HIGH | DONE |
| 002 | [Rebuild overlay motion with interruptible transitions](002-rebuild-overlay-motion.md) | HIGH | DONE |
| 003 | [Honor reduced motion across shared UI](003-honor-reduced-motion.md) | MEDIUM | DONE |
| 004 | [Move dashboard progress to the compositor](004-optimize-dashboard-progress.md) | MEDIUM | DONE |
| 005 | [Unify button press feedback](005-unify-button-feedback.md) | MEDIUM | DONE |
| 006 | [Reduce Button transitions to GPU-only properties](006-reduce-button-transitions-gpu.md) | HIGH | DONE |
| 007 | [Consolidate easing tokens to strong curves](007-consolidate-easing-tokens.md) | MEDIUM | DONE |
| 008 | [Fix reduced-motion on Button color/shadow transitions](008-fix-reduced-motion-button.md) | MEDIUM | DONE |
| 009 | [Add entrance to System second confirmation card](009-add-entrance-system-card.md) | LOW | DONE |
| 010 | [Add slide-in to Sonner toasts](010-add-slide-in-sonner-toasts.md) | LOW | DONE |

## Recommended execution order

1. Plan 002 establishes the strong `ease-out` token and shared overlay transition pattern.
2. Plan 001 opts the high-frequency command palette out of the dialog motion.
3. Plan 003 adds reduced-motion outcomes to the shared motion created by plan 002.
4. Plan 004 moves dashboard progress to transform and consumes the token from plan 002.
5. Plan 005 centralizes button feedback and consumes the same easing token.
6. Plan 006 reduces high-frequency Button transitions to GPU-only (transform + opacity).
7. Plan 007 consolidates easing tokens (adds strong `ease-in-out`, removes weak default).
8. Plan 008 fixes Button reduced-motion to drop all transitions (depends on 006).
9. Plan 009 adds entrance animation to System page second card (independent).
10. Plan 010 adds slide-in/out to Sonner toasts (independent).

## Dependencies

- Plan 001 can run independently but should be verified after plan 002.
- Plans 003, 004, and 005 depend on the `ease-out` token exposed by plan 002.
- Plan 008 depends on Plan 006 (same file, same line).
- Plans 009 and 010 are independent additive improvements.