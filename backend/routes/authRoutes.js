import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  loginUser,
  registerUser,
  getUserProfile,
  updateUserProfile,
  forgotPassword,
} from '../controllers/authController.js';

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// SERVER-SIDE OTP STORE
// Key:   email string
// Value: { code: string, expiresAt: number, verified: boolean }
// Scoped to this Node process. Replace with Redis for multi-instance deployments.
// ─────────────────────────────────────────────────────────────────────────────
const otpStore  = new Map();
const OTP_TTL   = 10 * 60 * 1000; // 10 minutes in ms

const makeOTP = () => String(Math.floor(100000 + Math.random() * 900000));

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/send-otp
//
// 1. Authenticate the caller (protect middleware checks Bearer token).
// 2. Confirm email belongs to the authenticated user.
// 3. Generate a 6-digit OTP, store it server-side with a 10-min TTL.
// 4. Deliver the OTP to the user's inbox using Firebase's own email system
//    (accounts:sendOobCode REST API — PASSWORD_RESET type).
//    Firebase sends its own branded email; we embed the OTP code in the
//    continueUrl so the user can also read it from the link if needed,
//    but the primary UX is: user reads the 6 digits from the email subject
//    (set via Firebase Console → Authentication → Email Templates).
//
// Required env var: FIREBASE_WEB_API_KEY  (same value as VITE_FIREBASE_API_KEY)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/send-otp', protect, async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Email is required.' });
  }

  if (req.user.email !== email) {
    return res.status(403).json({ message: 'Not authorized to send OTP to this email.' });
  }

  try {
    // Generate and store OTP server-side
    const code = makeOTP();
    otpStore.set(email, { code, expiresAt: Date.now() + OTP_TTL, verified: false });
    console.log(`[OTP] Generated for ${email}: ${code}`);

    const webApiKey = process.env.FIREBASE_WEB_API_KEY;
    if (!webApiKey) {
      console.warn('[OTP] FIREBASE_WEB_API_KEY not set in .env — email not sent.');
      return res.status(200).json({
        message: 'OTP generated (dev mode — FIREBASE_WEB_API_KEY missing). Check server console.',
        ...(process.env.NODE_ENV !== 'production' && { devOtp: code }),
      });
    }

    // Embed OTP in the continueUrl — if user clicks the Firebase reset link
    // they land on /settings?otp=XXXXXX and the field auto-fills.
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const continueUrl = `${frontendUrl}/settings?otp=${code}`;

    // Call Firebase REST API to trigger a real email from Firebase's servers
    const fbRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${webApiKey}`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestType: 'PASSWORD_RESET',
          email,
          continueUrl,
        }),
      }
    );

    const fbData = await fbRes.json();

    if (!fbRes.ok) {
      console.error('[OTP] Firebase email error:', fbData?.error?.message);
      // OTP is still stored — return success so user can proceed in dev
      return res.status(200).json({
        message: 'OTP generated but email delivery failed. Check server logs.',
        ...(process.env.NODE_ENV !== 'production' && { devOtp: code }),
      });
    }

    console.log(`[OTP] Email sent to ${email} via Firebase ✓`);
    res.status(200).json({ message: `OTP sent to ${email}. Check your inbox.` });

  } catch (err) {
    console.error('[OTP] send-otp error:', err);
    res.status(500).json({ message: 'Failed to send OTP. Please try again.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/verify-otp
//
// Checks the code the user typed against the server-side store.
// On success, marks the entry as verified so /change-password will proceed.
// Does NOT change the password yet.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/verify-otp', protect, async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ message: 'Email and OTP are required.' });
  }

  if (req.user.email !== email) {
    return res.status(403).json({ message: 'Not authorized.' });
  }

  const stored = otpStore.get(email);

  if (!stored) {
    return res.status(400).json({ message: 'No OTP found. Please request a new one.' });
  }

  if (Date.now() > stored.expiresAt) {
    otpStore.delete(email);
    return res.status(400).json({ message: 'OTP expired. Please request a new one.' });
  }

  if (String(otp).trim() !== stored.code) {
    return res.status(400).json({ message: 'Incorrect OTP. Please try again.' });
  }

  // Mark verified and reset the expiry clock for the password-change window
  otpStore.set(email, { ...stored, verified: true, expiresAt: Date.now() + OTP_TTL });

  console.log(`[OTP] Verified for ${email} ✓`);
  res.status(200).json({ message: 'OTP verified successfully.' });
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/auth/change-password
//
// Changes the password ONLY when the OTP has been verified above.
// Updates Firebase Auth (which is the source of truth for authentication).
// Clears the OTP entry after success (one-time use).
// ─────────────────────────────────────────────────────────────────────────────
router.put('/change-password', protect, async (req, res) => {
  const { email, newPassword } = req.body;

  if (!email || !newPassword) {
    return res.status(400).json({ message: 'Email and new password are required.' });
  }

  if (req.user.email !== email) {
    return res.status(403).json({ message: 'Not authorized.' });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters.' });
  }

  const stored = otpStore.get(email);

  if (!stored || !stored.verified) {
    return res.status(403).json({
      message: 'OTP not verified. Please complete identity verification first.',
    });
  }

  if (Date.now() > stored.expiresAt) {
    otpStore.delete(email);
    return res.status(400).json({ message: 'Verification session expired. Please start over.' });
  }

  try {
    // Import admin here to avoid circular issues — already initialised in middleware
    const { admin } = await import('../middleware/authMiddleware.js');

    await admin.auth().updateUser(req.user.firebaseUid, { password: newPassword });

    // Clear OTP — one-time use only
    otpStore.delete(email);

    console.log(`[OTP] Password changed for ${email} ✓`);
    res.status(200).json({ message: 'Password updated successfully.' });

  } catch (err) {
    console.error('[OTP] change-password error:', err);
    if (err.code === 'auth/weak-password') {
      return res.status(400).json({ message: 'Password too weak. Use at least 6 characters.' });
    }
    res.status(500).json({ message: 'Failed to update password. Please try again.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// EXISTING ROUTES (unchanged)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/login', loginUser);
router.post('/register', registerUser);
router.post('/forgot-password', forgotPassword);
router.get('/profile', protect, getUserProfile);
router.put('/profile', protect, updateUserProfile);

export default router;