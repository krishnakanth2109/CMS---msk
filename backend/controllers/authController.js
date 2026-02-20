import User from '../models/User.js';
import { admin } from '../middleware/authMiddleware.js';

// @desc    Login user — verifies Firebase ID token sent from frontend
// @route   POST /api/auth/login
// @access  Public
export const loginUser = async (req, res) => {
  const { idToken } = req.body;

  if (!idToken) {
    return res.status(400).json({ message: 'Firebase ID token is required.' });
  }

  try {
    // Verify Firebase ID token using Admin SDK
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const { uid, email } = decodedToken;

    // Find user in MongoDB by Firebase UID or email
    let user = await User.findOne({ $or: [{ firebaseUid: uid }, { email }] });

    if (!user) {
      return res.status(401).json({ message: 'User not registered in the system. Contact admin.' });
    }

    if (user.active === false) {
      return res.status(401).json({ message: 'Account is deactivated. Contact admin.' });
    }

    // Sync Firebase UID if not already stored
    if (!user.firebaseUid) {
      user.firebaseUid = uid;
      await user.save();
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      username: user.username,
      role: user.role,
      firebaseUid: user.firebaseUid,
    });
  } catch (error) {
    console.error('Login Error:', error.message);

    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({ message: 'Session expired. Please login again.' });
    }
    if (error.code === 'auth/argument-error' || error.code === 'auth/invalid-id-token') {
      return res.status(401).json({ message: 'Invalid token. Please login again.' });
    }

    res.status(500).json({ message: 'Server error during login.' });
  }
};

// @desc    Register a new user (admin creates users, stores in DB + Firebase)
// @route   POST /api/auth/register
// @access  Public (or protect with admin middleware if needed)
export const registerUser = async (req, res) => {
  const { email, password, name, username, role } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ message: 'Email, password, and name are required.' });
  }

  try {
    // Check if user already exists in DB
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email or username already exists.' });
    }

    // Create user in Firebase Auth via Admin SDK
    const firebaseUser = await admin.auth().createUser({
      email,
      password,
      displayName: name,
    });

    // Create user in MongoDB
    const user = await User.create({
      firebaseUid: firebaseUser.uid,
      email,
      name,
      username: username || email.split('@')[0],
      role: role || 'recruiter',
      active: true,
    });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      username: user.username,
      role: user.role,
      firebaseUid: user.firebaseUid,
    });
  } catch (error) {
    console.error('Register Error:', error);

    if (error.code === 'auth/email-already-exists') {
      return res.status(400).json({ message: 'Email already registered in Firebase.' });
    }
    if (error.code === 'auth/weak-password') {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    }

    res.status(500).json({ message: error.message || 'Server error during registration.' });
  }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
export const getUserProfile = async (req, res) => {
  try {
    if (req.user) {
      res.json({
        _id: req.user._id,
        username: req.user.username,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        firebaseUid: req.user.firebaseUid,
      });
    } else {
      res.status(404).json({ message: 'User not found.' });
    }
  } catch (error) {
    console.error('Get Profile Error:', error);
    res.status(500).json({ message: 'Server error fetching profile.' });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
export const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    user.name = req.body.name || user.name;
    user.email = req.body.email || user.email;

    // If password update requested, update in Firebase too
    if (req.body.password && req.body.password.trim() !== '') {
      await admin.auth().updateUser(user.firebaseUid, {
        password: req.body.password,
      });
    }

    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      username: updatedUser.username,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
    });
  } catch (error) {
    console.error('Update Profile Error:', error);

    if (error.code === 11000) {
      return res.status(400).json({ message: 'Email or Username already in use.' });
    }
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }

    res.status(500).json({ message: error.message || 'Server Error.' });
  }
};

// @desc    Send password reset email via Firebase Admin
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Email is required.' });
  }

  try {
    // Check if user exists in DB first
    const user = await User.findOne({ email });

    // Always return success to avoid email enumeration
    if (!user) {
      return res.json({ message: 'If this email is registered, a reset link has been sent.' });
    }

    // Generate Firebase password reset link
    const resetLink = await admin.auth().generatePasswordResetLink(email);

    // TODO: Send resetLink via your preferred email service (nodemailer, sendgrid, etc.)
    // For now, Firebase also has built-in email sending if configured in Firebase Console.
    // Example with nodemailer (install nodemailer and configure):
    //
    // import nodemailer from 'nodemailer';
    // const transporter = nodemailer.createTransport({ ... });
    // await transporter.sendMail({
    //   from: '"RecruiterHub" <noreply@recruiterhub.com>',
    //   to: email,
    //   subject: 'Password Reset Request',
    //   html: `<p>Click the link below to reset your password:</p>
    //          <a href="${resetLink}">Reset Password</a>
    //          <p>This link expires in 1 hour.</p>`,
    // });

    console.log(`Password reset link for ${email}: ${resetLink}`);

    res.json({ message: 'If this email is registered, a reset link has been sent.' });
  } catch (error) {
    console.error('Forgot Password Error:', error);
    res.status(500).json({ message: 'Failed to send reset email. Please try again.' });
  }
};
