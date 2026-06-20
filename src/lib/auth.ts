import bcrypt from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
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

        const passwordMatches = await bcrypt.compare(password, user.passwordHash);
        if (!passwordMatches) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
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
