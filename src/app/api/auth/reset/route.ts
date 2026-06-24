import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { findConfiguredUser } from "@/lib/auth";
import {
  findUserByResetToken,
  sha256Hex,
  upsertPortalUserOverride,
} from "@/lib/portal-users";

const requestSchema = z.object({
  token: z.string().min(16),
  password: z.string().min(10).max(200),
});

export async function POST(request: Request) {
  let parsed: z.infer<typeof requestSchema>;
  try {
    parsed = requestSchema.parse(await request.json());
  } catch {
    return NextResponse.json(
      { message: "Password must be at least 10 characters." },
      { status: 400 },
    );
  }

  const tokenHash = await sha256Hex(parsed.token);
  const override = await findUserByResetToken(tokenHash);

  if (!override) {
    return NextResponse.json({ message: "This reset link is invalid." }, { status: 400 });
  }

  if (!override.reset_expires_ms || override.reset_expires_ms < Date.now()) {
    return NextResponse.json({ message: "This reset link has expired." }, { status: 400 });
  }

  // Reject tokens whose email is no longer in the active identity list —
  // a user removed from PORTAL_USERS_JSON should not be able to reactivate
  // their account via an old token.
  const identity = findConfiguredUser(override.email);
  if (!identity) {
    return NextResponse.json({ message: "This reset link is invalid." }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(parsed.password, 12);
  await upsertPortalUserOverride(identity.email, passwordHash, identity.name);

  return NextResponse.json({ ok: true });
}
