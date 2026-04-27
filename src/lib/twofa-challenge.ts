import { cookies } from "next/headers";
import { createHmac, randomUUID, timingSafeEqual } from "crypto";
import { redis } from "./ratelimit";

// Server-side state for the 2FA step (C1). Step 1 (password) issues a signed,
// HttpOnly, single-use challenge cookie tied to a Redis JTI. Step 2 (TOTP) must
// present that cookie — the client cannot fabricate `is2fa: true` and bypass
// the password check. The Redis entry enforces single-use; cookie HMAC prevents
// tampering with the userId.

const COOKIE_NAME = "bern_2fa_challenge";
const TTL_SECONDS = 300; // 5 minutes
const MAX_TOTP_ATTEMPTS = 5;

function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "AUTH_SECRET is missing or too short; required for 2FA challenge signing"
    );
  }
  return secret;
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export async function issueChallenge(userId: string): Promise<void> {
  const jti = randomUUID();
  const exp = Math.floor(Date.now() / 1000) + TTL_SECONDS;
  const payload = `${userId}.${jti}.${exp}`;
  const token = `${payload}.${sign(payload)}`;

  await redis.set(`2fa:challenge:${jti}`, userId, { ex: TTL_SECONDS });

  const store = await cookies();
  store.set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: TTL_SECONDS,
  });
}

/**
 * Returns the bound userId if the cookie is valid, signed, unexpired, and the
 * Redis JTI is still present — and increments an attempt counter. After
 * MAX_TOTP_ATTEMPTS the challenge is invalidated even on subsequent valid
 * cookie presentations. Does NOT delete the JTI; the caller calls
 * `completeChallenge` after verifying the TOTP.
 */
export async function validateChallenge(): Promise<string | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const parts = token.split(".");
  if (parts.length !== 4) return null;
  const [userId, jti, expStr, sig] = parts;

  if (!safeEqual(sig, sign(`${userId}.${jti}.${expStr}`))) return null;

  const exp = parseInt(expStr, 10);
  if (!Number.isFinite(exp) || Math.floor(Date.now() / 1000) > exp) return null;

  const stored = await redis.get(`2fa:challenge:${jti}`);
  if (stored !== userId) return null;

  const attempts = await redis.incr(`2fa:attempts:${jti}`);
  if (attempts === 1) {
    await redis.expire(`2fa:attempts:${jti}`, TTL_SECONDS);
  }
  if (attempts > MAX_TOTP_ATTEMPTS) {
    await redis.del(`2fa:challenge:${jti}`);
    await redis.del(`2fa:attempts:${jti}`);
    return null;
  }

  return userId;
}

/** Single-use: deletes the JTI and clears the cookie. Call only after TOTP verifies. */
export async function completeChallenge(): Promise<void> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (token) {
    const parts = token.split(".");
    if (parts.length === 4) {
      const jti = parts[1];
      await redis.del(`2fa:challenge:${jti}`);
      await redis.del(`2fa:attempts:${jti}`);
    }
  }
  store.delete(COOKIE_NAME);
}
