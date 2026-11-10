import { Resend } from "resend";

// Transactional email through Resend. Server-only: never import this from a
// client component (it reads RESEND_API_KEY).
//
// Env:
//   RESEND_API_KEY  API key from resend.com
//   MAIL_FROM       sender on a domain verified in Resend,
//                   e.g. "Tabuleiro <no-reply@tu-dominio.com>"
//
// Without them, development logs the email to the terminal instead of sending
// it (so the team can work without a key) and production fails closed.

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
  // Resend ignores a repeated send with the same key for 24 h, so retries
  // after a timeout do not deliver the same email twice.
  idempotencyKey?: string;
};

export type SendEmailResult =
  | { ok: true; id: string | null }
  | { ok: false; reason: "NOT_CONFIGURED" | "SEND_FAILED" };

let client: { apiKey: string; resend: Resend } | null = null;

function getResend(apiKey: string): Resend {
  if (client?.apiKey !== apiKey)
    client = { apiKey, resend: new Resend(apiKey) };
  return client.resend;
}

export async function sendEmail(
  message: EmailMessage,
): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM;

  if (!apiKey || !from) {
    if (process.env.NODE_ENV !== "production") {
      console.info(
        `[email:dev] RESEND_API_KEY/MAIL_FROM not set, not sending.\n` +
          `To: ${message.to}\nSubject: ${message.subject}\n\n${message.text}`,
      );
      return { ok: true, id: null };
    }
    console.error("[email] RESEND_API_KEY or MAIL_FROM is not set");
    return { ok: false, reason: "NOT_CONFIGURED" };
  }

  try {
    const { data, error } = await getResend(apiKey).emails.send(
      {
        from,
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
      },
      message.idempotencyKey
        ? { idempotencyKey: message.idempotencyKey }
        : undefined,
    );
    if (error) {
      console.error("[email] Resend rejected the email:", error.name);
      return { ok: false, reason: "SEND_FAILED" };
    }
    return { ok: true, id: data?.id ?? null };
  } catch (error) {
    console.error("[email] Resend request failed:", error);
    return { ok: false, reason: "SEND_FAILED" };
  }
}

// Escape user-provided values (names, team names) before putting them in an
// email's HTML.
export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
