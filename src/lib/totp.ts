import * as crypto from 'crypto';
// @ts-expect-error — thirty-two has no published types
import base32 from 'thirty-two';

const TOTP_PERIOD = 30; // seconds
const TOTP_DIGITS = 6;
const TOTP_ALGORITHM = 'sha1';

export function generateSecret(): string {
  const buffer = crypto.randomBytes(10); // 80 bits
  return base32.encode(buffer).toString().replace(/=/g, ''); // Base32 encoding and remove padding
}

export function generateOtpAuthUri(email: string, secret: string, issuer: string = "Synthetic Persona Web"): string {
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(email)}?secret=${encodeURIComponent(secret)}&issuer=${encodeURIComponent(issuer)}&algorithm=${TOTP_ALGORITHM.toUpperCase()}&digits=${TOTP_DIGITS}&period=${TOTP_PERIOD}`;
}

export function verifyOtp(token: string, secret: string): boolean {
  const normalizedToken = token.replace(/\s+/g, '').trim();
  if (!/^\d{6}$/.test(normalizedToken)) return false;

  const decodedSecret = base32.decode(secret);
  const time = Math.floor(Date.now() / 1000 / TOTP_PERIOD);
  
  const hotp = (counter: number): string => {
    const buf = Buffer.alloc(8);
    // JS numbers are 53-bit integers, so we can't just write the counter.
    // We need to write the high and low parts of the 64-bit counter.
    // Since the counter (time) is well within the 53-bit range, we can safely
    // assume the high part is 0 for our purposes.
    buf.writeUInt32BE(0, 0); // High-order bits
    buf.writeUInt32BE(counter, 4); // Low-order bits

    const hmac = crypto.createHmac(TOTP_ALGORITHM, decodedSecret).update(buf).digest();
    const offset = hmac[hmac.length - 1] & 0xf;
    const bin = (hmac.readUInt32BE(offset) & 0x7fffffff);
    const otp = bin % (10 ** TOTP_DIGITS);
    
    return otp.toString().padStart(TOTP_DIGITS, '0');
  };

  const otpCurrent = hotp(time);
  const otpPrevious = hotp(time - 1); // Check previous time step due to clock drift
  const otpNext = hotp(time + 1); // Also allow slight client-ahead drift

  return normalizedToken === otpCurrent || normalizedToken === otpPrevious || normalizedToken === otpNext;
}
