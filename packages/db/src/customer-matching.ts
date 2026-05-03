export function pickMatchedCustomerId(emailCustomerId: string | null, phoneCustomerId: string | null) {
  if (emailCustomerId && phoneCustomerId && emailCustomerId !== phoneCustomerId) {
    throw new Error("Customer email and phone match different records");
  }

  return emailCustomerId ?? phoneCustomerId ?? null;
}
