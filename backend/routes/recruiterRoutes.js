import express from 'express';
import User from '../models/User.js';
import { 
  getRecruiters, 
  createRecruiter, 
  updateRecruiter, 
  deleteRecruiter,
  toggleRecruiterStatus,
  getUserProfile,
  updateUserProfile
} from '../controllers/recruiterController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// ==========================================
// 1. Public/Protected Routes (All Logged In Users)
// ==========================================

// Protect all routes
router.use(protect);

// @desc    Get current user profile
// @route   GET /api/users/profile
// @route   PUT /api/users/profile
// @access  Private
router.route('/profile')
  .get(getUserProfile)
  .put(updateUserProfile);

// @desc    Get all recruiters/active users (for assignment dropdowns)
// @route   GET /api/users/active-list
// @access  Private
// Note: Kept separate from Admin "Get All" to allow non-admins to populate dropdowns
router.get('/active-list', async (req, res) => {
  try {
    const recruiters = await User.find({ 
      active: true 
    })
    .select('_id name email role')
    .sort({ name: 1 });
    
    res.json(recruiters);
  } catch (error) {
    console.error('Get Active Users Error:', error);
    res.status(500).json({ message: error.message });
  }
});

// ==========================================
// 2. Admin Routes (Admin Only)
// ==========================================

// Apply Admin authorization to all routes below
router.use(authorize('admin'));

// @desc    Get all recruiters (Admin Dashboard) & Create Recruiter
// @route   GET /api/users
// @route   POST /api/users
router.route('/')
  .get(getRecruiters)
  .post(createRecruiter);

// @desc    Manage specific recruiter status
// @route   PATCH /api/users/:id/status
router.patch('/:id/status', toggleRecruiterStatus);

// @desc    Update & Delete specific recruiter
// @route   PUT /api/users/:id
// @route   DELETE /api/users/:id
router.route('/:id')
  .put(updateRecruiter)
  .delete(deleteRecruiter);

export default router;