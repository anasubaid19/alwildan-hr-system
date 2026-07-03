import { createFileRoute } from "@tanstack/react-router"
import { UploadCloud } from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { Card, CardContent } from "@/components/ui/card"

export const Route = createFileRoute("/_app/upload")({
  component: UploadPage,
})

function UploadPage() {
  return (
    <>
      <PageHeader
        title="Upload"
        description="Impor file Excel cabang dengan pemetaan kolom berbantuan AI."
      />
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-primary/30 border-dashed bg-primary/5 py-16 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <UploadCloud className="size-6" />
            </div>
            <div>
              <p className="font-medium text-sm">
                Seret & letakkan file Excel di sini
              </p>
              <p className="text-muted-foreground text-sm">
                atau klik untuk memilih file (.xlsx, maks 10MB)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  )
}
