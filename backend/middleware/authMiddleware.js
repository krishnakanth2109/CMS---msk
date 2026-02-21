import admin from 'firebase-admin';
import User from '../models/User.js';

// Initialize Firebase Admin SDK (only once)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId:    process.env.FIREBASE_PROJECT_ID,
      privateKeyId: process.env.FIREBASE_PRIVATE_KEY_ID,
      privateKey:   process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      clientEmail:  process.env.FIREBASE_CLIENT_EMAIL,
      clientId:     process.env.FIREBASE_CLIENT_ID,
    }),
  });
}

export { admin };

/**
 * protect — verifies Firebase ID token from the Authorization header.
 *
 * Flow:
 *  1. Extract Bearer token from Authorization header
 *  2. Verify with Firebase Admin SDK
 *  3. Look up MongoDB user by firebaseUid
 *  4. Fallback: look up by email (for existing users missing firebaseUid)
 *     and auto-sync the firebaseUid so future lookups work correctly
 */
export const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  // Ensure header exists and starts with Bearer
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Not authorized, no token provided.' });
  }

  try {
    const token = authHeader.split(' ')[1];

    // 🔴 THE FIX: Prevent literal string "null" or "undefined" from hitting Firebase
    if (!token || token === 'null' || token === 'undefined') {
      return res.status(401).json({ message: 'Not authorized, invalid token provided.' });
    }

    // Verify the Firebase ID token
    const decodedToken = await admin.auth().verifyIdToken(token);
    const { uid, email } = decodedToken;

    req.firebaseUser = decodedToken;

    // Primary lookup: by firebaseUid
    let user = await User.findOne({ firebaseUid: uid }).select('-password');

    // Fallback: by email — handles legacy accounts or newly-created recruiters
    // where firebaseUid wasn't stored yet
    if (!user && email) {
      user = await User.findOne({ email }).select('-password');
      if (user) {
        // Auto-sync the firebaseUid so future lookups are fast
        user.firebaseUid = uid;
        await user.save();
        console.log(`[Auth] Auto-synced firebaseUid for user: ${email}`);
      }
    }

    if (!user) {
      return res.status(401).json({ message: 'User not found. Please contact admin.' });
    }

    if (user.active === false) {
      return res.status(401).json({ message: 'Account is deactivated. Contact admin.' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth Middleware Error:', error.message);

    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({ message: 'Session expired. Please login again.' });
    }
    return res.status(401).json({ message: 'Not authorized, token failed or expired.' });
  }
};

/**
 * authorize — restricts access by role. Must come after protect.
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Role '${req.user?.role}' is not authorized for this route.`,
      });
    }
    next();
  };
};