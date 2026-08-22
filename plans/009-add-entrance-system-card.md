# 009 — Add entrance to System second confirmation card

- **Status**: DONE
- **Commit**: 47be59b
- **Severity**: LOW
- **Category**: Missed Opportunities
- **Estimated scope**: 1 file (system.tsx), ~4 lines changed

## Problem

Second confirmation card on System page appears via conditional render (`{showDialog && code && (`) with no entrance animation — it pops in abruptly.

## Target

Wrapper div with `tw-animate-css` entrance utilities:

```tsx
{showDialog && code && (
  <div data-state="open" className="animate-in fade-in-0 slide-in-from-bottom-2 duration-fast ease-out motion-reduce:animate-none">
    <Card className="border-primary/20 bg-primary/5">
    ...
    </Card>
  </div>
)}
```

## Verification

- Trigger delete flow → click "Hapus Seluruh Data" → code appears → second card slides up + fades in
- Toggle reduced motion → card appears instantly