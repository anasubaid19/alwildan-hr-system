"use client"

import { Send, Sparkles, X } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { ConcentricRing } from "@/components/ui/concentric-ring"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { hasAtLeast } from "@/lib/auth/roles"
import { useAppRole } from "@/lib/auth/use-app-role"
import { askAi } from "@/server/asisten"

type Msg = { id: string; role: "user" | "assistant"; content: string }

const SUGGESTIONS = [
  "Berapa total gaji bruto Mei 2026?",
  "Cabang mana gaji diterima terbesar?",
  "Berapa karyawan aktif saat ini?",
]

export function AiChat() {
  const role = useAppRole()
  if (!hasAtLeast(role, "admin")) return null
  return <AiChatInner />
}

function AiChatInner() {
  const [open, setOpen] = useState(false)
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 200)
  }, [open])

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll on new message/loading
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    })
  }, [msgs, loading])

  async function send(text = input) {
    const q = text.trim()
    if (!q || loading) return
    const userMsg: Msg = { id: `u-${Date.now()}`, role: "user", content: q }
    const history = msgs.map((m) => ({ role: m.role, content: m.content }))
    setMsgs((prev) => [...prev, userMsg])
    setInput("")
    setLoading(true)
    try {
      const res = await askAi({ data: { question: q, history } })
      setMsgs((prev) => [
        ...prev,
        { id: `a-${Date.now()}`, role: "assistant", content: res.answer },
      ])
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Gagal menghubungi AI"
      toast.error(msg)
      setMsgs((prev) => [
        ...prev,
        { id: `a-${Date.now()}`, role: "assistant", content: `Gagal: ${msg}` },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        type="button"
        aria-label="Buka Asisten AI"
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 z-40 flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-[scale,opacity] hover:bg-primary/90 active:scale-95 md:bottom-6 md:right-6"
      >
        <Sparkles className="size-5" />
      </button>

      <Drawer
        direction="right"
        open={open}
        onOpenChange={setOpen}
        repositionInputs={false}
      >
        <DrawerContent className="flex h-full max-h-none flex-col p-0 [&::before]:!inset-0 [&::before]:!rounded-none data-[vaul-drawer-direction=right]:!w-full data-[vaul-drawer-direction=right]:!max-w-none data-[vaul-drawer-direction=right]:sm:!w-[400px] data-[vaul-drawer-direction=right]:sm:!max-w-[400px]">
          <DrawerHeader className="shrink-0 border-b pb-3 text-left">
            <DrawerTitle className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Sparkles className="size-3.5" />
              </span>
              Asisten AI
              <span className="text-xs font-normal text-muted-foreground">
                HR AL-WILDAN
              </span>
              <DrawerClose className="ml-auto flex size-7 items-center justify-center rounded-full hover:bg-accent">
                <X className="size-4" />
              </DrawerClose>
            </DrawerTitle>
          </DrawerHeader>

          <div ref={scrollRef} className="min-h-0 flex-1 overflow-auto p-4">
            {msgs.length === 0 ? (
              <div className="flex flex-col gap-3 py-6">
                <p className="text-center text-sm text-muted-foreground">
                  Tanya seputar karyawan, cabang, dan gaji. Contoh:
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => send(s)}
                      className="rounded-full border bg-popover px-3 py-1.5 text-xs hover:bg-accent"
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-center text-[11px] text-muted-foreground">
                  Jawaban berdasarkan data terbaru di sistem.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {msgs.map((m) => (
                  <div
                    key={m.id}
                    className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed break-words whitespace-pre-wrap ${
                        m.role === "user"
                          ? "bg-primary text-primary-foreground rounded-br-md"
                          : "bg-muted text-foreground rounded-bl-md"
                      }`}
                    >
                      {m.content}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="flex items-center gap-3 rounded-2xl rounded-bl-md bg-muted px-3.5 py-2.5 text-sm">
                      <ConcentricRing className="size-5" />
                      Menjawab…
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="shrink-0 border-t bg-popover p-3">
            <div className="flex items-end gap-2">
              <Textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    send()
                  }
                }}
                placeholder="Tanya sesuatu…"
                rows={1}
                className="min-h-10 max-h-24 resize-none"
                disabled={loading}
              />
              <Button
                size="icon"
                onClick={() => send()}
                disabled={!input.trim() || loading}
                aria-label="Kirim"
                className="size-10 shrink-0 rounded-full"
              >
                {loading ? (
                  <Spinner className="size-4" />
                ) : (
                  <Send className="size-4" />
                )}
              </Button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  )
}
