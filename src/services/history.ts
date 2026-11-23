/**
 * History query helpers (T5.1, FR-2.5).
 *
 * Plain async helpers — no React Native imports — so they can be unit-tested
 * in a plain node environment and reused by any screen. Firestore access is
 * injected (`db` + optional `queryFn`) to keep this module pure-ish.
 */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  deleteDoc,
  updateDoc,
  Firestore,
  QueryDocumentSnapshot,
  DocumentData,
} from 'firebase/firestore';
import { ServiceEntryDoc } from '../types';
import { LineItem } from './entryValidation';

/** Page size for the history list (FR-2.5). */
export const HISTORY_PAGE_SIZE = 20;

/** Stored entry shape (ServiceEntryDoc + optional line items written by the form). */
export interface HistoryEntry extends ServiceEntryDoc {
  lineItems?: LineItem[];
  /** Firestore doc id (ServiceEntryDoc.uid is not stored in the doc body). */
  id: string;
}

/** One page of history results + an opaque cursor for "Load more". */
export interface HistoryPage {
  entries: HistoryEntry[];
  /** Pass to listHistoryEntries as `cursor` for the next page. Null when done. */
  nextCursor: QueryDocumentSnapshot<DocumentData> | null;
}

/**
 * List service entries for a vehicle, newest first (FR-2.5).
 * Paginates `HISTORY_PAGE_SIZE` per call; pass the previous page's
 * `nextCursor` to fetch the next page.
 */
export async function listHistoryEntries(
  db: Firestore,
  opts: {
    vehicleId: string;
    cursor?: QueryDocumentSnapshot<DocumentData> | null;
    pageSize?: number;
  }
): Promise<HistoryPage> {
  const { vehicleId, cursor, pageSize = HISTORY_PAGE_SIZE } = opts;
  const constraints = [
    where('vehicleId', '==', vehicleId),
    orderBy('date', 'desc'),
    limit(pageSize),
  ];
  const q = cursor
    ? query(collection(db, 'service_entries'), ...constraints, startAfter(cursor))
    : query(collection(db, 'service_entries'), ...constraints);
  const snap = await getDocs(q);
  const entries = snap.docs.map((d) => {
    const data = d.data() as HistoryEntry;
    return { ...data, id: d.id };
  });
  return {
    entries,
    nextCursor: snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null,
  };
}

/** Fetch a single service entry by Firestore doc id. Null when missing. */
export async function getHistoryEntry(
  db: Firestore,
  entryId: string
): Promise<HistoryEntry | null> {
  const snap = await getDoc(doc(db, 'service_entries', entryId));
  if (!snap.exists()) return null;
  return { ...(snap.data() as HistoryEntry), id: snap.id };
}

/** Fields a user can edit on an existing entry (T5.1 edit flow). */
export interface HistoryEntryUpdate {
  date: number; // epoch ms
  odometer: number;
  serviceType: string;
  costCents: number;
  provider?: string;
  notes?: string;
  lineItems?: LineItem[];
}

/** Update an existing service entry (owner-checked server-side by rules). */
export async function updateHistoryEntry(
  db: Firestore,
  entryId: string,
  update: HistoryEntryUpdate
): Promise<void> {
  await updateDoc(doc(db, 'service_entries', entryId), { ...update });
}

/**
 * Hard-delete a service entry. ServiceEntryDoc has no soft-delete flag
 * (src/types), so deletion is a real delete; NFR-4 account-deletion
 * semantics are out of scope here.
 */
export async function deleteHistoryEntry(db: Firestore, entryId: string): Promise<void> {
  await deleteDoc(doc(db, 'service_entries', entryId));
}

/** Format epoch ms as a human date, e.g. "Nov 12, 2026". */
export function formatEntryDate(epochMs: number): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(epochMs));
}

/** Format integer cents as a display money string, e.g. 12345 → "$123.45". */
export function formatCents(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(Math.round(cents));
  return `${sign}$${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
}
