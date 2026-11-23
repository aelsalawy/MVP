import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  onSnapshotsInSync,
} from 'firebase/firestore';
import {
  getAuth,
  initializeAuth,
  Persistence,
  type Dependencies,
} from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as firebaseAuthModule from 'firebase/auth';

/**
 * Firebase client configuration for Car Tracker MVP.
 *
 * Values are injected at build time from EXPO_PUBLIC_* environment variables
 * (see .env.example). Never hard-code secrets here — the config below is
 * intentionally non-secret (Firebase web config keys are public by design).
 */
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// Ensure exactly one Firebase app instance (HMR / Fast Refresh safe).
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

const authPersistence = (() => {
  // `getReactNativePersistence` is exported by the React Native platform build
  // of firebase/auth (resolved by Metro); TypeScript resolves the node/web
  // typings where it isn't declared, hence the namespace cast.
  const rnAuth = firebaseAuthModule as unknown as {
    getReactNativePersistence: (storage: unknown) => Persistence;
  };
  return rnAuth.getReactNativePersistence(AsyncStorage);
})();

/**
 * Auth with durable persistence (T3.4 / NFR-2): login survives app restarts
 * on React Native via AsyncStorage, so offline launches don't bounce the user
 * back to the login screen before the network is up.
 */
const auth =
  getApps().length > 0
    ? getAuth(app)
    : initializeAuth(app, { persistence: [authPersistence] } as Dependencies);

/**
 * Firestore with explicit offline persistence (T3.4 / NFR-2).
 *
 * persistentLocalCache enables the on-disk IndexedDB/SQLite cache so reads
 * and writes work offline; persistentMultipleTabManager is safe in Expo and
 * keeps multiple web views/tabs consistent. With persistence enabled, write
 * calls (e.g. addDoc in service-entry.tsx) return as soon as data is written
 * to the local cache and replay automatically against the server later —
 * the manual entry flow therefore queues while offline *natively*, without
 * any queue code in the screens.
 */
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});

export const storage = getStorage(app);

/**
 * Stream of sync-state changes (T3.4 / NFR-2): fires `true` when all active
 * snapshot listeners are in sync with the server (no cached / pending data),
 * `false` otherwise. Consumed by src/hooks/useSyncState.ts to drive the
 * offline banner UI. Returns an unsubscribe function.
 */
export function subscribeToSyncState(onChange: (inSync: boolean) => void): () => void {
  return onSnapshotsInSync(db, () => onChange(true));
}

export { app, auth };
