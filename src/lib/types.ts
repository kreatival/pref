export type Role = "SUPERADMIN" | "WORKSHOP_ADMIN" | "OPERATOR" | "USER" | "ADMIN";
export type QuotationStatus = "DRAFT" | "SENT" | "ACCEPTED" | "REJECTED";
export type ItemType = "FIXED" | "TILT_TURN" | "SLIDING" | "DOOR" | "PANEL_DOOR";

export interface User { id: string; email: string; name: string; role: Role; tenantId?: string; active?: boolean; createdAt?: string }

export interface Client {
  id: string; name: string; phone: string | null; email: string | null;
  address: string | null; city: string | null; notes: string | null;
  _count?: { quotations: number };
}

export interface Paginated<T> { data: T[]; total: number; page: number; pageSize: number }

export interface QuotationItem {
  id?: string; position?: number; title: string; type: ItemType; series: string | null;
  widthMm: number; heightMm: number; quantity: number; unitPrice: number; leaves: number;
  color: string | null; glass: string | null; mechanism: string | null;
  shutter: boolean; motor: boolean; mosquitoNet: boolean; notes: string | null;
}

export interface Totals { subtotal: number; discount: number; net: number; vat: number; total: number; pieces: number; area: number }

export interface Quotation {
  id: string; number: number; date: string; validUntil: string | null; status: QuotationStatus;
  currency: string; discountPct: number; vatPct: number; notes: string | null;
  client: Pick<Client, "id" | "name" | "phone" | "email" | "address" | "city">;
  createdBy: { id: string; name: string } | null;
  items: QuotationItem[]; totals: Totals; createdAt: string; updatedAt: string;
}

export interface QuotationRow {
  id: string; number: number; date: string; status: QuotationStatus; currency: string;
  client: { id: string; name: string }; itemsCount: number; total: number;
}

export interface CatalogCategory {
  slug: string;
  name: string;
  description?: string;
  image?: string;
}

export interface CatalogSeries {
  code: string;
  name: string;
  category: string;
  family: string;
  types: ItemType[];
  defaultLeaves: number;
  defaultMechanism?: string;
  defaultColor?: string;
  image?: string;
  description?: string;
  profileWidthMm?: number;
  uValue?: string;
  maxGlass?: string;
  finish?: string;
}

export interface Catalog {
  categories: CatalogCategory[];
  series: CatalogSeries[];
  glass: string[]; mechanisms: string[]; colors: string[];
  itemTypes: { value: ItemType; label: string }[];
}

export interface Stats { byStatus: { status: QuotationStatus; count: number; value: number }[]; clients: number }

export type MeasurementStatus = "DRAFT" | "COMPLETED";
export type OpeningSide = "NONE" | "LEFT" | "RIGHT" | "BOTH";

export interface MeasurementLine {
  id?: string; position?: number; location: string | null; label: string | null; type: ItemType; quantity: number;
  widthTopMm: number | null; widthMidMm: number | null; widthBottomMm: number | null;
  heightLeftMm: number | null; heightMidMm: number | null; heightRightMm: number | null;
  diagonal1Mm: number | null; diagonal2Mm: number | null; wallDepthMm: number | null;
  opening: OpeningSide; series: string | null; color: string | null;
  shutter: boolean; motor: boolean; mosquitoNet: boolean; notes: string | null;
}

export interface Measurement {
  id: string; number: number; date: string; status: MeasurementStatus; siteAddress: string | null;
  clearanceMm: number; notes: string | null;
  client: Pick<Client, "id" | "name" | "phone" | "address" | "city">;
  quotation: { id: string; number: number } | null;
  lines: MeasurementLine[];
}

export interface MeasurementRow {
  id: string; number: number; date: string; status: MeasurementStatus; siteAddress: string | null;
  client: { id: string; name: string }; quotation: { id: string; number: number } | null; linesCount: number;
}
