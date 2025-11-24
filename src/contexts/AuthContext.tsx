'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

interface AuthContextType {
  token: string | null;
  setToken: (token: string | null) => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore token from sessionStorage on mount
  useEffect(() => {
    const storedToken = sessionStorage.getItem('xdb_auth_token');
    if (storedToken) {
      setTokenState(storedToken);
    }
    setIsLoading(false);
  }, []);

  const setToken = (newToken: string | null) => {
    if (newToken) {
      sessionStorage.setItem('xdb_auth_token', newToken);
      setTokenState(newToken);
    } else {
      sessionStorage.removeItem('xdb_auth_token');
      setTokenState(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        setToken,
        isAuthenticated: !!token,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
