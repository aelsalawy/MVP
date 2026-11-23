/**
 * Client OCR meter display hook (T7.2, D3.1).
 *
 * DISPLAY ONLY — reads users/{uid}.planTier + ocrMeterCount for UI (e.g. a
 * "X/10 scans used" badge or cosmetic disable). NEVER gates actions for real:
 * the authoritative gate is the server-side canSpendOcr callable
 * (functions/src/metering.ts). A cosmetic disable here is UX sugar only;
 * the server enforces regardless.
 *
 * Tier list: src/entitlements/index.ts TIERS (client single source of truth).
 * Monthly OCR limits: DUPLICATED from functions/src/tiers.ts
 * (OCR_MONTHLY_LIMITS / OCR_FREE_MONTHLY_LIMIT) — functions cannot import
 * app code and the client cannot import the functions package, so this
 * documented duplication is the D3.1 pattern; keep both in sync.
 */

import { useState, useEffect } from 'react';
import { onSnapshot, doc, FirestoreError } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { TIERS, Tier } from '../entitlements';

/**
 * Monthly OCR meter caps per tier — mirror of functions/src/tiers.ts
 * OCR_MONTHLY_LIMITS (server enforces; this copy is display-only).
 */
const OCR_MONTHLY_LIMITS: Record<Tier, number> = { free: 10, advanced: Infinity, pro: Infinity };

/** Fail-closed display hint: unknown tier → no known limit shown. */
function displayLimit(planTier: string): number {
  return (TIERS as readonly string[]).includes(planTier)
    ? OCR_MONTHLY_LIMITS[planTier as Tier]
    : NaN;
}

export interface OcrMeterState {
  /** Users/{uid}.planTier (T1.2 schema field). */
  planTier: string;
  /** Users/{uid}.ocrMeterCount (T7.2 field, server-incremented). */
  ocrMeterCount: number;
  /** Tier's monthly OCR limit (Infinity = unlimited; NaN = unknown tier). */
  monthlyLimit: number;
  /** Scans remaining this month (Infinity = unlimited; null = unknown). */
  remaining: number | null;
  /** Cosmetic disable hint — server still enforces the real gate. */
  cosmeticallyExhausted: boolean;
}

/**
 * Live-read users/{uid} planTier + ocrMeterCount for display.
 * Returns {state, loading, error}; state is null while uid is unset or the
 * first snapshot is pending.
 */
export function useOcrMeter(uid: string | null | undefined) {
  const [state, setState] = useState<OcrMeterState | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // No uid → nothing to subscribe to; derived return below masks stale state.
    if (!uid) {
      return;
    }

    const unsub = onSnapshot(
      doc(db, 'users', uid),
      (snap) => {
        const data = snap.data() ?? {};
        const planTier = typeof data.planTier === 'string' ? data.planTier : '';
        const ocrMeterCount = typeof data.ocrMeterCount === 'number' ? data.ocrMeterCount : 0;
        // Fail-closed DISPLAY only: unknown tier → no known limit; the
        // server gate (canSpendOcr) independently fails closed on unknown tier.
        const limit = displayLimit(planTier);
        const unlimited = limit === Infinity;
        setState({
          planTier,
          ocrMeterCount,
          monthlyLimit: limit,
          remaining: unlimited
            ? Infinity
            : Number.isNaN(limit)
              ? null
              : Math.max(0, limit - ocrMeterCount),
          cosmeticallyExhausted: !unlimited && (Number.isNaN(limit) || ocrMeterCount >= limit),
        });
      },
      (err: FirestoreError) => {
        setError(err.message);
      }
    );
    return unsub;
  }, [uid]);

  // Derived: no uid (or errored) → no display state, not "loading forever".
  const hasUid = !!uid;
  return {
    state: hasUid ? state : null,
    loading: hasUid && !error && state === null,
    error,
  };
}

export default useOcrMeter;
