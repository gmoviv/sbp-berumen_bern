
import { verifyOtp } from "./totp";
import bcrypt from "bcryptjs";
import NextAuth, { CredentialsSignin } from "next-auth";
import PostgresAdapter from "@auth/pg-adapter";
import Credentials from "next-auth/providers/credentials";
import { db } from "./clients";
import { normalizeLocale } from "./i18n/config";
import {
  completeChallenge,
  issueChallenge,
  validateChallenge,
} from "./twofa-challenge";

class TwoFactorRequiredError extends CredentialsSignin {
  code = "2fa_required";
}

class TwoFactorStateError extends CredentialsSignin {
  // Surfaces inconsistent 2FA state (C6) so an admin can re-enroll the user.
  code = "2fa_state_invalid";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PostgresAdapter(db),
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user?.id) {
        token.id = user.id;
      }

      if ((user || trigger === "update" || token.two_factor_enabled === undefined) && token.id) {
        const permissionsResult = await db.query(
          `SELECT r.name as role, a.name as app, up."personaId", u.two_factor_enabled, u.locale
           FROM users u
           LEFT JOIN user_roles ur ON u.id = ur."userId"
           LEFT JOIN roles r ON ur."roleId" = r.id
           LEFT JOIN role_applications ra ON r.id = ra."roleId"
           LEFT JOIN applications a ON ra."applicationId" = a.id
           LEFT JOIN user_personas up ON u.id = up."userId"
           WHERE u.id = $1`,
          [token.id]
        );

        token.roles = [...new Set(permissionsResult.rows.map(r => r.role).filter(Boolean))];
        token.apps = [...new Set(permissionsResult.rows.map(r => r.app).filter(Boolean))];
        token.personas = [...new Set(permissionsResult.rows.map(r => r.personaId).filter(Boolean))];
        token.two_factor_enabled = Boolean(permissionsResult.rows[0]?.two_factor_enabled);
        token.locale = normalizeLocale(permissionsResult.rows[0]?.locale);
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
        session.user.roles = token.roles as string[] | undefined;
        session.user.apps = token.apps as string[] | undefined;
        session.user.personas = token.personas as string[] | undefined;
        session.user.two_factor_enabled = token.two_factor_enabled as boolean | undefined;
        session.user.locale = token.locale as "es-MX" | "en-US" | undefined;
      }
      return session;
    },
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email" },
        password: { label: "Password" },
        twoFaCode: { label: "2FA Code" },
        is2fa: { label: "Is 2FA" },
      },
      async authorize(credentials) {
        const { email, password, twoFaCode, is2fa } = credentials;

        // ---- Step 2: TOTP verification ----
        // The client claims `is2fa: true` but we never trust that flag alone (C1).
        // The server-issued challenge cookie binds this step to a successful
        // step-1 password check.
        if (is2fa) {
          if (typeof twoFaCode !== "string") return null;

          const userId = await validateChallenge();
          if (!userId) return null;

          const userResult = await db.query(
            "SELECT id, name, email, two_factor_secret, two_factor_enabled FROM users WHERE id = $1",
            [userId]
          );
          const user = userResult.rows[0];
          if (!user || !user.two_factor_secret) return null;

          if (!verifyOtp(twoFaCode, user.two_factor_secret)) return null;

          await completeChallenge();
          return { id: user.id, name: user.name, email: user.email };
        }

        // ---- Step 1: email + password ----
        if (typeof email !== "string") return null;
        if (typeof password !== "string") return null;

        const userResult = await db.query(
          "SELECT * FROM users WHERE email = $1",
          [email]
        );
        const user = userResult.rows[0];
        if (!user || !user.password) return null;

        const passwordsMatch = await bcrypt.compare(password, user.password);
        if (!passwordsMatch) return null;

        if (user.two_factor_enabled) {
          if (!user.two_factor_secret) {
            // C6: do NOT silently downgrade. Refuse login and force admin re-enrollment.
            console.error(
              `[auth] inconsistent 2FA state for user ${user.id}: enabled=true, secret=NULL`
            );
            throw new TwoFactorStateError();
          }
          await issueChallenge(user.id);
          throw new TwoFactorRequiredError();
        }

        return { id: user.id, name: user.name, email: user.email };
      },
    }),
  ],
});
