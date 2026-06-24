import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * D1 password-override store that backs the forgot/reset-password flow.
 *
 * Identity (who exists, what role they have) lives in PORTAL_USERS_JSON
 * — see src/lib/auth.ts. This module only stores the bits that have to
 * change at runtime: the user's current password hash and the active
 * reset token. Rows here only exist after a forgot-password request.
 */

type D1Like = {
  prepare: (query: string) => {
    bind: (...args: unknown[]) => {
      run: () => Promise<{ meta: { changes: number } }>;
      first: <T = unknown>() => Promise<T | null>;
    };
    first: <T = unknown>() => Promise<T | null>;
  };
};

export type PortalUserOverride = {
  email: string;
  password_hash: string;
  name: string;
  reset_token_hash: string | null;
  reset_expires_ms: number | null;
};

function getDb(): D1Like | null {
  try {
    const { env } = getCloudflareContext();
    const db = (env as unknown as { DB?: D1Like }).DB;
    return db ?? null;
  } catch {
    return null;
  }
}

export async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function generateResetToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function getPortalUserOverride(
  email: string,
): Promise<PortalUserOverride | null> {
  const db = getDb();
  if (!db) return null;
  return db
    .prepare(
      "SELECT email, password_hash, name, reset_token_hash, reset_expires_ms FROM portal_users WHERE email = ?",
    )
    .bind(email.toLowerCase())
    .first<PortalUserOverride>();
}

export async function upsertPortalUserOverride(
  email: string,
  passwordHash: string,
  name: string,
): Promise<void> {
  const db = getDb();
  if (!db) throw new Error("Database unavailable.");
  await db
    .prepare(
      `INSERT INTO portal_users (email, password_hash, name, reset_token_hash, reset_expires_ms, updated_at)
       VALUES (?, ?, ?, NULL, NULL, datetime('now'))
       ON CONFLICT(email) DO UPDATE SET
         password_hash = excluded.password_hash,
         name = excluded.name,
         reset_token_hash = NULL,
         reset_expires_ms = NULL,
         updated_at = datetime('now')`,
    )
    .bind(email.toLowerCase(), passwordHash, name)
    .run();
}

export async function setResetToken(
  email: string,
  name: string,
  bootstrapPasswordHash: string,
  tokenHash: string,
  expiresMs: number,
): Promise<void> {
  const db = getDb();
  if (!db) throw new Error("Database unavailable.");
  await db
    .prepare(
      `INSERT INTO portal_users (email, password_hash, name, reset_token_hash, reset_expires_ms, updated_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(email) DO UPDATE SET
         reset_token_hash = excluded.reset_token_hash,
         reset_expires_ms = excluded.reset_expires_ms,
         updated_at = datetime('now')`,
    )
    .bind(email.toLowerCase(), bootstrapPasswordHash, name, tokenHash, expiresMs)
    .run();
}

export async function findUserByResetToken(
  tokenHash: string,
): Promise<PortalUserOverride | null> {
  const db = getDb();
  if (!db) return null;
  return db
    .prepare(
      "SELECT email, password_hash, name, reset_token_hash, reset_expires_ms FROM portal_users WHERE reset_token_hash = ?",
    )
    .bind(tokenHash)
    .first<PortalUserOverride>();
}
