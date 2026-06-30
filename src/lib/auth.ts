import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { createAuthMiddleware, APIError } from "better-auth/api";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";

function normalizeUrl(url: string) {
  return url.replace(/\/$/, "");
}

function getAppBaseUrl() {
  const explicit = process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL;
  if (explicit && !explicit.includes("localhost")) {
    return normalizeUrl(explicit);
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return normalizeUrl(explicit ?? "http://localhost:3000");
}

function getTrustedOrigins() {
  const origins = new Set<string>([
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:*",
    "https://*.vercel.app",
  ]);

  for (const url of [
    process.env.BETTER_AUTH_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
    process.env.VERCEL_BRANCH_URL ? `https://${process.env.VERCEL_BRANCH_URL}` : undefined,
    process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : undefined,
  ]) {
    if (url) origins.add(normalizeUrl(url));
  }

  return [...origins];
}

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: getAppBaseUrl(),
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },
  user: {
    additionalFields: {
      isActive: {
        type: "boolean",
        defaultValue: true,
        fieldName: "is_active",
        input: false,
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },
  trustedOrigins: getTrustedOrigins(),
  hooks: {
    after: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/sign-in/email") return;

      const newSession = ctx.context.newSession;
      if (!newSession?.user) return;

      const isActive = (newSession.user as { isActive?: boolean }).isActive;
      if (isActive !== false) return;

      await ctx.context.internalAdapter.deleteSession(newSession.session.token);
      throw new APIError("FORBIDDEN", {
        message: "Your account has been deactivated. Contact admin.",
      });
    }),
  },
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
