// Pluggable transactional mailer.
//
// With RESEND_API_KEY set, sends via Resend's HTTP API (raw fetch — no SDK, in
// keeping with the project's dependency diet). WITHOUT it — local dev, or
// before any provider is wired — it logs the message to the server console, so
// the verification/reset links are usable end-to-end with ZERO external setup.
// Swap RESEND for SES/Postmark by changing only this file.
//
// Email is best-effort: a send failure is logged, never thrown, so a degraded
// mail provider can't 500 the signup/reset flow (the token still exists; the
// user can re-request).
type Mail = { to: string; subject: string; text: string };

export async function sendMail({ to, subject, text }: Mail): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log(
      `\n──── [mail:dev] ───────────────────────────────\n` +
        `to:      ${to}\nsubject: ${subject}\n\n${text}\n` +
        `───────────────────────────────────────────────\n`,
    );
    return;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.MAIL_FROM ?? "Leaflet <onboarding@resend.dev>",
        to,
        subject,
        text,
      }),
    });
    if (!res.ok) {
      console.error(`[mail] send failed: ${res.status} ${await res.text().catch(() => "")}`);
    }
  } catch (e) {
    console.error("[mail] send threw", e);
  }
}
