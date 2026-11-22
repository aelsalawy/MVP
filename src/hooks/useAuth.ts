import { useEffect, useState, useCallback } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { UserDoc, PlanTier } from '../types';

/**
 * Auth state hook (T1.3 foundation piece): subscribes to Firebase auth state,
 * ensures the users/{uid} doc exists with D3.1 defaults (planTier 'free',
 * ocrMeterCount 0) on first login. Screens drive login/register; this hook
 * owns the listener + user-doc bootstrap.
 */
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(
      auth,
      (u) => {
        setUser(u);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );
    return unsub;
  }, []);

  const ensureUserDoc = useCallback(async (u: User): Promise<void> => {
    const ref = doc(db, 'users', u.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      const newUserDoc: UserDoc = {
        uid: u.uid,
        email: u.email || '',
        displayName: u.displayName || '',
        createdAt: Date.now(),
        planTier: 'free' as PlanTier,
        ocrMeterCount: 0,
      };
      await setDoc(ref, newUserDoc);
    }
  }, []);

  return { user, loading, error, ensureUserDoc };
}
