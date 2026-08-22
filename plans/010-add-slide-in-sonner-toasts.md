# 010 — Add slide-in to Sonner toasts

- **Status**: DONE
- **Commit**: 47be59b
- **Severity**: LOW
- **Category**: Missed Opportunities
- **Estimated scope**: 1 file (sonner.tsx), ~3 lines changed

## Problem

Sonner toasts appear/disappear instantly with no spatial transition — misses the "spatially-connected UI with motion explaining where it came from" opportunity (AUDIT.md #8).

## Target

Toast classNames with enter/exit slide from right:

```tsx
toastOptions={{
  classNames: {
    toast: "cn-toast animate-in fade-in-0 slide-in-from-right-4 duration-fast ease-out animate-out fade-out-0 slide-out-to-right-4 duration-fast ease-out motion-reduce:animate-none",
  },
}}
```

## Verification

- Trigger any toast (success/error/warning) → slides in from right, fades in
- Dismiss toast → slides out to right, fades out
- Toggle reduced motion → no animation