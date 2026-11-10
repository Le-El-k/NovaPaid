import { createHash } from "node:crypto";
import { getDatabase } from "../db/database.ts";

export const USER_SESSION_COOKIE = "np_user_session";
export const ADMIN_SESSION_COOKIE = "np_admin_session";

export interface AuthenticatedUser {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  status: string;
  kycStatus: string;
  emailVerified: boolean;
  hasPin: boolean;
  profilePhoto: string | null;
}

export interface AuthenticatedAdmin {
  id: number;
  name: string;
  email: string;
  role: string;
  permissions: string;
}

export function readCookie(request: Request, name: string): string | null {
  const cookieHeader = request.headers.get("cookie") || "";
  for (const item of cookieHeader.split(";")) {
    const separator = item.indexOf("=");
    if (separator < 0) continue;
    if (item.slice(0, separator).trim() === name) {
      try {
        return decodeURIComponent(item.slice(separator + 1).trim());
      } catch {
        return null;
      }
    }
  }
  return null;
}

export function isSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      return new URL(origin).origin === new URL(request.url).origin;
    } catch {
      return false;
    }
  }
  return request.headers.get("sec-fetch-site") !== "cross-site";
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function getAuthenticatedUser(request: Request): AuthenticatedUser | null {
  const token = readCookie(request, USER_SESSION_COOKIE);
  if (!token) return null;
  const row = getDatabase().prepare(`
    SELECT u.id, u.name, u.email, u.phone, u.role, u.status, u.kyc_status,
           u.email_verified_at, u.pin_hash, u.profile_photo
    FROM user_sessions s JOIN users u ON u.id = s.user_id
    WHERE s.session_token = ? AND s.expires_at > datetime('now') AND u.status = 'active'
  `).get(hashSessionToken(token)) as any;
  if (!row) return null;
  return {
    id: Number(row.id),
    name: row.name,
    email: row.email,
    phone: row.phone,
    role: row.role,
    status: row.status,
    kycStatus: row.kyc_status,
    emailVerified: !!row.email_verified_at,
    hasPin: !!row.pin_hash,
    profilePhoto: row.profile_photo || null,
  };
}

export function getAuthenticatedAdmin(request: Request): AuthenticatedAdmin | null {
  const token = readCookie(request, ADMIN_SESSION_COOKIE);
  if (!token) return null;
  const row = getDatabase().prepare(`
    SELECT a.id, a.name, a.email, a.role, a.permissions
    FROM admin_sessions s JOIN admins a ON a.id = s.admin_id
    WHERE s.session_token = ? AND s.expires_at > datetime('now') AND a.status = 'active'
  `).get(hashSessionToken(token)) as any;
  if (!row) return null;
  return {
    id: Number(row.id),
    name: row.name,
    email: row.email,
    role: row.role,
    permissions: row.permissions,
  };
}

export function sessionCookie(name: string, token: string, maxAgeSeconds: number): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${name}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${secure}`;
}

export function expiredSessionCookie(name: string): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${name}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

export function clientContext(request: Request) {
  return {
    ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
    userAgent: request.headers.get("user-agent")?.slice(0, 500) || null,
  };
}
