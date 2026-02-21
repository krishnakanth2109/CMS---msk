import User from '../models/User.js';
import { admin } from '../middleware/authMiddleware.js';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET
});

// @desc    Get Current User Profile
// @route   GET /api/recruiters/profile
// @access  Private
export const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (user) res.json(user);
    else res.status(404).json({ message: 'User not found' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update Current User Profile
// @route   PUT /api/recruiters/profile
// @access  Private
export const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.name           = req.body.name           || user.name;
    user.email          = req.body.email          || user.email;
    user.phone          = req.body.phone          || user.phone;
    user.location       = req.body.location       || user.location;
    user.specialization = req.body.specialization || user.specialization;
    user.experience     = req.body.experience     || user.experience;
    user.bio            = req.body.bio            || user.bio;

    if (req.body.socials) {
      user.socials = {
        linkedin: req.body.socials.linkedin || user.socials?.linkedin || '',
        github:   req.body.socials.github   || user.socials?.github   || '',
        twitter:  req.body.socials.twitter  || user.socials?.twitter  || '',
        website:  req.body.socials.website  || user.socials?.website  || ''
      };
    }

    if (req.body.profilePicture && req.body.profilePicture.startsWith('data:image')) {
      try {
        if (user.profilePicture?.includes('cloudinary')) {
          try { await cloudinary.uploader.destroy(`recruiters/recruiter_${user._id}`); } catch {}
        }
        const result = await cloudinary.uploader.upload(req.body.profilePicture, {
          folder: 'recruiters',
          public_id: `recruiter_${user._id}`,
          overwrite: true,
          resource_type: 'image',
          transformation: [{ width: 500, height: 500, crop: 'limit' }, { quality: 'auto' }, { fetch_format: 'auto' }]
        });
        user.profilePicture = result.secure_url;
      } catch (uploadError) {
        return res.status(500).json({ message: 'Failed to upload image', error: uploadError.message });
      }
    } else if (req.body.profilePicture && !req.body.profilePicture.startsWith('data:image')) {
      user.profilePicture = req.body.profilePicture;
    }

    const updatedUser = await user.save();
    res.json({
      _id: updatedUser._id, name: updatedUser.name, email: updatedUser.email,
      phone: updatedUser.phone, location: updatedUser.location,
      specialization: updatedUser.specialization, experience: updatedUser.experience,
      bio: updatedUser.bio, profilePicture: updatedUser.profilePicture,
      role: updatedUser.role, socials: updatedUser.socials, active: updatedUser.active
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all recruiters
// @route   GET /api/recruiters
// @access  Private/Admin
export const getRecruiters = async (req, res) => {
  try {
    const recruiters = await User.find({ role: { $ne: 'admin' } }).select('-password');
    res.json(recruiters);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Create a new recruiter
// @route   POST /api/recruiters
// @access  Private/Admin
//
// ROOT CAUSE OF 401 BUG:
//   The old code only created users in MongoDB (with bcrypt password).
//   The protect middleware verifies Firebase tokens and looks users up by
//   firebaseUid. Without a firebaseUid in MongoDB, every request from a
//   recruiter gets: "User not found → 401".
//
// FIX:
//   1. Create user in Firebase Auth first → get firebaseUid
//   2. Store firebaseUid in MongoDB
//   3. Never store passwords in MongoDB — Firebase owns auth
// ─────────────────────────────────────────────────────────────────────────────
export const createRecruiter = async (req, res) => {
  const { name, email, password, recruiterId, phone, role, username, profilePicture } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ message: 'Name, email, and password are required.' });
  }

  let firebaseUid = null;

  try {
    // Guard: check MongoDB first
    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ message: 'User with this email already exists.' });

    if (recruiterId) {
      const idExists = await User.findOne({ recruiterId });
      if (idExists) return res.status(400).json({ message: 'Recruiter ID already exists.' });
    }

    // Step 1: Create user in Firebase (gives us the firebaseUid)
    let firebaseUser;
    try {
      firebaseUser = await admin.auth().createUser({ email, password, displayName: name });
    } catch (fbError) {
      if (fbError.code === 'auth/email-already-exists') {
        // Reuse existing Firebase account
        firebaseUser = await admin.auth().getUserByEmail(email);
      } else {
        throw fbError;
      }
    }
    firebaseUid = firebaseUser.uid;

    // Step 2: Save to MongoDB WITH firebaseUid — no password needed here
    const user = await User.create({
      firebaseUid,
      name,
      email,
      recruiterId,
      phone,
      role:           role || 'recruiter',
      username:       username || email.split('@')[0],
      profilePicture: profilePicture || '',
      active:         true,
    });

    res.status(201).json({
      _id: user._id, name: user.name, email: user.email,
      recruiterId: user.recruiterId, role: user.role, firebaseUid: user.firebaseUid,
    });

  } catch (error) {
    console.error('Create Recruiter Error:', error);
    // Rollback: delete Firebase user if MongoDB save failed
    if (firebaseUid) {
      try { await admin.auth().deleteUser(firebaseUid); } catch {}
    }
    if (error.code === 'auth/weak-password') return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    if (error.code === 'auth/invalid-email')  return res.status(400).json({ message: 'Invalid email address.' });
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update recruiter
// @route   PUT /api/recruiters/:id
// @access  Private/Admin
export const updateRecruiter = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Recruiter not found' });

    if (req.body.recruiterId && req.body.recruiterId !== user.recruiterId) {
      const idExists = await User.findOne({ recruiterId: req.body.recruiterId });
      if (idExists) return res.status(400).json({ message: 'Recruiter ID already exists' });
    }
    if (req.body.email && req.body.email !== user.email) {
      const emailExists = await User.findOne({ email: req.body.email });
      if (emailExists) return res.status(400).json({ message: 'Email already exists' });
    }

    // Sync changes to Firebase too
    if (user.firebaseUid) {
      const fbUpdates = {};
      if (req.body.password) fbUpdates.password = req.body.password;
      if (req.body.email && req.body.email !== user.email) fbUpdates.email = req.body.email;
      if (req.body.name  && req.body.name  !== user.name)  fbUpdates.displayName = req.body.name;
      if (Object.keys(fbUpdates).length > 0) {
        try { await admin.auth().updateUser(user.firebaseUid, fbUpdates); } catch (e) {
          console.error('Firebase update error (non-fatal):', e.message);
        }
      }
    }

    user.name           = req.body.name           || user.name;
    user.email          = req.body.email          || user.email;
    user.phone          = req.body.phone          || user.phone;
    user.role           = req.body.role           || user.role;
    user.username       = req.body.username       || user.username;
    user.recruiterId    = req.body.recruiterId    || user.recruiterId;
    user.profilePicture = req.body.profilePicture || user.profilePicture;

    const updatedUser = await user.save();
    res.json({ _id: updatedUser._id, name: updatedUser.name, email: updatedUser.email, role: updatedUser.role, recruiterId: updatedUser.recruiterId });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete recruiter
// @route   DELETE /api/recruiters/:id
// @access  Private/Admin
export const deleteRecruiter = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Recruiter not found' });

    // Delete from Firebase Auth
    if (user.firebaseUid) {
      try { await admin.auth().deleteUser(user.firebaseUid); } catch (e) {
        console.error('Firebase delete failed (continuing):', e.message);
      }
    }

    // Delete Cloudinary image
    if (user.profilePicture?.includes('cloudinary')) {
      try { await cloudinary.uploader.destroy(`recruiters/recruiter_${user._id}`); } catch {}
    }

    await user.deleteOne();
    res.json({ message: 'Recruiter removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Toggle Active Status
// @route   PATCH /api/recruiters/:id/status
// @access  Private/Admin
export const toggleRecruiterStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Recruiter not found' });

    user.active = !user.active;
    await user.save();

    // Mirror active/inactive to Firebase disabled flag
    if (user.firebaseUid) {
      try { await admin.auth().updateUser(user.firebaseUid, { disabled: !user.active }); } catch {}
    }

    res.json({ message: `Recruiter set to ${user.active ? 'Active' : 'Inactive'}`, active: user.active });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};