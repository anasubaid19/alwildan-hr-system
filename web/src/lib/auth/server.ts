import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { admin } from "better-auth/plugins/admin"
import { adminAc, userAc } from "better-auth/plugins/admin/access"
import { count } from "drizzle-orm"

import { db } from "../db"
import { user as userTable } from "../db/schema"
import { sendEmail } from "../email"

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),
  // Origin baseURL (BETTER_AUTH_URL) otomatis dipercaya. Tambahan di bawah:
  // varian loopback yang setara — browser (mis. Firefox) yang membuka app
  // via 127.0.0.1/[::1] mengirim Origin itu dan ditolak "INVALID_ORIGIN".
  trustedOrigins: [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://[::1]:3000",
  ],
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Reset password akun Al Wildan HR",
        text:
          `Halo ${user.name || user.email},\n\n` +
          `Klik tautan berikut untuk mengatur ulang password Anda ` +
          `(berlaku 1 jam):\n${url}\n\n` +
          `Abaikan email ini jika Anda tidak meminta reset password.`,
      })
    },
    // Amankan sesi lama begitu password diganti.
    revokeSessionsOnPasswordReset: true,
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
