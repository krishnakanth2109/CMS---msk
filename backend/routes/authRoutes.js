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

// @route   POST /api/auth/login
// @desc    Verify Firebase ID token & return user profile from DB
// @access  Public
router.post('/login', loginUser);

// @route   POST /api/auth/register
// @desc    Create user in Firebase + MongoDB
// @access  Public
router.post('/register', registerUser);

// @route   POST /api/auth/forgot-password
// @desc    Generate Firebase password reset link and send to email
// @access  Public
router.post('/forgot-password', forgotPassword);

// @route   GET /api/auth/profile
// @desc    Get current user's profile
// @access  Private
router.get('/profile', protect, getUserProfile);

// @route   PUT /api/auth/profile
// @desc    Update current user's profile
// @access  Private
router.put('/profile', protect, updateUserProfile);

export default router;
