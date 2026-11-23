/**
 * useVehicleStats (T5.2): one-shot factual rollup loader.
 *
 * onSnapshot-free by design — fetches ALL pages of history via
 * listHistoryEntries (up to a 500-entry safeguard), then memoizes the
 * pure computeStats rollup over the loaded entries. State is written only
 * after the (async) fetch completes, keyed by vehicleId so switching
 * vehicles immediately renders the loading/empty state without stale data.
 */
import { useEffect, useMemo, useState } from 'react';
import { QueryDocumentSnapshot, DocumentData, Firestore } from 'firebase/firestore';
import { listHistoryEntries, HistoryEntry } from '../services/history';
import { computeStats, VehicleStats } from '../services/stats';

/** Safety cap: stop paginating after this many entries. */
export const STATS_MAX_ENTRIES = 500;

interface LoadResult {
  vehicleId: string;
  entries: HistoryEntry[];
  error: string | null;
}

export interface VehicleStatsState {
  stats: VehicleStats | null;
  entries: HistoryEntry[];
  loading: boolean;
  error: string | null;
}

/**
 * Load all history entries for a vehicle (paged, up to the safeguard) and
 * derive stats. Pass the shared `db` instance so tests can inject.
 */
export function useVehicleStats(
  db: Firestore,
  vehicleId: string | null | undefined
): VehicleStatsState {
  const [result, setResult] = useState<LoadResult | null>(null);

  useEffect(() => {
    if (!vehicleId) return;
    let cancelled = false;
    (async () => {
      try {
        const all: HistoryEntry[] = [];
        let cursor: QueryDocumentSnapshot<DocumentData> | null = null;
        do {
          const page = await listHistoryEntries(db, { vehicleId, cursor });
          all.push(...page.entries);
          cursor = page.nextCursor;
        } while (cursor != null && all.length < STATS_MAX_ENTRIES);
        if (!cancelled) setResult({ vehicleId, entries: all, error: null });
      } catch {
        if (!cancelled) setResult({ vehicleId, entries: [], error: 'Could not load stats.' });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [db, vehicleId]);

  // Discard results from a previous vehicleId (no stale data while loading).
  const current = result && result.vehicleId === vehicleId ? result : null;
  const resultEntries = useMemo(() => current?.entries ?? [], [current]);
  const error = current?.error ?? null;

  const stats = useMemo(
    () => (resultEntries.length > 0 ? computeStats(resultEntries) : null),
    [resultEntries]
  );

  return {
    stats,
    entries: resultEntries,
    loading: current == null && vehicleId != null,
    error,
  };
}
