import bcrypt from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { getPortalUserOverride } from "./portal-users";
import { PortalUser, UserRole } from "./types";

type ConfiguredUser = PortalUser & {
  passwordHash: string;
};

function authIsConfigured() {
  return getConfiguredUsers().length > 0;
}

function normalizeRole(value: unknown): UserRole {
  return value === "Customer" ? "Customer" : "Owner";
}

function getConfiguredUsers(): ConfiguredUser[] {
  const usersJson = process.env.PORTAL_USERS_JSON;
  if (usersJson) {
    try {
      const parsed = JSON.parse(usersJson) as Array<Record<string, unknown>>;
      return parsed
        .map((item) => ({
          id: String(item.id || item.email || crypto.randomUUID()),
          email: String(item.email || "").toLowerCase().trim(),
          name: String(item.name || item.email || "Portal user"),
          role: normalizeRole(item.role),
          passwordHash: String(item.passwordHash || ""),
        }))
        .filter((item) => item.email && item.passwordHash);
    } catch {
      return [];
    }
  }

  const legacyEmail = process.env.PORTAL_ADMIN_EMAIL?.toLowerCase().trim();
  const legacyHash = process.env.PORTAL_PASSWORD_HASH;
  if (!legacyEmail || !legacyHash) return [];

  return [
    {
      id: "ship-media-digital-owner",
      email: legacyEmail,
      name: process.env.PORTAL_ADMIN_NAME || "Ship Media Digital",
      role: "Owner",
      passwordHash: legacyHash,
    },
  ];
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 8,
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Ship Media Digital Portal",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!authIsConfigured()) {
          return null;
        }

        const email = credentials?.email?.toLowerCase().trim();
        const password = credentials?.password || "";
        const user = getConfiguredUsers().find((item) => item.email === email);

        if (!email || !user) {
          return null;
        }

        // Identity (id, email, role) always flows from PORTAL_USERS_JSON.
        // Password and display name can be overridden by a D1 row written
        // by the forgot/reset-password flow — that's what lets users change
        // their password without redeploying.
        const override = await getPortalUserOverride(email).catch(() => null);
        const effectiveHash = override?.password_hash || user.passwordHash;
        const effectiveName = override?.name || user.name;

        const passwordMatches = await bcrypt.compare(password, effectiveHash);
        if (!passwordMatches) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: effectiveName,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.name = user.name;
        token.email = user.email;
        token.role = (user as PortalUser).role;
      }

      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.name = token.name;
        session.user.email = token.email;
        session.user.role = token.role as UserRole;
      }

      return session;
    },
  },
};

export { authIsConfigured };

/**
 * Public lookup for the JSON identity list. The forgot/reset routes use
 * this so they treat PORTAL_USERS_JSON as the single source of truth for
 * "is this email a portal user, and what role do they have?".
 */
export function findConfiguredUser(email: string): ConfiguredUser | undefined {
  const normalized = email.toLowerCase().trim();
  return getConfiguredUsers().find((item) => item.email === normalized);
}
