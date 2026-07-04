import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { admin } from "better-auth/plugins/admin"
import { adminAc, userAc } from "better-auth/plugins/admin/access"
import { count } from "drizzle-orm"

import { db } from "../db"
import { user as userTable } from "../db/schema"

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url }) => {
      // DEV: log link reset ke console (seperti sistem lama). PROD: kirim email.
      console.log(`[BETTER-AUTH] Reset password ${user.email}: ${url}`)
    },
  },
  plugins: [
    admin({
      // RBAC app: super_admin (kelola user) > admin > staff.
      defaultRole: "staff",
      adminRoles: ["super_admin"],
      roles: { super_admin: adminAc, admin: userAc, staff: userAc },
    }),
  ],
  databaseHooks: {
    user: {
      create: {
        // Bootstrap: user pertama yang mendaftar menjadi super_admin.
        before: async (u) => {
          const [row] = await db.select({ c: count() }).from(userTable)
          const isFirst = (row?.c ?? 0) === 0
          return { data: { ...u, role: isFirst ? "super_admin" : "staff" } }
        },
      },
    },
  },
})
