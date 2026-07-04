import { createFileRoute } from "@tanstack/react-router"

import { auth } from "@/lib/auth/server"

// Semua endpoint Better Auth di /api/auth/* ditangani handler-nya.
export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: ({ request }) => auth.handler(request),
      POST: ({ request }) => auth.handler(request),
    },
  },
})
