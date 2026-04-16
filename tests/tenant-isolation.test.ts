import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "@flowlab/db";

const databaseUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
const shouldRun =
  Boolean(databaseUrl) &&
  (process.env.CI === "true" || process.env.RUN_DB_TESTS === "true");
const describeIfDatabase = shouldRun ? describe : describe.skip;

type SeededTenant = {
  tenantId: string;
  customerId: string;
  jobId: string;
  invoiceId: string;
  quoteId: string;
  enquiryId: string;
  communicationId: string;
  feedbackId: string;
  integrationId: string;
  tenantUserId: string;
};

const seededTenants: SeededTenant[] = [];

function makeTenantSeed(label: "a" | "b"): SeededTenant {
  const suffix = randomUUID();
  return {
    tenantId: randomUUID(),
    customerId: randomUUID(),
    jobId: randomUUID(),
    invoiceId: randomUUID(),
    quoteId: randomUUID(),
    enquiryId: randomUUID(),
    communicationId: randomUUID(),
    feedbackId: randomUUID(),
    integrationId: randomUUID(),
    tenantUserId: randomUUID(),
  };
}

async function ensureRlsRolesAndPolicies() {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
          CREATE ROLE authenticated;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
          CREATE ROLE anon;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
          CREATE ROLE service_role;
        END IF;
      END
      $$;
    `);

    await client.query(`
      GRANT USAGE ON SCHEMA public TO authenticated, anon, service_role;
      GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated, anon, service_role;
      ALTER DEFAULT PRIVILEGES IN SCHEMA public
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated, anon, service_role;
    `);

    const policyCheck = await client.query(`
      SELECT 1
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'Customer'
        AND policyname = 'tenant_isolation'
      LIMIT 1
    `);

    if (policyCheck.rowCount === 0) {
      const rlsPath = path.resolve(process.cwd(), "packages/db/migrations/001_rls.sql");
      const sql = await readFile(rlsPath, "utf8");
      await client.query(sql);
    }
  } finally {
    await client.end();
  }
}

async function seedTenant(label: "a" | "b"): Promise<SeededTenant> {
  const ids = makeTenantSeed(label);
  const slug = `rls-${label}-${ids.tenantId.slice(0, 8)}`;

  await prisma.tenant.create({
    data: {
      id: ids.tenantId,
      slug,
      status: "active",
      plan: "professional",
      billingEmail: `${label}@example.com`,
      monthlyFee: 199,
      profile: {
        create: {
          businessName: `RLS Tenant ${label.toUpperCase()}`,
          primaryColour: "#0f172a",
          secondaryColour: "#1e293b",
          accentColour: "#f97316",
          serviceAreaSuburbs: ["Brisbane"],
          businessType: "cleaning",
          timezone: "Australia/Brisbane",
        },
      },
      users: {
        create: {
          id: ids.tenantUserId,
          email: `${slug}@example.com`,
          role: "owner",
          firstName: "Tenant",
          lastName: label.toUpperCase(),
        },
      },
      integrations: {
        create: {
          id: ids.integrationId,
          service: "xero",
          status: "connected",
          credentialsJson: "{}",
        },
      },
    },
  });

  await prisma.customer.create({
    data: {
      id: ids.customerId,
      tenantId: ids.tenantId,
      firstName: "Customer",
      lastName: label.toUpperCase(),
      email: `${slug}.customer@example.com`,
      phone: "0400000000",
      suburb: "Brisbane",
    },
  });

  await prisma.quote.create({
    data: {
      id: ids.quoteId,
      tenantId: ids.tenantId,
      customerId: ids.customerId,
      title: `Quote ${label.toUpperCase()}`,
      amount: 150,
      status: "sent",
      accessToken: `quote-${randomUUID()}`,
    },
  });

  await prisma.job.create({
    data: {
      id: ids.jobId,
      tenantId: ids.tenantId,
      customerId: ids.customerId,
      quoteId: ids.quoteId,
      status: "scheduled",
      summary: `Job ${label.toUpperCase()}`,
      suburb: "Brisbane",
    },
  });

  await prisma.invoice.create({
    data: {
      id: ids.invoiceId,
      tenantId: ids.tenantId,
      customerId: ids.customerId,
      jobId: ids.jobId,
      number: `INV-${label.toUpperCase()}-${ids.invoiceId.slice(0, 6)}`,
      amount: 150,
      status: "issued",
      accessToken: `invoice-${randomUUID()}`,
    },
  });

  await prisma.enquiry.create({
    data: {
      id: ids.enquiryId,
      tenantId: ids.tenantId,
      customerId: ids.customerId,
      quoteId: ids.quoteId,
      serviceRequest: "Please quote a recurring clean",
      status: "new",
      source: "test",
    },
  });

  await prisma.communication.create({
    data: {
      id: ids.communicationId,
      tenantId: ids.tenantId,
      customerId: ids.customerId,
      jobId: ids.jobId,
      invoiceId: ids.invoiceId,
      channel: "email",
      direction: "outbound",
      subject: "Test message",
      body: "Hello from FlowLab",
      status: "sent",
    },
  });

  await prisma.feedback.create({
    data: {
      id: ids.feedbackId,
      tenantId: ids.tenantId,
      customerId: ids.customerId,
      jobId: ids.jobId,
      rating: 5,
      comment: "Great service",
      source: "test",
    },
  });

  await prisma.platformEventLog.create({
    data: {
      tenantId: ids.tenantId,
      eventType: "info",
      service: "worker",
      direction: "outbound",
      status: "success",
      requestSummary: `Seeded tenant ${label.toUpperCase()}`,
      triggeredBy: "tenant_isolation_test",
      customerId: ids.customerId,
      jobId: ids.jobId,
    },
  });

  return ids;
}

async function queryAsTenant(tenantId: string, sql: string, values: unknown[] = []) {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    await client.query("SET ROLE authenticated");
    await client.query("SELECT set_config('app.tenant_id', $1, false)", [tenantId]);
    return await client.query(sql, values);
  } finally {
    await client.end();
  }
}

describeIfDatabase("tenant isolation RLS regression", () => {
  beforeAll(async () => {
    await ensureRlsRolesAndPolicies();
    seededTenants.push(await seedTenant("a"));
    seededTenants.push(await seedTenant("b"));
  }, 60_000);

  afterAll(async () => {
    const tenantIds = seededTenants.map((tenant) => tenant.tenantId);

    if (tenantIds.length > 0) {
      await prisma.platformEventLog.deleteMany({
        where: {
          tenantId: { in: tenantIds },
          triggeredBy: "tenant_isolation_test",
        },
      });
      await prisma.tenant.deleteMany({
        where: { id: { in: tenantIds } },
      });
    }

    await prisma.$disconnect();
  });

  it("tenant A cannot read tenant B rows across high-risk tables", async () => {
    const tenantA = seededTenants[0]!;
    const tenantB = seededTenants[1]!;

    const checks = [
      { table: "Customer", tenantColumn: "\"tenantId\"" },
      { table: "Job", tenantColumn: "\"tenantId\"" },
      { table: "Invoice", tenantColumn: "\"tenantId\"" },
      { table: "Quote", tenantColumn: "\"tenantId\"" },
      { table: "Enquiry", tenantColumn: "\"tenantId\"" },
      { table: "Communication", tenantColumn: "\"tenantId\"" },
      { table: "Feedback", tenantColumn: "\"tenantId\"" },
      { table: "TenantIntegration", tenantColumn: "\"tenantId\"" },
      { table: "PlatformEventLog", tenantColumn: "\"tenantId\"" },
      { table: "TenantUser", tenantColumn: "\"tenantId\"" },
    ] as const;

    for (const check of checks) {
      const result = await queryAsTenant(
        tenantA.tenantId,
        `SELECT COUNT(*)::int AS count FROM "${check.table}" WHERE ${check.tenantColumn} = $1`,
        [tenantB.tenantId]
      );
      expect(result.rows[0]?.count, `${check.table} leaked cross-tenant rows`).toBe(0);
    }
  });

  it("tenant A can still read its own tenant-scoped rows", async () => {
    const tenantA = seededTenants[0]!;

    const result = await queryAsTenant(
      tenantA.tenantId,
      `SELECT
        (SELECT COUNT(*)::int FROM "Customer" WHERE "tenantId" = $1) AS customers,
        (SELECT COUNT(*)::int FROM "Job" WHERE "tenantId" = $1) AS jobs,
        (SELECT COUNT(*)::int FROM "Invoice" WHERE "tenantId" = $1) AS invoices,
        (SELECT COUNT(*)::int FROM "Quote" WHERE "tenantId" = $1) AS quotes,
        (SELECT COUNT(*)::int FROM "TenantUser" WHERE "tenantId" = $1) AS tenant_users`,
      [tenantA.tenantId]
    );

    expect(result.rows[0]?.customers).toBe(1);
    expect(result.rows[0]?.jobs).toBe(1);
    expect(result.rows[0]?.invoices).toBe(1);
    expect(result.rows[0]?.quotes).toBe(1);
    expect(result.rows[0]?.tenant_users).toBe(1);
  });

  it("tenant A cannot insert a row claiming tenant B", async () => {
    const tenantA = seededTenants[0]!;
    const tenantB = seededTenants[1]!;

    await expect(
      queryAsTenant(
        tenantA.tenantId,
        `INSERT INTO "Customer" ("id", "tenantId", "firstName", "lastName", "email")
         VALUES ($1, $2, $3, $4, $5)`,
        [randomUUID(), tenantB.tenantId, "Mallory", "Leak", `mallory-${randomUUID()}@example.com`]
      )
    ).rejects.toThrow(/row-level security|permission/i);
  });
});
