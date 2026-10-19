import 'server-only';
import { createHmac, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';

export const SESSION_COOKIE = 'rp_session';
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

const DEV_PASSWORD = 'dev';

/** The team password. Set APP_PASSWORD in Vercel; changing it logs everyone out. */
export function getPassword(): string | null {
  const p = process.env.APP_PASSWORD;
  if (p) return p;
  return process.env.NODE_ENV === 'production' ? null : DEV_PASSWORD;
}

function secret(): string {
  return (process.env.SESSION_SECRET || '') + '|' + (getPassword() ?? '');
}

function sign(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('base64url');
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function checkPassword(input: string): boolean {
  const pw = getPassword();
  if (!pw) return false;
  // compare HMACs so lengths always match
  return safeEqual(sign('pw:' + input), sign('pw:' + pw));
}

export function createSessionToken(): string {
  const issued = Date.now().toString();
  return `${issued}.${sign('session:' + issued)}`;
}

export function verifySessionToken(token: string | undefined): boolean {
  if (!token || !getPassword()) return false;
  const [issued, sig] = token.split('.');
  if (!issued || !sig) return false;
  const age = (Date.now() - Number(issued)) / 1000;
  if (!Number.isFinite(age) || age < 0 || age > SESSION_MAX_AGE) return false;
  return safeEqual(sig, sign('session:' + issued));
}

export async function isAuthenticated(): Promise<boolean> {
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE)?.value);
}
