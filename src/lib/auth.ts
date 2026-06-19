import bcrypt from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

function authIsConfigured() {
  return Boolean(
    (process.env.PORTAL_ADMIN_USERNAME || process.env.PORTAL_ADMIN_EMAIL) &&
      process.env.PORTAL_PASSWORD_HASH,
  );
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
        email: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!authIsConfigured()) {
          return null;
        }

        const login = credentials?.email?.toLowerCase().trim();
        const password = credentials?.password || "";
        const allowedUsername = process.env.PORTAL_ADMIN_USERNAME?.toLowerCase();
        const allowedEmail = process.env.PORTAL_ADMIN_EMAIL?.toLowerCase();
        const passwordHash = process.env.PORTAL_PASSWORD_HASH;
        const loginMatches = allowedUsername
          ? login === allowedUsername
          : login === allowedEmail;

        if (!login || !passwordHash || !loginMatches) {
          return null;
        }

        const passwordMatches = await bcrypt.compare(password, passwordHash);
        if (!passwordMatches) {
          return null;
        }

        return {
          id: "ship-media-digital-owner",
          email: allowedEmail || `${allowedUsername}@shipmediadigital.com`,
          name: process.env.PORTAL_ADMIN_NAME || "Ship Media Digital",
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.name = user.name;
        token.email = user.email;
      }

      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.name = token.name;
        session.user.email = token.email;
      }

      return session;
    },
  },
};

export { authIsConfigured };
