import Link from "next/link";
import type { ReactNode } from "react";

type CustomerLinkProps = {
  customerId: string;
  children: ReactNode;
  className?: string;
};

export default function CustomerLink({ customerId, children, className }: CustomerLinkProps) {
  return (
    <Link href={`/dashboard/crm/${customerId}`} className={className}>
      {children}
    </Link>
  );
}
