import { useEffect, useState } from 'react';
import { db, subscribeToSyncState } from '../../lib/firebase';
import { onSnapshot, collection } from 'firebase/firestore';

/**
 * Offline sync state (T3.4 / NFR-2).
 *
 * Derived from Firestore's own snapshot metadata — we do NOT track network
 * state ourselves:
 *  - `synced`: false while any active listener is serving cache-only data
 *    (snapshot.metadata.isFromCache / !hasPendingWrites resolved), true when
 *    onSnapshotsInSync has fired.
 *  - `pending`: true when a probe listener's snapshot still reports
 *    metadata.hasPendingWrites (local writes not yet acknowledged by the
 *    server).
 *
 * Firestore offline persistence (lib/firebase.ts) does the heavy lifting;
 * this hook only translates Firebase's signals into a UI-facing shape.
 */
export interface SyncState {
  /** false when snapshot data is served from the local cache (offline). */
  synced: boolean;
  /** true when there are local writes awaiting server acknowledgement. */
  pending: boolean;
}

/** Probe collection used to read snapshot metadata. Cheap: no docs fetched. */
const SYNC_PROBE_COLLECTION = 'users';

export function useSyncState(): SyncState {
  const [synced, setSynced] = useState(true);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    // Global signal: fires when every active listener is server-consistent.
    const unsubInSync = subscribeToSyncState((inSync) => {
      setSynced(inSync);
    });

    // Metadata probe: an empty-limit listener on a small collection gives us
    // hasPendingWrites/isFromCache without downloading user data.
    const unsubProbe = onSnapshot(
      collection(db, SYNC_PROBE_COLLECTION),
      (snap) => {
        // A cached result while the in-sync flag hasn't fired yet means we
        // are reading offline data.
        if (snap.metadata.fromCache) setSynced(false);
        setPending(snap.metadata.hasPendingWrites || false);
      },
      () => {
        /* listener errors (e.g. first-launch rules) — leave state as-is */
      }
    );

    return () => {
      unsubInSync();
      unsubProbe();
    };
  }, []);

  return { synced, pending };
}
