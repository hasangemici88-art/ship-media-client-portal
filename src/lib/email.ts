type SendArgs = {
  to: string;
  toName?: string;
  subject: string;
  html: string;
  text: string;
};

/**
 * Brevo (Sendinblue) transactional email — used by the forgot-password
 * flow. Throws on any non-2xx so callers can surface a server error to
 * the user without leaking which email addresses are registered.
 */
export async function sendTransactionalEmail(args: SendArgs): Promise<{ messageId?: string }> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) throw new Error("BREVO_API_KEY is not configured.");

  const fromEmail = process.env.PORTAL_RESET_FROM_EMAIL || "no-reply@shipmediadigital.com";
  const fromName = process.env.PORTAL_RESET_FROM_NAME || "Ship Media Digital";

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      sender: { email: fromEmail, name: fromName },
      to: [{ email: args.to, name: args.toName || args.to }],
      subject: args.subject,
      htmlContent: args.html,
      textContent: args.text,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Brevo send failed (${res.status}): ${body}`);
  }

  const data = (await res.json().catch(() => ({}))) as { messageId?: string };
  return { messageId: data.messageId };
}
