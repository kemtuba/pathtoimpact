// Relative imports on purpose: the `auth` CLI (npx auth generate) loads this file
// through jiti and does not resolve the tsconfig "@/*" alias.
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { Resend } from "resend";
import { db } from "./db";
import * as schema from "./auth-schema";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema }),
  emailAndPassword: {
    enabled: true,
    // Invite-only pilot, decision 4: nobody signs up from the public site.
    // WS1 adds operator-created accounts and the invite token.
    disableSignUp: true,
    requireEmailVerification: true,
  },
  emailVerification: {
    sendOnSignUp: true,
    async sendVerificationEmail({ user, url }) {
      // Constructed per call: `new Resend()` throws without a key, which must
      // not happen at module load (build time).
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: process.env.EMAIL_FROM ?? "Path to Impact <no-reply@pathtoimpact.us>",
        to: user.email,
        subject: "Verify your email for Path to Impact",
        text: `Open this link to verify your email: ${url}`,
      });
    },
  },
  // nextCookies must be the last plugin (better-auth warns otherwise).
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
