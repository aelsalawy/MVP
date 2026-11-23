/**
 * Server-side OCR usage metering (T7.2, D3.1).
 *
 * ENTITLEMENT GATE IS SERVER-SIDE ONLY: canSpendOcr is called by the OCR
 * callable (./ocrParse.ts) BEFORE any OCR spend; the client meter hook
 * (src/hooks/useOcrMeter.ts) is display-only and NEVER enforces access.
 *
 * Fail-closed per D3.1: unknown or missing planTier → spend denied.
 * Tier comparison goes through ./tiers (shared constants mirroring the
 * canonical client matrix src/entitlements/index.ts) — no hardcoded tier
 * strings in this module.
 */

import { isKnownTier, OCR_MONTHLY_LIMITS } from './tiers';

/**
 * Minimal Firestore surface needed by metering — a structural subset of
 * admin.firestore.Firestore, so unit tests can mock it without real
 * Firestore (no firebase-admin runtime import in this module).
 */
export interface MeteringDb {
  collection(path: string): {
    doc(id: string): {
      get(): Promise<{ exists: boolean; data(): Record<string, unknown> | undefined }>;
    };
  };
}

/** D3.1 snapshot: user doc fields read for the gate. */
export interface EntitlementSnapshot {
  /** Exact user-doc field: users/{uid}.planTier (src/types/index.ts UserDoc). */
  planTier: string | null;
  /** Exact user-doc field: users/{uid}.ocrMeterCount (src/types/index.ts UserDoc). */
  ocrMeterCount: number;
}

export interface OcrSpendDecision {
  allowed: boolean;
  reason: string | null;
}

/**
 * Read tier + OCR meter from the user doc (users/{uid}).
 * Missing doc / missing fields → nulls/zeros so the gate fails closed.
 */
export async function readEntitlements(db: MeteringDb, uid: string): Promise<EntitlementSnapshot> {
  if (!uid) {
    return { planTier: null, ocrMeterCount: 0 };
  }
  const snap = await db.collection('users').doc(uid).get();
  if (!snap.exists) {
    return { planTier: null, ocrMeterCount: 0 };
  }
  const data = snap.data() ?? {};
  const planTier = typeof data.planTier === 'string' ? data.planTier : null;
  const ocrMeterCount = typeof data.ocrMeterCount === 'number' ? data.ocrMeterCount : 0;
  return { planTier, ocrMeterCount };
}

/**
 * Server-side OCR spend gate (D3.1).
 * Fails CLOSED on unknown/missing tier; allows while ocrMeterCount is below
 * the tier's monthly limit from the entitlements matrix (see ./tiers).
 */
export async function canSpendOcr(db: MeteringDb, uid: string): Promise<OcrSpendDecision> {
  const { planTier, ocrMeterCount } = await readEntitlements(db, uid);
  if (!isKnownTier(planTier)) {
    return { allowed: false, reason: 'unknown_tier' };
  }
  const limit = OCR_MONTHLY_LIMITS[planTier];
  return ocrMeterCount < limit
    ? { allowed: true, reason: null }
    : { allowed: false, reason: 'meter_exhausted' };
}
