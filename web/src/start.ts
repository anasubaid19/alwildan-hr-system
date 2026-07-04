import { createCsrfMiddleware, createStart } from "@tanstack/react-start"

// Server function = endpoint RPC same-origin; tolak request cross-site.
// (Tanpa ini TanStack Start mencetak warning CSRF di setiap start dev.)
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
})

export const startInstance = createStart(() => ({
  requestMiddleware: [csrfMiddleware],
}))
