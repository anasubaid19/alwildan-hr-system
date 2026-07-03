import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { useEffect, useState } from "react"
import { toast } from "sonner"

import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Spinner } from "@/components/ui/spinner"
import { API_KEY_MASK } from "@/lib/ai-constants"
import {
  fetchAiModels,
  getAiSettings,
  saveAiSettings,
  testAiConnection,
} from "@/server/settings"

export const Route = createFileRoute("/_app/settings")({
  component: SettingsPage,
})

function SettingsPage() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ["ai-settings"],
    queryFn: () => getAiSettings(),
  })

  const [baseUrl, setBaseUrl] = useState("")
  const [apiKey, setApiKey] = useState("")
  const [model, setModel] = useState("")
  const [models, setModels] = useState<string[]>([])

  // Isi form dari data tersimpan (sekali saat load).
  useEffect(() => {
    if (data) {
      setBaseUrl(data.baseUrl)
      setModel(data.model)
    }
  }, [data])

  const saveMut = useMutation({
    mutationFn: () => saveAiSettings({ data: { baseUrl, apiKey, model } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai-settings"] })
      setApiKey("")
      toast.success("Setting AI disimpan")
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const testMut = useMutation({
    mutationFn: () => testAiConnection({ data: { baseUrl, apiKey, model } }),
    onSuccess: (res) =>
      res.ok ? toast.success(res.message) : toast.error(res.message),
    onError: (err: Error) => toast.error(err.message),
  })

  const modelsMut = useMutation({
    mutationFn: () => fetchAiModels({ data: { baseUrl, apiKey } }),
    onSuccess: (list) => {
      setModels(list)
      if (list.length === 0) toast.info("Tidak ada model dari provider")
      else toast.success(`${list.length} model ditemukan`)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  return (
    <>
      <PageHeader
        title="Settings"
        description="Konfigurasi penyedia AI untuk pemetaan kolom upload."
      />
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>AI Provider</CardTitle>
          <CardDescription>
            Endpoint kompatibel OpenAI (mis. Groq, OpenAI, Ollama). API key
            disimpan di server dan tidak ditampilkan kembali.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="base-url">Base URL</Label>
            <Input
              id="base-url"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://api.groq.com/openai/v1"
              disabled={isLoading}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="api-key">API Key</Label>
            <Input
              id="api-key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={data?.hasApiKey ? API_KEY_MASK : "sk-… / gsk_…"}
              disabled={isLoading}
            />
            <p className="text-muted-foreground text-xs">
              {data?.hasApiKey
                ? "Sudah tersimpan. Kosongkan untuk membiarkannya."
                : "Belum ada API key tersimpan."}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="model">Model</Label>
            <div className="flex gap-2">
              <Input
                id="model"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="llama-3.3-70b-versatile"
                disabled={isLoading}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => modelsMut.mutate()}
                disabled={modelsMut.isPending}
              >
                {modelsMut.isPending ? <Spinner /> : null} Ambil
              </Button>
            </div>
            {models.length > 0 && (
              <NativeSelect
                className="w-full"
                value={models.includes(model) ? model : ""}
                onChange={(e) => setModel(e.target.value)}
                aria-label="Pilih model"
              >
                <NativeSelectOption value="">Pilih model…</NativeSelectOption>
                {models.map((m) => (
                  <NativeSelectOption key={m} value={m}>
                    {m}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            )}
          </div>
        </CardContent>
        <CardFooter className="justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => testMut.mutate()}
            disabled={testMut.isPending}
          >
            {testMut.isPending ? <Spinner /> : null} Test Koneksi
          </Button>
          <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
            {saveMut.isPending ? <Spinner /> : null} Simpan
          </Button>
        </CardFooter>
      </Card>
    </>
  )
}
