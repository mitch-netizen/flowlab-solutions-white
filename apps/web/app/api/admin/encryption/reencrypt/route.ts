import { NextResponse } from "next/server";

import { prisma } from "@flowlab/db";
import { reencryptJson } from "@flowlab/integrations";
import { getPlatformSession } from "../../../../../lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/admin/encryption/reencrypt
 *
 * Re-encrypts all credentialsJson and relevant responseSummary fields with the
 * current ENCRYPTION_MASTER_KEY. Run this after rotating the key while
 * ENCRYPTION_MASTER_KEY_PREVIOUS is still set to the old value. Once it
 * completes successfully, remove ENCRYPTION_MASTER_KEY_PREVIOUS.
 */
export async function POST() {
  const session = await getPlatformSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "superadmin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let tenantIntegrations = 0;
  let platformIntegrations = 0;
  let eventLogs = 0;

  const [tenantRecords, platformRecords, eventRecords] = await Promise.all([
    prisma.tenantIntegration.findMany({
      where: { credentialsJson: { not: null } },
      select: { id: true, credentialsJson: true }
    }),
    prisma.platformIntegration.findMany({
      where: { credentialsJson: { not: null } },
      select: { id: true, credentialsJson: true }
    }),
    prisma.platformEventLog.findMany({
      where: { responseSummary: { not: null } },
      select: { id: true, responseSummary: true }
    })
  ]);

  await Promise.all(
    tenantRecords.map(async (r: { id: string; credentialsJson: string | null }) => {
      const reencrypted = reencryptJson(r.credentialsJson);
      if (reencrypted && reencrypted !== r.credentialsJson) {
        await prisma.tenantIntegration.update({ where: { id: r.id }, data: { credentialsJson: reencrypted } });
        tenantIntegrations++;
      }
    })
  );

  await Promise.all(
    platformRecords.map(async (r: { id: string; credentialsJson: string | null }) => {
      const reencrypted = reencryptJson(r.credentialsJson);
      if (reencrypted && reencrypted !== r.credentialsJson) {
        await prisma.platformIntegration.update({ where: { id: r.id }, data: { credentialsJson: reencrypted } });
        platformIntegrations++;
      }
    })
  );

  await Promise.all(
    eventRecords.map(async (r: { id: string; responseSummary: string | null }) => {
      const reencrypted = reencryptJson(r.responseSummary);
      if (reencrypted && reencrypted !== r.responseSummary) {
        await prisma.platformEventLog.update({ where: { id: r.id }, data: { responseSummary: reencrypted } });
        eventLogs++;
      }
    })
  );

  return NextResponse.json({
    ok: true,
    migrated: { tenantIntegrations, platformIntegrations, eventLogs }
  });
}
