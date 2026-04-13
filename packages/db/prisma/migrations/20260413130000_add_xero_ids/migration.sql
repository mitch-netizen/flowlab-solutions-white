-- Add Xero Contact ID to Customer (set when first synced to Xero)
ALTER TABLE "Customer"
ADD COLUMN "xeroContactId" TEXT;

-- Add Xero Invoice tracking fields to Invoice
-- xeroInvoiceId: set when the invoice is pushed to Xero; Xero is source of truth
-- xeroStatus: mirrors the Xero-side status (DRAFT, AUTHORISED, PAID, VOIDED)
-- xeroSyncedAt: timestamp of last sync from Xero
ALTER TABLE "Invoice"
ADD COLUMN "xeroInvoiceId" TEXT,
ADD COLUMN "xeroStatus" TEXT,
ADD COLUMN "xeroSyncedAt" TIMESTAMP(3);
