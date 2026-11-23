/**
 * Runtime entitlements hook (T7.1, D3.1).
 *
 * Mirrors src/entitlements/index.ts hasEntitlement/getEntitlementLimit but
 * feeds the LIVE users/{uid}.planTier (onSnapshot) instead of a passed-in
 * tier string. The canonical matrix is IMPORTED — never duplicated here.
 *
 * Fail-closed: unknown tier / unknown feature / no uid / snapshot pending →
 * has() === false, limit() === 0. Gates may rely on this for real; the
 * server-side rules remain the authoritative enforcement layer regardless.
 *
 * Display-only limits (e.g. OCR meter badge) live in useOcrMeter (T7.2).
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { onSnapshot, doc, FirestoreError } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import {
  hasEntitlement,
  getEntitlementLimit,
  Tier,
} from '../entitlements';

export interface UseEntitlementsResult {
  /** Live users/{uid}.planTier ('' while pending / unknown). */
  planTier: string;
  /** Fail-closed runtime gate: live tier + canonical matrix. */
  has: (featureKey: string) => boolean;
  /** Fail-closed numeric limit (Infinity = unlimited; 0 = no access / unknown). */
  limit: (featureKey: string) => number;
  /** True while uid present but first snapshot pending. */
  loading: boolean;
  error: string | null;
}

/**
 * Live-tier entitlements: subscribes to users/{uid} and exposes has()/limit()
 * backed by the canonical ENTITLEMENTS map. No uid → fail-closed everything.
 */
export function useEntitlements(uid: string | null | undefined): UseEntitlementsResult {
  const [planTier, setPlanTier] = useState('');
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) {
      // Derived return below masks any stale tier once uid clears.
      return;
    }
    const unsub = onSnapshot(
      doc(db, 'users', uid),
      (snap) => {
        const data = snap.data() ?? {};
        setPlanTier(typeof data.planTier === 'string' ? data.planTier : '');
        setReady(true);
        setError(null);
      },
      (err: FirestoreError) => {
        setError(err.message);
        setReady(true);
      }
    );
    return unsub;
  }, [uid]);

  const has = useCallback(
    (featureKey: string) => hasEntitlement(planTier, featureKey),
    [planTier]
  );
  const limit = useCallback(
    (featureKey: string) => getEntitlementLimit(planTier, featureKey),
    [planTier]
  );

  const hasUid = !!uid;
  return useMemo(
    () => ({
      planTier,
      has,
      limit,
      loading: hasUid && !ready,
      error,
    }),
    [planTier, has, limit, hasUid, ready, error]
  );
}

/** Type re-export so callers can reference tiers without touching the module map. */
export type { Tier };

export default useEntitlements;
