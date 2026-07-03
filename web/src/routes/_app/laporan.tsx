import { createFileRoute } from "@tanstack/react-router"
import { FileText } from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

export const Route = createFileRoute("/_app/laporan")({
  component: LaporanPage,
})

function LaporanPage() {
  return (
    <>
      <PageHeader
        title="Laporan"
        description="Preview & export laporan penggajian (XLSX, CSV, PDF)."
      />
      <Empty className="rounded-xl border border-dashed py-16">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FileText />
          </EmptyMedia>
          <EmptyTitle>Belum ada laporan</EmptyTitle>
          <EmptyDescription>
            Pilih periode untuk membuat preview laporan penggajian.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    </>
  )
}
