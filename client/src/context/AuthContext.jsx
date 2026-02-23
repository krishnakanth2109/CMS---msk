import { createContext, useContext, useState, useCallback } from 'react';

const AuthContext = createContext(null);

const API_URL     = import.meta.env.VITE_API_URL;   // e.g. "http://localhost:5000"
const FB_API_KEY  = import.meta.env.VITE_FIREBASE_API_KEY;
const SESSION_KEY = 'currentUser';

// ─────────────────────────────────────────────────────────────────────────────
// Decode JWT exp field without any library
// ─────────────────────────────────────────────────────────────────────────────
const getTokenExpiry = (token) => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000; // seconds → ms
  } catch {
    return 0;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// refreshFirebaseToken
// Exchanges the stored refreshToken for a new idToken silently.
// Firebase ID tokens expire after 1 hour — this keeps the session alive.
// ─────────────────────────────────────────────────────────────────────────────
const refreshFirebaseToken = async () => {
  try {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (!stored) return null;

    const session = JSON.parse(stored);
    const { refreshToken } = session;
    if (!refreshToken) return null;

    const res = await fetch(
      `https://securetoken.googleapis.com/v1/token?key=${FB_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(refreshToken)}`,
      }
    );

    if (!res.ok) {
      console.warn('[Auth] Token refresh failed — user must re-login.');
      return null;
    }

    const data = await res.json();
    const newIdToken      = data.id_token;
    const newRefreshToken = data.refresh_token; // Firebase may rotate this

    // Update session storage with fresh tokens
    const updated = { ...session, idToken: newIdToken, refreshToken: newRefreshToken };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(updated));
    console.log('[Auth] Token refreshed successfully.');
    return newIdToken;
  } catch (err) {
    console.error('[Auth] Token refresh error:', err.message);
    return null;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// getValidToken
// Returns a guaranteed-fresh token. Refreshes if expiring within 5 minutes.
// ─────────────────────────────────────────────────────────────────────────────
const getValidToken = async () => {
  try {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (!stored) return null;

    const { idToken } = JSON.parse(stored);
    if (!idToken) return null;

    const expiresAt    = getTokenExpiry(idToken);
    const FIVE_MINUTES = 5 * 60 * 1000;

    if (Date.now() >= expiresAt - FIVE_MINUTES) {
      console.log('[Auth] Token expiring soon — refreshing...');
      return await refreshFirebaseToken();
    }

    return idToken;
  } catch {
    return null;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// AuthProvider
// ─────────────────────────────────────────────────────────────────────────────
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
      // Step 1: Firebase REST API sign-in
      const firebaseRes = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FB_API_KEY}`,
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

      // Step 2: Verify with backend
      const backendRes = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });

      const userData = await backendRes.json();
      if (!backendRes.ok) throw new Error(userData.message || 'Backend login failed.');

      // Step 3: Persist user data + BOTH tokens in sessionStorage
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

  // Returns a fresh valid token — auto-refreshes if expired
  const getIdToken = useCallback(async () => {
    return await getValidToken();
  }, []);

  // ── authHeaders ─────────────────────────────────────────────────────────
  // ⚠️  ASYNC — always await this:
  //   const headers = await authHeaders();
  // ────────────────────────────────────────────────────────────────────────
  const authHeaders = useCallback(async () => {
    const token = await getValidToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

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