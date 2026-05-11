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
          <div className="text-slate-400 mt-1.5">{row.original.email}</div>
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
      cell: ({ row }) => {
        const overdueCount = row.original.invoices.filter((invoice) => invoice.dueAt && new Date(invoice.dueAt) < new Date() && invoice.status !== "paid").length;
        if (overdueCount > 0) {
          return <span className="text-amber-400 font-medium" title={`${overdueCount} overdue invoice${overdueCount === 1 ? "" : "s"} — follow up on payment`}>⚠ Overdue</span>;
        }
        if (row.original.jobs.length > 2) {
          return <span className="text-emerald-400" title="Regular customer with multiple jobs">Active</span>;
        }
        return <span className="text-muted-foreground" title="Early-stage customer relationship">New</span>;
      }
    },
    {
      id: "actions",
      header: "Actions",
      enableSorting: false,
      cell: ({ row }) => (
        <>
          <Link href={`/dashboard/quotes/new?customerId=${row.original.id}`}>Quote</Link>
          {" · "}
          <Link href={`/dashboard/invoices?customerId=${row.original.id}`}>Invoice</Link>
        </>
      )
    }
  ];

  return <DataTable columns={columns} data={customers} />;
}
