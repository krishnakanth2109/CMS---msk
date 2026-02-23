import express   from 'express';
import User      from '../models/User.js';
// FIX: Candidate was used in /profile/stats but never imported
import Candidate from '../models/Candidate.js';
import {
  getRecruiters,
  createRecruiter,
  updateRecruiter,
  deleteRecruiter,
  toggleRecruiterStatus,
  getUserProfile,
  updateUserProfile,
} from '../controllers/recruiterController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// ═══════════════════════════════════════════════════════════════════════════════
// 1. Protected Routes — all logged-in users
// ═══════════════════════════════════════════════════════════════════════════════

// Apply token verification to every route below this line
router.use(protect);

// @route   GET /api/recruiters/profile
// @route   PUT /api/recruiters/profile
// @access  Private
router.route('/profile')
  .get(getUserProfile)
  .put(updateUserProfile);

// @route   GET /api/recruiters/profile/stats
// @access  Private
//
// FIX: This route was defined BEFORE router.use(protect) in the old file,
// so req.user was always undefined and Candidate wasn't imported → crashes.
// Moved to AFTER protect so req.user is guaranteed to be set.
router.get('/profile/stats', async (req, res) => {
  try {
    const INTERVIEW_STAGES = new Set([
      'L1 Interview', 'L2 Interview', 'Final Interview',
      'Technical Interview', 'HR Interview', 'Interview',
    ]);

    const all = await Candidate.find({ recruiterId: req.user._id })
      .select('status')
      .lean();

    res.json({
      totalSubmissions: all.length,
      interviews:       all.filter(c => INTERVIEW_STAGES.has(c.status)).length,
      offers:           all.filter(c => c.status === 'Offer').length,
      joined:           all.filter(c => c.status === 'Joined').length,
      rejected:         all.filter(c => c.status === 'Rejected').length,
    });
  } catch (error) {
    console.error('[Stats] /profile/stats error:', error.message);
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/recruiters/active-list
// @access  Private (all roles — used to populate assignment dropdowns)
router.get('/active-list', async (req, res) => {
  try {
    const recruiters = await User.find({ active: true })
      .select('_id firstName lastName email role')
      .sort({ firstName: 1, lastName: 1 });
    res.json(recruiters);
  } catch (error) {
    console.error('Get Active Users Error:', error);
    res.status(500).json({ message: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 2. Admin-only Routes
// ═══════════════════════════════════════════════════════════════════════════════

router.use(authorize('admin'));

// @route   GET  /api/recruiters   — list all
// @route   POST /api/recruiters   — create new
router.route('/')
  .get(getRecruiters)
  .post(createRecruiter);

// @route   PATCH /api/recruiters/:id/status
router.patch('/:id/status', toggleRecruiterStatus);

// @route   PUT    /api/recruiters/:id
// @route   DELETE /api/recruiters/:id
router.route('/:id')
  .put(updateRecruiter)
  .delete(deleteRecruiter);

export default router;