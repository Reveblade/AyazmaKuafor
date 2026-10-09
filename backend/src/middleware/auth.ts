import { SignJWT, jwtVerify } from 'jose';
import type { Context, Next } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { config } from '../config.js';

const secret = new TextEncoder().encode(config.jwtSecret);
export const ADMIN_COOKIE_NAME = 'ayazma_admin_token';
const COOKIE_NAME = ADMIN_COOKIE_NAME;

export async function createAdminToken(): Promise<string> {
  return new SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(secret);
}

export async function verifyAdminToken(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, secret);
    return true;
  } catch {
    return false;
  }
}

export function setAdminCookie(c: Context, token: string) {
  setCookie(c, COOKIE_NAME, token, {
    httpOnly: true,
    secure: !config.isDev,
    sameSite: 'Lax',
    path: '/',
    maxAge: 8 * 60 * 60,
  });
}

export function clearAdminCookie(c: Context) {
  deleteCookie(c, COOKIE_NAME, { path: '/' });
}

export async function adminAuthMiddleware(c: Context, next: Next) {
  const token = getCookie(c, COOKIE_NAME);
  if (!token || !(await verifyAdminToken(token))) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  await next();
}

export async function getAdminTokenFromCookie(c: Context): Promise<string | undefined> {
  return getCookie(c, COOKIE_NAME);
}
