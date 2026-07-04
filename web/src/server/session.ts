import { createServerFn } from "@tanstack/react-start"

import { getCurrentUser } from "@/lib/auth"

/** User sesi aktif (atau null) — untuk guard beforeLoad route. */
export const getSessionUser = createServerFn().handler(async () =>
  getCurrentUser()
)
