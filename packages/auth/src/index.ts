import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";

import type { CustomerTokenPayload } from "@flowlab/contracts";

// ---------------------------------------------------------------------------
// Cookie names — kept for backwards compat during migration window
// (logout routes delete these stale cookies)
// ---------------------------------------------------------------------------
export const PLATFORM_SESSION_COOKIE = "flowlab_platform_session";
export const TENANT_SESSION_COOKIE = "flowlab_tenant_session";
export const IMPERSONATION_SESSION_COOKIE = "flowlab_impersonation";

// ---------------------------------------------------------------------------
// Customer resource tokens (quotes, agreements, invoices, feedback)
// These are NOT user session tokens — they stay as custom JWTs
// ---------------------------------------------------------------------------

const customerTokenSchema = z.object({
  tenantId: z.string(),
  resourceId: z.string(),
  resourceType: z.enum(["quote", "agreement", "invoice", "feedback"]),
  expiresAt: z.string(),
});

const impersonationTokenSchema = z.object({
  adminUserId: z.string(),
  authUserId: z.string(),
  tenantId: z.string(),
  expiresAt: z.string(),
});

export type ImpersonationTokenPayload = z.infer<typeof impersonationTokenSchema>;

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  const isProd =
    process.env.NODE_ENV === "production" &&
    process.env.NEXT_RUNTIME !== undefined;
  if (!secret && isProd) throw new Error("JWT_SECRET is required in production");
  return secret ?? "development-only-secret";
}

export function signCustomerToken(payload: CustomerTokenPayload) {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: "30d" });
}

export function verifyCustomerToken(token: string): CustomerTokenPayload | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret());
    return customerTokenSchema.parse(decoded);
  } catch {
    return null;
  }
}

export function signImpersonationToken(payload: ImpersonationTokenPayload) {
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: Math.max(
      1,
      Math.ceil((new Date(payload.expiresAt).getTime() - Date.now()) / 1000)
    ),
  });
}

export function verifyImpersonationToken(token: string): ImpersonationTokenPayload | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret());
    return impersonationTokenSchema.parse(decoded);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Legacy helpers — used only during the dual-mode migration window
// (existing users whose authUserId is still null get verified here,
// then lazily migrated to Supabase Auth)
// ---------------------------------------------------------------------------

/** @deprecated use Supabase Auth — only needed for legacy user migration */
export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

/** @deprecated use Supabase Auth — only needed for legacy user migration */
export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

// ---------------------------------------------------------------------------
// Supabase Auth clients — re-exported from dedicated module
// ---------------------------------------------------------------------------
export { createSupabaseServerClient, createSupabaseAdminClient } from "./supabase-server";
