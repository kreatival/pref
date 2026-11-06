import { QuotationItem, QuotationStatus, Totals } from "./types";

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
export const mmToCm = (mm: number) => Number((mm / 10).toFixed(1));
export const cmToMm = (cm: number) => Math.round(cm * 10);
export const unitArea = (wMm: number, hMm: number) => round2((wMm * hMm) / 1_000_000);

export function money(n: number, currency = "EUR") {
  try {
    return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(n);
  } catch {
    return `${n.toFixed(2)} ${currency}`;
  }
}

export const fmtDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";

export function computeTotals(items: Pick<QuotationItem, "widthMm" | "heightMm" | "quantity" | "unitPrice">[], discountPct: number, vatPct: number): Totals {
  let cents = 0, pieces = 0, area = 0;
  for (const it of items) {
    cents += Math.round(it.unitPrice * it.quantity * 100);
    pieces += it.quantity;
    area += unitArea(it.widthMm, it.heightMm) * it.quantity;
  }
  const subtotal = cents / 100;
  const discount = round2((subtotal * discountPct) / 100);
  const net = round2(subtotal - discount);
  const vat = round2((net * vatPct) / 100);
  return { subtotal, discount, net, vat, total: round2(net + vat), pieces, area: round2(area) };
}

export const STATUS_LABEL: Record<QuotationStatus, string> = {
  DRAFT: "Draft", SENT: "Sent", ACCEPTED: "Accepted", REJECTED: "Rejected",
};
