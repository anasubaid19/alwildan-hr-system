import { Resend } from "resend"

// Server-only. Pengiriman email transaksional via Resend.
// Tanpa RESEND_API_KEY (dev lokal): link dicetak ke console sebagai fallback.
const apiKey = process.env.RESEND_API_KEY
const from = process.env.EMAIL_FROM || "Al Wildan HR <onboarding@resend.dev>"

const resend = apiKey ? new Resend(apiKey) : null

export async function sendEmail(opts: {
  to: string
  subject: string
  text: string
}): Promise<void> {
  if (!resend) {
    console.log(
      `[EMAIL:DEV] RESEND_API_KEY belum di-set — email tidak terkirim.\n` +
        `  To: ${opts.to}\n  Subject: ${opts.subject}\n  ${opts.text}`
    )
    return
  }
  const { error } = await resend.emails.send({
    from,
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
  })
  if (error) {
    // Jangan bocorkan detail ke pemanggil (anti user-enumeration);
    // cukup log untuk operator.
    console.error(`[EMAIL] Gagal kirim ke ${opts.to}: ${error.message}`)
  }
}
