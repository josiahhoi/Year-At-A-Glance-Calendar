import { createContext, useContext, useEffect, useSyncExternalStore, type ReactNode } from 'react';
import {
  getAuthStatus,
  initAuth,
  signInInteractive,
  signOut,
  subscribeAuth,
  type AuthStatus,
} from './tokenManager';

interface AuthContextValue {
  status: AuthStatus;
  signIn: () => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const status = useSyncExternalStore(subscribeAuth, getAuthStatus);

  useEffect(() => {
    void initAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ status, signIn: signInInteractive, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth outside AuthProvider');
  return ctx;
}
