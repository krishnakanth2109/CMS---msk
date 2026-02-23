import { createContext, useContext, useState, useCallback } from 'react';

const AuthContext = createContext(null);

const API_URL     = import.meta.env.VITE_API_URL;
const FB_API_KEY  = import.meta.env.VITE_FIREBASE_API_KEY;
const SESSION_KEY = 'currentUser';

// ─────────────────────────────────────────────────────────────────────────────
// 9-HOUR SESSION
// We store a sessionExpiry timestamp at login time: Date.now() + 9hrs.
// Every token read checks this FIRST before refreshing.
// Firebase tokens themselves expire every 1 hour — we refresh them silently
// via the refreshToken, but the hard wall-clock limit is 9 hours from login.
// ─────────────────────────────────────────────────────────────────────────────
const SESSION_DURATION_MS = 9 * 60 * 60 * 1000; // 9 hours in ms

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
// isSessionExpired — checks the 9-hour wall-clock cap
// ─────────────────────────────────────────────────────────────────────────────
const isSessionExpired = (session) => {
  if (!session?.sessionExpiry) return true;
  return Date.now() > session.sessionExpiry;
};

// ─────────────────────────────────────────────────────────────────────────────
// refreshFirebaseToken
// Uses the stored refreshToken to get a new Firebase ID token silently.
// Called automatically when the 1-hour Firebase token is about to expire.
// Will bail out and return null if the 9-hour session has already ended.
// ─────────────────────────────────────────────────────────────────────────────
const refreshFirebaseToken = async () => {
  try {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (!stored) return null;

    const session = JSON.parse(stored);

    // 9-hour hard cap — don't refresh if the session has expired
    if (isSessionExpired(session)) {
      console.warn('[Auth] 9-hour session expired. Clearing session.');
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }

    const { refreshToken } = session;
    if (!refreshToken) return null;

    const res = await fetch(
      `https://securetoken.googleapis.com/v1/token?key=${FB_API_KEY}`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body:    `grant_type=refresh_token&refresh_token=${encodeURIComponent(refreshToken)}`,
      }
    );

    if (!res.ok) {
      console.warn('[Auth] Firebase token refresh failed — re-login required.');
      return null;
    }

    const data = await res.json();
    const newIdToken      = data.id_token;
    const newRefreshToken = data.refresh_token; // Firebase may rotate this

    // Persist the new tokens but deliberately KEEP the original sessionExpiry
    // so the 9-hour clock cannot be extended by token refreshes
    const updated = { ...session, idToken: newIdToken, refreshToken: newRefreshToken };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(updated));
    console.log('[Auth] Firebase ID token refreshed silently.');
    return newIdToken;
  } catch (err) {
    console.error('[Auth] Token refresh error:', err.message);
    return null;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// getValidToken
// Central token getter used by authHeaders() and getIdToken().
// Order of checks:
//   1. 9-hour session wall-clock expired? → null (force re-login)
//   2. Firebase ID token expiring within 5 min? → silently refresh
//   3. Token still valid → return as-is
// ─────────────────────────────────────────────────────────────────────────────
const getValidToken = async () => {
  try {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (!stored) return null;

    const session = JSON.parse(stored);

    // 1. Check 9-hour session hard cap
    if (isSessionExpired(session)) {
      console.warn('[Auth] 9-hour session expired. Clearing session.');
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }

    const { idToken } = session;
    if (!idToken) return null;

    // 2. Check Firebase 1-hour token expiry (refresh 5 min early)
    const expiresAt    = getTokenExpiry(idToken);
    const FIVE_MINUTES = 5 * 60 * 1000;

    if (Date.now() >= expiresAt - FIVE_MINUTES) {
      console.log('[Auth] Firebase token expiring soon — refreshing silently...');
      return await refreshFirebaseToken();
    }

    // 3. Token still valid
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
      if (!stored) return null;
      const session = JSON.parse(stored);
      // On app load: clear immediately if 9-hour session already elapsed
      if (isSessionExpired(session)) {
        sessionStorage.removeItem(SESSION_KEY);
        return null;
      }
      return session;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(false);

  // ── login ────────────────────────────────────────────────────────────────
  const login = useCallback(async (email, password) => {
    setLoading(true);
    try {
      // Step 1: Firebase REST API — sign in with email/password
      const firebaseRes = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FB_API_KEY}`,
        {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ email, password, returnSecureToken: true }),
        }
      );

      const firebaseData = await firebaseRes.json();
      if (!firebaseRes.ok) {
        const code  = firebaseData?.error?.message || 'UNKNOWN_ERROR';
        const error = new Error(code);
        error.firebaseCode = code;
        throw error;
      }

      const { idToken, refreshToken } = firebaseData;

      // Step 2: Verify with backend — backend looks up user in MongoDB
      const backendRes = await fetch(`${API_URL}/api/auth/login`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ idToken }),
      });

      const userData = await backendRes.json();
      if (!backendRes.ok) throw new Error(userData.message || 'Backend login failed.');

      // Step 3: Persist everything in sessionStorage
      // sessionExpiry = now + 9 hours — this is the hard wall-clock limit
      const sessionData = {
        ...userData,
        idToken,
        refreshToken,
        sessionExpiry: Date.now() + SESSION_DURATION_MS,
      };

      sessionStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
      setCurrentUser(sessionData);

      const expiryTime = new Date(sessionData.sessionExpiry).toLocaleTimeString();
      console.log(`[Auth] Login successful. Session expires at ${expiryTime} (9 hours).`);

      return sessionData;
    } finally {
      setLoading(false);
    }
  }, []);

  // ── logout ───────────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY);
    setCurrentUser(null);
    console.log('[Auth] User logged out — session cleared.');
  }, []);

  // ── getIdToken ───────────────────────────────────────────────────────────
  // Returns a guaranteed-fresh Firebase ID token (auto-refreshes if needed)
  const getIdToken = useCallback(async () => {
    return await getValidToken();
  }, []);

  // ── authHeaders ──────────────────────────────────────────────────────────
  // ⚠️  THIS FUNCTION IS ASYNC — it MUST be awaited at every call site:
  //
  //       const headers = await authHeaders();
  //       fetch(url, { headers: { 'Content-Type': 'application/json', ...headers } })
  //
  // Returns { Authorization: 'Bearer <token>' } or {} if no valid token.
  // ─────────────────────────────────────────────────────────────────────────
  const authHeaders = useCallback(async () => {
    const token = await getValidToken();
    if (!token) {
      console.warn('[Auth] authHeaders: no valid token — request will be unauthorized.');
      return {};
    }
    return { Authorization: `Bearer ${token}` };
  }, []);

  const value = {
    currentUser,
    loading,
    login,
    logout,
    getIdToken,
    authHeaders,          // async — MUST be awaited
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