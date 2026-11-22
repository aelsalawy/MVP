import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { } from '../lib/firebase';
import useAuthStore from '../src/hooks/useAuth';

export default function IndexScreen() {
  const router = useRouter();
  const { user, loading } = useAuthStore();

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
