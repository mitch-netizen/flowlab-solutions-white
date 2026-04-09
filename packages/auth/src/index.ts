import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";

import type { AuthClaims, CustomerTokenPayload, PlatformSession, TenantSession } from "@flowlab/contracts";

export const PLATFORM_SESSION_COOKIE = "flowlab_platform_session";
export const TENANT_SESSION_COOKIE = "flowlab_tenant_session";

const authClaimsSchema = z.object({
  sub: z.string(),
  email: z.string().email(),
  scope: z.enum(["platform", "tenant", "customer"]),
  role: z.string(),
  tenantId: z.string().optional(),
  impersonatedBy: z.string().optional()
});

const customerTokenSchema = z.object({
  tenantId: z.string(),
  resourceId: z.string(),
  resourceType: z.enum(["quote", "agreement", "invoice", "feedback"]),
  expiresAt: z.string()
});

function getJwtSecret() {
  return process.env.JWT_SECRET ?? "development-only-secret";
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function signPlatformSession(payload: Omit<PlatformSession, "scope"> & { scope?: "platform" }) {
  return jwt.sign({ ...payload, scope: "platform" }, getJwtSecret(), { expiresIn: "12h" });
}

export function signTenantSession(payload: Omit<TenantSession, "scope"> & { scope?: "tenant" }) {
  return jwt.sign({ ...payload, scope: "tenant" }, getJwtSecret(), { expiresIn: "12h" });
}

export function verifySessionToken(token: string): AuthClaims | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret());
    return authClaimsSchema.parse(decoded);
  } catch {
    return null;
  }
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
