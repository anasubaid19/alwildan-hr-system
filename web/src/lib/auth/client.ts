import { createAuthClient } from "better-auth/react"

// baseURL default = origin saat ini (same-origin dgn /api/auth).
export const authClient = createAuthClient()

export const { signIn, signUp, signOut, useSession } = authClient
