"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";

import CustomerLink from "../../../components/customer-link";
import { DataTable } from "../../../components/ui/data-table";

type CustomerRow = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  suburb: string | null;
  jobs: Array<{ id: string }>;
  quotes: Array<{ id: string }>;
  invoices: Array<{ id: string; dueAt: string | Date | null; status: string }>;
};

export function CustomersTable({ customers }: { customers: CustomerRow[] }) {
  const columns: ColumnDef<CustomerRow>[] = [
    {
      accessorKey: "firstName",
      header: "Customer",
      cell: ({ row }) => (
        <div>
          <CustomerLink customerId={row.original.id} className="inline-entity-link">
            <strong>{row.original.firstName} {row.original.lastName}</strong>
          </CustomerLink>
          <div style={{ color: "#cbd5e1", marginTop: 6 }}>{row.original.email}</div>
        </div>
      )
    },
    { accessorKey: "suburb", header: "Suburb", cell: ({ row }) => row.original.suburb ?? "n/a" },
    { accessorKey: "jobs.length", header: "Jobs" },
    { accessorKey: "quotes.length", header: "Quotes" },
    { accessorKey: "invoices.length", header: "Invoices" },
    {
      id: "health",
      header: "Health",
      accessorFn: (row) => {
        const overdueCount = row.invoices.filter((invoice) => invoice.dueAt && new Date(invoice.dueAt) < new Date() && invoice.status !== "paid").length;
        return overdueCount > 0 ? "Needs attention" : row.jobs.length > 2 ? "Active" : "Light touch";
      }
    },
    {
      id: "actions",
      header: "Actions",
      enableSorting: false,
      cell: ({ row }) => (
        <>
          <Link href={`/dashboard/quotes?customerId=${row.original.id}`}>Quote</Link>
          {" · "}
          <Link href={`/dashboard/invoices?customerId=${row.original.id}`}>Invoice</Link>
        </>
      )
    }
  ];

  return <DataTable columns={columns} data={customers} />;
}
