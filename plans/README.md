# Animation implementation plans

| # | Plan | Severity | Status |
| --- | --- | --- | --- |
| 001 | [Disable command palette motion](001-disable-command-palette-motion.md) | HIGH | DONE |
| 002 | [Rebuild overlay motion with interruptible transitions](002-rebuild-overlay-motion.md) | HIGH | DONE |
| 003 | [Honor reduced motion across shared UI](003-honor-reduced-motion.md) | MEDIUM | DONE |
| 004 | [Move dashboard progress to the compositor](004-optimize-dashboard-progress.md) | MEDIUM | DONE |
| 005 | [Unify button press feedback](005-unify-button-feedback.md) | MEDIUM | DONE |

## Recommended execution order

1. Plan 002 establishes the strong `ease-out` token and shared overlay transition pattern.
2. Plan 001 opts the high-frequency command palette out of the dialog motion.
3. Plan 003 adds reduced-motion outcomes to the shared motion created by plan 002.
4. Plan 004 moves dashboard progress to transform and consumes the token from plan 002.
5. Plan 005 centralizes button feedback and consumes the same easing token.

## Dependencies

- Plan 001 can run independently but should be verified after plan 002.
- Plans 003, 004, and 005 depend on the `ease-out` token exposed by plan 002.
