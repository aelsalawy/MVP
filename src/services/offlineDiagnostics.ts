import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { bannerMessageFor, bannerVisibleFor, type SyncStatus } from '../components/SyncBanner';

/**
 * Offline sync helpers (T3.4 / NFR-2).
 *
 * Firestore's persistent local cache (enabled in lib/firebase.ts) already
 * buffers writes while offline and replays them on reconnect — including the
 * addDoc call in app/(vehicle)/service-entry.tsx, which resolves from the
 * local cache when offline and syncs transparently later. This module only
 * *observes* that state; it never re-implements the queue.
 */

/**
 * Reads the current snapshot-metadata status of a probe listener once and
 * returns the pending-write / cache state. Resolves `null` on listener error
 * (e.g. first launch before auth) — callers treat null as "unknown".
 */
export function readSnapshotStatusOnce(
  onResult: (status: SyncStatus | null) => void
): () => void {
  const unsub = onSnapshot(
    collection(db, 'users'),
    (snap) => {
      onResult({ synced: !snap.metadata.fromCache, pending: snap.metadata.hasPendingWrites || false });
      unsub();
    },
    () => onResult(null)
  );
  return unsub;
}

/**
 * App-start diagnostics (T3.4): log how many writes were still pending sync
 * when the app launched. Uses the Firestore metadata flag as the signal —
 * the JS SDK does not expose a literal pending-writes count; `hasPendingWrites`
 * on the probe snapshot is the supported proxy for "local writes exist".
 */
export function logPendingWritesAtStartup(): void {
  const timeout = setTimeout(() => done(), 5000);
  let finished = false;
  const done = () => {
    if (!finished) {
      finished = true;
      clearTimeout(timeout);
    }
  };
  readSnapshotStatusOnce((status) => {
    if (status && status.pending) {
      console.log('[offline] app started with pending local writes awaiting sync');
    }
    done();
  });
}

// Re-export the pure UI derivations so tests/screens have one import path.
export { bannerVisibleFor, bannerMessageFor };
export type { SyncStatus };
