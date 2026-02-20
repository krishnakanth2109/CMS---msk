import { createContext, useContext, useState, useCallback } from 'react';

const AuthContext = createContext(null);

const API_URL = import.meta.env.VITE_API_URL;
const SESSION_KEY = 'currentUser';

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const stored = sessionStorage.getItem(SESSION_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(false);

  const login = useCallback(async (email, password) => {
    setLoading(true);
    try {
      // Step 1: Sign in via Firebase REST API (no SDK needed)
      const firebaseApiKey = import.meta.env.VITE_FIREBASE_API_KEY;
      const firebaseRes = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${firebaseApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, returnSecureToken: true }),
        }
      );

      const firebaseData = await firebaseRes.json();

      if (!firebaseRes.ok) {
        const code = firebaseData?.error?.message || 'UNKNOWN_ERROR';
        const error = new Error(code);
        error.firebaseCode = code;
        throw error;
      }

      const { idToken, refreshToken } = firebaseData;

      // Step 2: Send idToken to your backend for verification
      const backendRes = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });

      const userData = await backendRes.json();

      if (!backendRes.ok) {
        throw new Error(userData.message || 'Backend login failed.');
      }

      // Step 3: Store user + tokens in sessionStorage
      const sessionData = { ...userData, idToken, refreshToken };
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
      setCurrentUser(sessionData);

      return sessionData;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY);
    setCurrentUser(null);
  }, []);

  const getIdToken = useCallback(() => {
    try {
      const stored = sessionStorage.getItem(SESSION_KEY);
      if (!stored) return null;
      return JSON.parse(stored)?.idToken || null;
    } catch {
      return null;
    }
  }, []);

  const authHeaders = useCallback(() => {
    const token = getIdToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, [getIdToken]);

  const value = {
    currentUser,
    loading,
    login,
    logout,
    getIdToken,
    authHeaders,
    isAuthenticated: !!currentUser,
    userRole: currentUser?.role || null,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}