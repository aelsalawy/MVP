/**
 * Manual service entry validation + totals (T3.1, FR-2.1 / FR-2.5).
 *
 * Pure logic — no React Native imports — so QA can unit-test everything
 * here without a RN test environment. The entry form screen consumes this;
 * the screen owns presentation only.
 */

import { ServiceEntryDoc } from '../types';

/** FR-2.1 service types for the picker. */
export const SERVICE_TYPES = [
  'maintenance',
  'repair',
  'inspection',
  'fuel',
  'other',
] as const;

export type ServiceType = (typeof SERVICE_TYPES)[number];

/** Human labels for the picker (index-stable vs SERVICE_TYPES). */
export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  maintenance: 'Maintenance',
  repair: 'Repair',
  inspection: 'Inspection',
  fuel: 'Fuel',
  other: 'Other',
};

/** One line item row on the form (FR-2.5). */
export interface LineItemInput {
  desc: string;
  priceText: string;
}

/** Line item normalized for persistence (price in cents). */
export interface LineItem {
  desc: string;
  price: number; // cents
}

/**
 * Parse a free-text money amount into integer cents.
 * Accepts "12.34", "12,34", " 12 ", "12.3" (→ 1230), "abc" (→ null).
 * Rejects negative values and more than one separator.
 */
export function parseMoneyToCents(text: string): number | null {
  const cleaned = text.trim().replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const cents = Math.round(parseFloat(cleaned) * 100);
  return Number.isFinite(cents) && cents >= 0 ? cents : null;
}

/** True if `text` is a valid ISO date (YYYY-MM-DD), incl. real calendar days. */
export function isValidIsoDate(text: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
  const [y, m, d] = text.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

/** Convert a validated ISO date string (YYYY-MM-DD) to epoch ms (UTC midnight). */
export function isoDateToEpochMs(text: string): number | null {
  if (!isValidIsoDate(text)) return null;
  const [y, m, d] = text.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

/** Inverse of isoDateToEpochMs — for prefilled form fields. */
export function epochMsToIsoDate(epochMs: number): string {
  const dt = new Date(epochMs);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

/** Parse a free-text odometer into a non-negative integer, or null. */
export function parseOdometer(text: string): number | null {
  const cleaned = text.trim();
  if (!/^\d+$/.test(cleaned)) return null;
  const value = Number(cleaned);
  return Number.isSafeInteger(value) && value >= 0 ? value : null;
}

/** Normalize raw form rows into line items; rows with no desc AND no price are dropped. */
export function normalizeLineItems(items: LineItemInput[]): LineItem[] {
  return items
    .map((it) => ({
      desc: it.desc.trim(),
      price: parseMoneyToCents(it.priceText),
    }))
    .filter((it) => it.desc.length > 0 || it.price != null)
    .map((it) => ({ desc: it.desc, price: it.price ?? 0 }));
}

/** Sum of line item prices, in cents. Empty rows count as 0. */
export function sumLineItems(items: LineItemInput[]): number | null {
  const normalized = normalizeLineItems(items);
  if (normalized.length === 0) return null;
  return normalized.reduce((sum, it) => sum + it.price, 0);
}

export interface ServiceEntryFormValues {
  /** ISO YYYY-MM-DD */
  dateText: string;
  serviceType: string;
  totalText: string;
  lineItems: LineItemInput[];
  odometerText: string;
}

export interface ServiceEntryValidation {
  /** Epoch ms for the validated date, or null. */
  date: number | null;
  dateError?: string;
  serviceTypeError?: string;
  /** Total in integer cents, or null. */
  totalCents: number | null;
  totalError?: string;
  odometer: number | null;
  odometerError?: string;
  lineItems: LineItem[];
  /** Sum of line items in cents, or null when there are no usable rows. */
  lineItemsSumCents: number | null;
  /** Informational only (FR-2.5): line items do not add up to the total. */
  totalMismatch?: string;
  /** True when every hard requirement passes (mismatch is NOT a hard error). */
  isValid: boolean;
}

/**
 * Validate the whole form. Hard errors (isValid=false): total required and
 * > 0, valid ISO date, known service type. The line-items-vs-total mismatch
 * is surfaced via `totalMismatch` for an informational banner — it never
 * blocks saving (FR-2.5).
 */
export function validateServiceEntry(
  values: ServiceEntryFormValues
): ServiceEntryValidation {
  const date = isoDateToEpochMs(values.dateText);
  const dateError = date == null ? 'Enter a valid date (YYYY-MM-DD)' : undefined;

  const totalCents = parseMoneyToCents(values.totalText);
  let totalError: string | undefined;
  if (values.totalText.trim().length === 0) {
    totalError = 'Total amount is required';
  } else if (totalCents == null) {
    totalError = 'Enter a valid amount, e.g. 123.45';
  } else if (totalCents <= 0) {
    totalError = 'Total must be greater than 0';
  }

  const serviceTypeError = (SERVICE_TYPES as readonly string[]).includes(
    values.serviceType
  )
    ? undefined
    : 'Choose a service type';

  const odometer =
    values.odometerText.trim().length === 0 ? 0 : parseOdometer(values.odometerText);
  const odometerError =
    values.odometerText.trim().length > 0 && odometer == null
      ? 'Odometer must be a whole number'
      : undefined;

  const lineItems = normalizeLineItems(values.lineItems);
  const lineItemsSumCents = sumLineItems(values.lineItems);

  let totalMismatch: string | undefined;
  if (
    totalCents != null &&
    totalCents > 0 &&
    lineItemsSumCents != null &&
    lineItemsSumCents !== totalCents
  ) {
    totalMismatch =
      'Line items add up to a different amount than the total. ' +
      'Double-check — you can still save.';
  }

  const isValid =
    date != null &&
    totalCents != null &&
    totalCents > 0 &&
    !serviceTypeError &&
    odometer != null &&
    !odometerError;

  return {
    date,
    dateError,
    serviceTypeError,
    totalCents,
    totalError,
    odometer,
    odometerError,
    lineItems,
    lineItemsSumCents,
    totalMismatch,
    isValid,
  };
}

/** A manual service entry ready to be written to Firestore `service_entries`. */
export interface ManualServiceEntry extends ServiceEntryDoc {
  /** Firestore rules check this denormalized owner field on create. */
  vehicleOwnerId: string;
  /** FR-2.5 line items (matches the OCR draft shape in src/services/ocr.ts). */
  lineItems: LineItem[];
}

/** Build the Firestore document payload from a validated form. Pure. */
export function buildServiceEntryDoc(
  ownerId: string,
  vehicleId: string,
  values: ServiceEntryFormValues,
  validation: ServiceEntryValidation,
  extras?: { provider?: string; notes?: string }
): ManualServiceEntry | null {
  if (!validation.isValid || validation.date == null) return null;
  return {
    uid: '', // assigned by Firestore doc id at write time
    ownerId,
    vehicleOwnerId: ownerId,
    vehicleId,
    date: validation.date,
    odometer: validation.odometer ?? 0,
    serviceType: values.serviceType,
    costCents: validation.totalCents!,
    provider: extras?.provider,
    notes: extras?.notes,
    lineItems: validation.lineItems,
    source: 'manual',
    createdAt: Date.now(),
  };
}
