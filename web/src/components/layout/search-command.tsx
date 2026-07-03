import { useQuery } from "@tanstack/react-query"
import { useRouter } from "@tanstack/react-router"
import { Building2, Users } from "lucide-react"
import { useEffect, useState } from "react"

import {
  Command,
  CommandDialog,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { searchAll } from "@/server/search"

function useDebounced<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

export function SearchCommand({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const [q, setQ] = useState("")
  const debounced = useDebounced(q)
  const ready = debounced.trim().length >= 2

  const { data } = useQuery({
    queryKey: ["search", debounced],
    queryFn: () => searchAll({ data: { q: debounced } }),
    enabled: open && ready,
  })

  const karyawan = data?.karyawan ?? []
  const cabang = data?.cabang ?? []
  const empty = ready && karyawan.length === 0 && cabang.length === 0

  function go(to: string) {
    onOpenChange(false)
    setQ("")
    router.history.push(to)
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Pencarian"
      description="Cari karyawan atau cabang"
    >
      <Command shouldFilter={false}>
        <CommandInput
          placeholder="Cari karyawan atau cabang…"
          value={q}
          onValueChange={setQ}
        />
        <CommandList>
          {!ready && (
            <p className="py-6 text-center text-muted-foreground text-sm">
              Ketik minimal 2 huruf…
            </p>
          )}
          {empty && (
            <p className="py-6 text-center text-muted-foreground text-sm">
              Tidak ditemukan.
            </p>
          )}
          {karyawan.length > 0 && (
            <CommandGroup heading="Karyawan">
              {karyawan.map((k) => (
                <CommandItem
                  key={`k-${k.id}`}
                  value={`k-${k.id}`}
                  onSelect={() => go("/karyawan")}
                >
                  <Users />
                  <span>{k.nama}</span>
                  {k.jabatan && (
                    <span className="text-muted-foreground text-xs">
                      · {k.jabatan}
                    </span>
                  )}
                  {k.cabangKode && (
                    <span className="ml-auto text-muted-foreground text-xs">
                      {k.cabangKode}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {cabang.length > 0 && (
            <CommandGroup heading="Cabang">
              {cabang.map((c) => (
                <CommandItem
                  key={`c-${c.id}`}
                  value={`c-${c.id}`}
                  onSelect={() => go("/cabang")}
                >
                  <Building2 />
                  <span>
                    {c.kode} — {c.nama}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </Command>
    </CommandDialog>
  )
}
