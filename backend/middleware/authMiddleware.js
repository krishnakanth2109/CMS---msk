import admin from 'firebase-admin';
import User from '../models/User.js';

// Initialize Firebase Admin SDK (only once)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKeyId: process.env.FIREBASE_PRIVATE_KEY_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      clientId: process.env.FIREBASE_CLIENT_ID,
    }),
  });
}

export { admin };

/**
 * Protect middleware — verifies Firebase ID token from Authorization header.
 * Expects: Authorization: Bearer <firebase_id_token>
 */
export const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];

      // Verify Firebase ID token
      const decodedToken = await admin.auth().verifyIdToken(token);

      // Attach Firebase UID and email to request
      req.firebaseUser = decodedToken;

      // Optionally fetch your own DB user record using Firebase UID or email
      req.user = await User.findOne({ firebaseUid: decodedToken.uid }).select('-password');

      if (!req.user) {
        return res.status(401).json({ message: 'User not found. Please register first.' });
      }

      next();
    } catch (error) {
      console.error('Auth Middleware Error:', error.message);
      return res.status(401).json({ message: 'Not authorized, token failed or expired.' });
    }
  } else {
    return res.status(401).json({ message: 'Not authorized, no token provided.' });
  }
};

/**
 * Authorize middleware — restricts access based on user role stored in your DB.
 * Must be used AFTER protect middleware.
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `User role '${req.user?.role}' is not authorized to access this route.`,
      });
    }
    next();
  };
};
