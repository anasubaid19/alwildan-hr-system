import { useEffect, useState } from "react"

/** Nilai ter-debounce: baru berubah setelah `delay` ms tanpa perubahan baru. */
export function useDebounced<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}
