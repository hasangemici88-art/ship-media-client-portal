import { NextResponse } from "next/server";
import { z } from "zod";
import { findConfiguredUser } from "@/lib/auth";
import { sendTransactionalEmail } from "@/lib/email";
import { generateResetToken, setResetToken, sha256Hex } from "@/lib/portal-users";

const requestSchema = z.object({
  email: z.string().email(),
});

const TOKEN_TTL_MS = 30 * 60 * 1000;

export async function POST(request: Request) {
  let parsed: z.infer<typeof requestSchema>;
  try {
    parsed = requestSchema.parse(await request.json());
  } catch {
    // Always-ok response to avoid leaking whether an email is registered.
    return NextResponse.json({ ok: true });
  }

  const requested = parsed.email.toLowerCase().trim();
  const user = findConfiguredUser(requested);

  if (!user) {
    return NextResponse.json({ ok: true });
  }

  const rawToken = generateResetToken();
  const tokenHash = await sha256Hex(rawToken);
  const expiresMs = Date.now() + TOKEN_TTL_MS;

  try {
    await setResetToken(user.email, user.name, user.passwordHash, tokenHash, expiresMs);
  } catch (error) {
    console.error("setResetToken failed", error);
    return NextResponse.json({ message: "Could not start reset." }, { status: 500 });
  }

  const baseUrl =
    process.env.NEXTAUTH_URL?.replace(/\/$/, "") || "https://shipmediadigital.com";
  const resetUrl = `${baseUrl}/reset-password?token=${rawToken}`;

  try {
    await sendTransactionalEmail({
      to: user.email,
      toName: user.name,
      subject: "Reset your Ship Media Digital portal password",
      html: `
        <div style="font-family:system-ui,Segoe UI,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#0f172a">
          <h2 style="margin:0 0 16px">Reset your portal password</h2>
          <p>We received a request to reset the password for <strong>${user.email}</strong>.</p>
          <p>This link expires in 30 minutes:</p>
          <p style="margin:24px 0">
            <a href="${resetUrl}"
               style="display:inline-block;padding:12px 20px;background:#0f172a;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
              Reset password
            </a>
          </p>
          <p style="font-size:13px;color:#475569">If the button doesn't work, paste this URL into your browser:<br/>
            <span style="word-break:break-all">${resetUrl}</span>
          </p>
          <p style="font-size:13px;color:#475569">If you did not request this, you can safely ignore this email.</p>
        </div>
      `,
      text: `Reset your Ship Media Digital portal password.\n\nOpen this link (expires in 30 minutes):\n${resetUrl}\n\nIf you did not request this, ignore this email.`,
    });
  } catch (error) {
    console.error("Brevo send failed", error);
    return NextResponse.json({ message: "Could not send reset email." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
