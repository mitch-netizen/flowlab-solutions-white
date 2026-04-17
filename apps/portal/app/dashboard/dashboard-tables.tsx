"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";

import { DataTable } from "../../components/ui/data-table";
import CustomerLink from "../../components/customer-link";
import { getInvoiceRecordHref, getJobPrimaryHref } from "../../lib/dashboard-links";

type JobRow = {
  id: string;
  summary: string;
  status: string;
  customerId: string;
  customer: { firstName: string; lastName: string };
};

type InvoiceRow = {
  id: string;
  number: string;
  status: string;
  customerId: string;
  customer: { firstName: string; lastName: string };
};

export function JobsTable({ jobs }: { jobs: JobRow[] }) {
  const columns: ColumnDef<JobRow>[] = [
    {
      accessorKey: "summary",
      header: "Job",
      cell: ({ row }) => <Link className="inline-entity-link" href={getJobPrimaryHref(row.original)}>{row.original.summary}</Link>
    },
    {
      accessorKey: "customer.firstName",
      header: "Customer",
      cell: ({ row }) => (
        <CustomerLink customerId={row.original.customerId} className="inline-entity-link">
          {row.original.customer.firstName} {row.original.customer.lastName}
        </CustomerLink>
      )
    },
    { accessorKey: "status", header: "Status" },
    {
      id: "actions",
      header: "Actions",
      enableSorting: false,
      cell: ({ row }) => <Link href={getJobPrimaryHref(row.original)}>Open</Link>
    }
  ];

  return <DataTable columns={columns} data={jobs} pageSize={5} />;
}

export function InvoicesTable({ invoices }: { invoices: InvoiceRow[] }) {
  const columns: ColumnDef<InvoiceRow>[] = [
    {
      accessorKey: "number",
      header: "Invoice",
      cell: ({ row }) => <Link className="inline-entity-link" href={getInvoiceRecordHref(row.original.id)}>{row.original.number}</Link>
    },
    {
      accessorKey: "customer.firstName",
      header: "Customer",
      cell: ({ row }) => (
        <CustomerLink customerId={row.original.customerId} className="inline-entity-link">
          {row.original.customer.firstName} {row.original.customer.lastName}
        </CustomerLink>
      )
    },
    { accessorKey: "status", header: "Status" },
    {
      id: "actions",
      header: "Actions",
      enableSorting: false,
      cell: ({ row }) => <Link href={getInvoiceRecordHref(row.original.id)}>Open</Link>
    }
  ];

  return <DataTable columns={columns} data={invoices} pageSize={5} />;
}
