/**
 * OCR parse callable (T7.2, FR-2.2) — the SERVER-side entitlement gate (D3.1).
 *
 * Thin transport wrapper: auth require → canSpendOcr gate (BEFORE any OCR
 * spend) → parse (parseAndSaveReceipt from ./ocr, which increments the meter
 * after success) → return parse result or graceful {error:'not_configured'}.
 * All logic lives in ./ocrParseCore (pure, unit-tested); this file only
 * bridges firebase-functions onCall transport + admin SDK.
 *
 * Uses admin.firestore directly: Cloud Functions trust the Admin SDK
 * (bypasses rules); access control is the auth check + canSpendOcr.
 */

import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { parseAndSaveReceipt } from './ocr';
import { wrapOcrParseCore, OcrParseRequest } from './ocrParseCore';

/** OpenAI API key — from env (Cloud Functions config). */
const OPENAI_API_KEY: string = process.env.OPENAI_API_KEY ?? '';

/**
 * wrapOcrParse (T7.2): Callable wrapper for the T3.2 OCR flow.
 * Auth-requires; enforces the server-side metering gate; on parse success
 * the meter is incremented by the parse step (functions/src/ocr.ts).
 * Unconfigured provider degrades gracefully to {error:'not_configured'}.
 */
export const wrapOcrParse = onCall({ region: 'us-central1' }, async (request) => {
  // Auth require — unauthenticated callers are rejected before any spend.
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Authentication required for OCR parse');
  }

  const req = (request.data ?? {}) as Partial<OcrParseRequest>;

  const outcome = await wrapOcrParseCore(
    admin.firestore(),
    { uid: request.auth.uid },
    req,
    OPENAI_API_KEY,
    // OCR spend + save; incrementOcrMeter is called by parseAndSaveReceipt
    // AFTER a successful parse (functions/src/ocr.ts step 4).
    (storagePath, uid) =>
      parseAndSaveReceipt(
        storagePath,
        admin.firestore(),
        uid,
        req.entryId as string,
        req.vehicleId as string,
        req.odometer as number,
        OPENAI_API_KEY
      ),
    async (uid) => {
      const { incrementOcrMeter } = await import('./ocr');
      await incrementOcrMeter(admin.firestore(), uid);
    }
  );

  switch (outcome.error) {
    case undefined:
      return { result: outcome.result };
    case 'unauthenticated':
      throw new HttpsError('unauthenticated', 'Authentication required for OCR parse');
    case 'invalid-argument':
      throw new HttpsError('invalid-argument', 'Missing required parameters for OCR parse');
    case 'permission-denied':
      throw new HttpsError('permission-denied', outcome.message);
    case 'parse_failed':
      return { error: 'parse_failed' as const };
    case 'not_configured':
      return { error: 'not_configured' as const };
    case 'internal':
      return { error: 'parse_failed' as const, message: outcome.message };
  }
});
