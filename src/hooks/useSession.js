
import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '../api/client';

const SessionContext = createContext(null);

export function SessionProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const current = await authApi.me();
      setUser(current);
      return current;
    } catch (error) {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const signIn = useCallback((session) => {
    setUser(session);
  }, []);

  const signOut = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setUser(null);
    }
  }, []);

  const clearSession = useCallback(() => setUser(null), []);

  const value = useMemo(
    () => ({ user, loading, refresh, signIn, signOut, clearSession }),
    [user, loading, refresh, signIn, signOut, clearSession]
  );

  return createElement(SessionContext.Provider, { value }, children);
}

export function useSession() {
  const value = useContext(SessionContext);

  if (!value) {
    throw new Error('useSession must be used inside SessionProvider.');
  }

  return value;
}
