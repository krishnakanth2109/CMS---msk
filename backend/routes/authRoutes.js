import express from 'express';
import { protect, admin } from '../middleware/authMiddleware.js';
import {
  loginUser,
  registerUser,
  getUserProfile,
  updateUserProfile,
  forgotPassword,
} from '../controllers/authController.js';

const router = express.Router();

// ─── OTP Store (in-memory, server-side source of truth) ──────────────────────
const otpStore = new Map();
const OTP_TTL  = 10 * 60 * 1000; // 10 minutes
const makeOTP  = () => String(Math.floor(100000 + Math.random() * 900000));

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/send-otp
//
// HOW FIREBASE EMAIL WORKS:
//   Firebase Admin SDK does NOT send arbitrary text emails.
//   It only sends its own styled emails (password reset, email verification).
//   The OTP code CANNOT be embedded inside Firebase's email body.
//
// CORRECT APPROACH:
//   Use admin.auth().generatePasswordResetLink() to get the action URL.
//   Pass the OTP inside the continueUrl as a query param.
//   Firebase sends its email → user clicks link → Firebase verifies token
//   → redirects to continueUrl → frontend reads ?otp from URL → calls verify-otp.
//
// FLOW:
//   1. Backend generates OTP, stores it in otpStore
//   2. Backend calls Firebase Admin SDK: generatePasswordResetLink(email, { url: continueUrl })
//      where continueUrl = FRONTEND_URL/settings?otp=CODE&email=EMAIL
//   3. Firebase sends its own branded password reset email to the user automatically
//   4. User clicks the link in the email
//   5. Firebase validates the reset token, then redirects to continueUrl
//   6. Frontend reads ?otp from the URL and auto-submits verify-otp endpoint
// ─────────────────────────────────────────────────────────────────────────────
router.post('/send-otp', protect, async (req, res) => {
  const { email } = req.body;

  if (req.user.email !== email)
    return res.status(403).json({ message: 'Unauthorized: email mismatch.' });

  try {
    const code = makeOTP();
    otpStore.set(email, {
      code,
      expiresAt: Date.now() + OTP_TTL,
      verified:  false,
    });

    // Build the continueUrl — frontend reads ?otp=CODE after Firebase redirects
    const continueUrl = `${process.env.FRONTEND_URL}/settings?otp=${code}&email=${encodeURIComponent(email)}`;

    // generatePasswordResetLink() does TWO things:
    //   1. Returns the signed Firebase action link (for your logs/debug)
    //   2. Automatically sends Firebase's password reset email to the user
    // You do NOT need to call any separate send API.
    // Customize the email template at: Firebase Console → Auth → Templates → Password Reset
    const actionLink = await admin.auth().generatePasswordResetLink(email, {
      url: continueUrl,
      handleCodeInApp: false,
    });

    console.log(`[DEV] Firebase action link for ${email}: ${actionLink}`);

    res.status(200).json({ message: 'Verification email sent. Check your inbox.' });
  } catch (err) {
    console.error('[send-otp] Error:', err.code, err.message);

    if (err.code === 'auth/user-not-found')
      return res.status(404).json({ message: 'No Firebase account found for this email.' });
    if (err.code === 'auth/invalid-email')
      return res.status(400).json({ message: 'Invalid email address.' });

    res.status(500).json({ message: 'Failed to send verification email.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/verify-otp
//
// After user clicks the Firebase email link, they land on continueUrl.
// Frontend reads ?otp=CODE from URL and calls this endpoint.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/verify-otp', protect, async (req, res) => {
  const { email, otp } = req.body;
  const stored = otpStore.get(email);

  if (!stored)
    return res.status(400).json({ message: 'No OTP found. Request a new one.' });

  // ✅ Check expiry (was missing before)
  if (Date.now() > stored.expiresAt) {
    otpStore.delete(email);
    return res.status(400).json({ message: 'OTP expired. Request a new one.' });
  }

  if (String(otp).trim() !== stored.code)
    return res.status(400).json({ message: 'Invalid OTP.' });

  otpStore.set(email, { ...stored, verified: true, expiresAt: Date.now() + OTP_TTL });
  res.status(200).json({ message: 'OTP verified.' });
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/auth/change-password
// ─────────────────────────────────────────────────────────────────────────────
router.put('/change-password', protect, async (req, res) => {
  const { email, newPassword } = req.body;
  const stored = otpStore.get(email);

  if (!stored || !stored.verified)
    return res.status(403).json({ message: 'OTP not verified. Verify first.' });

  if (Date.now() > stored.expiresAt) {
    otpStore.delete(email);
    return res.status(400).json({ message: 'OTP session expired. Start over.' });
  }

  try {
    await admin.auth().updateUser(req.user.firebaseUid, { password: newPassword });
    otpStore.delete(email);
    res.status(200).json({ message: 'Password updated successfully.' });
  } catch (err) {
    console.error('[change-password] Error:', err.code, err.message);
    if (err.code === 'auth/weak-password')
      return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    res.status(500).json({ message: 'Failed to update password.' });
  }
});

// ─── Other auth routes (unchanged) ───────────────────────────────────────────
router.post('/login',           loginUser);
router.post('/register',        registerUser);
router.post('/forgot-password', forgotPassword);
router.get('/profile',  protect, getUserProfile);
router.put('/profile',  protect, updateUserProfile);

export default router;