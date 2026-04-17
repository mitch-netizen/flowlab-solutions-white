"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";

import { DataTable } from "../../components/ui/data-table";

type TenantRow = {
  id: string;
  slug: string;
  plan: string;
  status: string;
  profile?: {
    businessName?: string | null;
  } | null;
  _count: {
    customers: number;
    jobs: number;
    invoices: number;
  };
};

const statusColours: Record<string, string> = {
  active: "#16a34a",
  trial: "#d97706"
};

export function TenantsTable({ tenants, portalBaseUrlBySlug }: { tenants: TenantRow[]; portalBaseUrlBySlug: Record<string, string> }) {
  const columns: ColumnDef<TenantRow>[] = [
    {
      accessorKey: "slug",
      header: "Business",
      cell: ({ row }) => (
        <Link href={`/admin/tenant/${row.original.id}`} style={{ fontWeight: 600 }}>
          {row.original.profile?.businessName ?? row.original.slug}
        </Link>
      )
    },
    { accessorKey: "plan", header: "Plan" },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <span style={{ color: statusColours[row.original.status] ?? "#dc2626", fontWeight: 600 }}>{row.original.status}</span>
      )
    },
    { accessorKey: "_count.customers", header: "Customers" },
    { accessorKey: "_count.jobs", header: "Jobs" },
    { accessorKey: "_count.invoices", header: "Invoices" },
    {
      id: "actions",
      header: "Actions",
      enableSorting: false,
      cell: ({ row }) => (
        <div style={{ display: "inline-flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <Link href={`/admin/tenant/${row.original.id}`}>View</Link>
          <Link href={portalBaseUrlBySlug[row.original.slug]} target="_blank">Portal</Link>
        </div>
      )
    }
  ];

  return <DataTable columns={columns} data={tenants} />;
}
