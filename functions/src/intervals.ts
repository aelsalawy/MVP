/**
 * Manufacturer maintenance-interval ingestion service (T4.1, FR-3.1).
 *
 * Ingests normalized interval rows
 *   { make, model, yearFrom, yearTo, item, intervalMiles, intervalMonths }
 * into the Firestore collection `maintenance_intervals` with a
 * deterministic doc id (make_model_year_item slug), so re-running an
 * import is an idempotent upsert — no duplicates, no churn.
 *
 * Seed data for the top-20 US models lives in `src/data/intervals.seed.json`
 * (see `src/data/README.md`: values are approximations pending licensed data).
 */

import * as admin from 'firebase-admin';
import { onCall } from 'firebase-functions/v2/https';
import * as seedData from './data/intervals.seed.json';

/** Firestore collection holding interval rows. */
export const INTERVALS_COLLECTION = 'maintenance_intervals';

/** Normalized interval row shape (source JSON and Firestore doc). */
export interface IntervalRow {
  make: string;
  model: string;
  /** Inclusive model-year range. */
  yearFrom: number;
  yearTo: number;
  /** snake_case schedule item key, e.g. "oil_change". */
  item: string;
  intervalMiles: number | null;
  intervalMonths: number | null;
}

/**
 * Build the deterministic doc id for an interval row.
 * Example: "toyota_camry_2015-2025_oil_change".
 */
export function intervalSlug(row: Pick<IntervalRow, 'make' | 'model' | 'yearFrom' | 'yearTo' | 'item'>): string {
  return [
    row.make,
    row.model,
    `${row.yearFrom}-${row.yearTo}`,
    row.item,
  ]
    .map((part) => String(part).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, ''))
    .filter((part) => part.length > 0)
    .join('_');
}

/**
 * Validate + coerce a raw JSON record into an IntervalRow.
 * Returns null if the record is unusable.
 */
function normalizeRecord(record: unknown): IntervalRow | null {
  if (typeof record !== 'object' || record === null) {
    return null;
  }
  const r = record as Record<string, unknown>;
  const make = typeof r.make === 'string' ? r.make.trim() : '';
  const model = typeof r.model === 'string' ? r.model.trim() : '';
  const item = typeof r.item === 'string' ? r.item.trim() : '';
  const yearFrom = Number(r.yearFrom);
  const yearTo = Number(r.yearTo);
  if (!make || !model || !item) {
    return null;
  }
  if (!Number.isInteger(yearFrom) || !Number.isInteger(yearTo) || yearFrom > yearTo) {
    return null;
  }
  const intervalMiles = r.intervalMiles == null ? null : Number(r.intervalMiles);
  const intervalMonths = r.intervalMonths == null ? null : Number(r.intervalMonths);
  const milesOk = intervalMiles == null || (Number.isFinite(intervalMiles) && intervalMiles > 0);
  const monthsOk = intervalMonths == null || (Number.isFinite(intervalMonths) && intervalMonths > 0);
  if (!milesOk || !monthsOk || (intervalMiles == null && intervalMonths == null)) {
    return null;
  }
  return {
    make,
    model,
    yearFrom,
    yearTo,
    item,
    intervalMiles: intervalMiles == null ? null : Math.round(intervalMiles),
    intervalMonths: intervalMonths == null ? null : Math.round(intervalMonths),
  };
}

/** Result summary for an import run. */
export interface ImportResult {
  imported: number;
  skipped: number;
}

/**
 * Ingest a normalized interval dataset (array of rows) into Firestore.
 * Idempotent: docs are upserted under deterministic slugs, so re-importing
 * the same data overwrites in place.
 *
 * @param json - parsed JSON (array or object with an `intervals` array)
 * @param db - Firestore instance to write to (defaults to admin.firestore())
 * @returns count of rows imported / skipped (invalid rows)
 * @throws {Error} on invalid input shape or write failure
 */
export async function importIntervals(
  json: unknown,
  db: admin.firestore.Firestore = admin.firestore()
): Promise<ImportResult> {
  const rows: unknown[] = Array.isArray(json)
    ? json
    : json && typeof json === 'object' && Array.isArray((json as { intervals?: unknown[] }).intervals)
      ? (json as { intervals: unknown[] }).intervals
      : [];
  if (rows.length === 0) {
    throw new Error('Invalid interval dataset: expected a non-empty array (or { intervals: [...] })');
  }

  let imported = 0;
  let skipped = 0;

  // Chunk into batches (Firestore caps 500 writes/batch) and commit.
  const BATCH_LIMIT = 450;
  const pending: Array<{ id: string; data: Record<string, unknown> }> = [];
  const seen = new Set<string>();

  for (const record of rows) {
    const row = normalizeRecord(record);
    if (!row) {
      skipped++;
      continue;
    }
    const id = intervalSlug(row);
    if (seen.has(id)) {
      skipped++; // duplicate slug within the same dataset — first wins
      continue;
    }
    seen.add(id);
    pending.push({
      id,
      data: {
        ...row,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
    });
  }

  for (let i = 0; i < pending.length; i += BATCH_LIMIT) {
    const chunk = pending.slice(i, i + BATCH_LIMIT);
    const b = db.batch();
    for (const { id, data } of chunk) {
      b.set(db.collection(INTERVALS_COLLECTION).doc(id), data);
    }
    imported += chunk.length;
  }

  return { imported, skipped };
}

/**
 * Cloud Function wrapper (callable): imports intervals from the bundled
 * seed dataset. Accepts an optional request body overriding the dataset.
 * Idempotent by design — safe to call repeatedly (e.g. on deploy).
 */
export const importIntervalsFn = onCall({ region: 'us-central1' }, async (request) => {
  const json = request.data?.intervals ?? seedData;
  const result = await importIntervals(json);
  return { ok: true, ...result };
});
