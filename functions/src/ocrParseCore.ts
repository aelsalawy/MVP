/**
 * Pure core of the OCR parse callable (T7.2) — callable-transport-free logic
 * so the gate/increment-after-success ordering is unit-testable with plain
 * mocks (no firebase-functions runtime needed in tests).
 *
 * Contract (D3.1): auth require → canSpendOcr gate BEFORE any OCR spend →
 * parse → increment meter AFTER success. Transport wrapper (wrapOcrParse,
 * ./ocrParse.ts) maps results to HttpsError/return shapes.
 */

import { canSpendOcr, MeteringDb } from './metering';

/** Request payload (mirrors OcrParseOptions on the client). */
export interface OcrParseRequest {
  storagePath: string;
  entryId: string;
  vehicleId: string;
  odometer: number;
}

/** Transport-neutral result for the OCR parse callable.
 *  Every variant carries an `error` key (undefined on success) so narrowing
 *  via `switch (outcome.error)` is sound under strict TS. */
export type OcrParseOutcome =
  | { error: 'unauthenticated'; result?: undefined }
  | { error: 'invalid-argument'; result?: undefined }
  | { error: 'not_configured'; result?: undefined }
  | { error: 'permission-denied'; message: string; result?: undefined }
  | { error: 'parse_failed'; result?: undefined }
  | { error: 'internal'; message: string; result?: undefined }
  | { error: undefined; result: unknown };

/** Parse step seam — parseAndSaveReceipt in production, mock in tests. */
export type OcrParseStep = (
  storagePath: string,
  uid: string
) => Promise<unknown>;

/** Meter increment step seam — incrementOcrMeter in production, mock in tests. */
export type OcrIncrementStep = (uid: string) => Promise<void>;

/**
 * Testable core of wrapOcrParse. Returns an OcrParseOutcome; the onCall
 * wrapper decides HttpsError-vs-return for each error variant.
 */
export async function wrapOcrParseCore(
  db: MeteringDb,
  auth: { uid: string },
  req: Partial<OcrParseRequest>,
  apiKey: string,
  parse: OcrParseStep,
  increment: OcrIncrementStep
): Promise<OcrParseOutcome> {
  if (!auth.uid) {
    return { error: 'unauthenticated' };
  }
  const uid = auth.uid;

  if (!req.storagePath || !req.entryId || !req.vehicleId || req.odometer === undefined) {
    return { error: 'invalid-argument' };
  }

  if (!apiKey) {
    return { error: 'not_configured' };
  }

  // D3.1 gate BEFORE any OCR spend.
  const gate = await canSpendOcr(db, uid);
  if (!gate.allowed) {
    return { error: 'permission-denied', message: gate.reason ?? 'ocr_not_allowed' };
  }

  let draft: unknown;
  try {
    draft = await parse(req.storagePath, uid);
  } catch (err) {
    return { error: 'internal', message: err instanceof Error ? err.message : 'parse error' };
  }

  if (draft === null || draft === undefined) {
    return { error: 'parse_failed' };
  }

  // Increment AFTER success only. ocr.ts treats a failed increment as
  // non-fatal for the main flow; core preserves the parse result regardless.
  try {
    await increment(uid);
  } catch {
    // Meter increment failure does not invalidate a successful parse.
  }

  return { error: undefined, result: draft };
}
