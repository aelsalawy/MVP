import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { } from '../lib/firebase';
import { logPendingWritesAtStartup } from '../src/services/offlineDiagnostics';
import useAuthStore from '../src/hooks/useAuth';

export default function IndexScreen() {
  const router = useRouter();
  const { user, loading } = useAuthStore();

  // T3.4 / NFR-2: on app start, log the count of local writes still awaiting
  // server sync (offline resilience diagnostics; Firestore replays them).
  useEffect(() => {
    logPendingWritesAtStartup();
  }, []);

  // useAuth hook handles initialization automatically via onAuthStateChanged

  useEffect(() => {
    // Handle redirect based on auth state
    if (!loading) {
      if (user) {
        router.replace('/(tabs)');
      } else {
        router.replace('/login');
      }
    }
  }, [user, loading, router]);

  return null;
}
