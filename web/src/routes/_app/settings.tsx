import { createFileRoute } from "@tanstack/react-router"

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

export const Route = createFileRoute("/_app/settings")({
  component: SettingsPage,
})

function SettingsPage() {
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
            Endpoint kompatibel OpenAI. API key disimpan di server.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="base-url">Base URL</Label>
            <Input id="base-url" placeholder="https://api.openai.com/v1" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="api-key">API Key</Label>
            <Input id="api-key" type="password" placeholder="sk-…" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="model">Model</Label>
            <Input id="model" placeholder="gpt-4o-mini" />
          </div>
        </CardContent>
        <CardFooter className="justify-end gap-2">
          <Button variant="outline">Test Koneksi</Button>
          <Button>Simpan</Button>
        </CardFooter>
      </Card>
    </>
  )
}
