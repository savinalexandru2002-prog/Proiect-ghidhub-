import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import {
  auth,
  db,
  googleAuthProvider,
  handleFirestoreError,
  OperationType,
} from './firebase';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  idToken: string | null;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
  authorizedFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [idToken, setIdToken] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const token = await firebaseUser.getIdToken();
          setIdToken(token);

          const userRef = doc(db, 'users', firebaseUser.uid);
          try {
            const snap = await getDoc(userRef);
            if (!snap.exists() && firebaseUser.email) {
              await setDoc(userRef, {
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                displayName: (firebaseUser.displayName || '').slice(0, 120),
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              });
            }
          } catch (err) {
            handleFirestoreError(err, OperationType.WRITE, `users/${firebaseUser.uid}`);
          }
        } catch (err) {
          console.error('Auth initialization error:', err);
        }
      } else {
        setIdToken(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const credential = await signInWithPopup(auth, googleAuthProvider);
    const token = await credential.user.getIdToken();
    setIdToken(token);
  }, []);

  const signOutUser = useCallback(async () => {
    await signOut(auth);
    setIdToken(null);
  }, []);

  const authorizedFetch = useCallback(
    async (input: RequestInfo | URL, init: RequestInit = {}) => {
      const currentUser = auth.currentUser;
      const freshToken = currentUser ? await currentUser.getIdToken() : idToken;
      const headers = new Headers(init.headers || {});
      if (freshToken) {
        headers.set('Authorization', `Bearer ${freshToken}`);
      }
      return fetch(input, { ...init, headers });
    },
    [idToken]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        idToken,
        signInWithGoogle,
        signOutUser,
        authorizedFetch,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}
