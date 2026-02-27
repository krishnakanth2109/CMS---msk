import mongoose from 'mongoose';

// ─────────────────────────────────────────────────────────────────────────────
// User Model — Firebase owns authentication (passwords/tokens).
// MongoDB stores profile data + firebaseUid for lookup.
// All required validations removed as requested.
// ─────────────────────────────────────────────────────────────────────────────

const userSchema = new mongoose.Schema(
  {
    // 🔹 Firebase UID
    firebaseUid: {
      type: String,
      unique: true,
      sparse: true,
    },

    recruiterId: {
      type: String,
      unique: true,
      sparse: true,
    },

    // 🔹 Basic Information (No required fields now)
    firstName: { type: String },
    lastName:  { type: String },
    username:  { type: String },

    email: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
    },

    // 🔹 Legacy password (optional)
    password: { type: String },

    phone: { type: String },

    // 🔹 Role (manager still not included unless you want it)
    role: {
      type: String,
      enum: ['admin', 'recruiter', 'manager'], // Add 'manager' here if needed
      default: 'recruiter',
    },

    profilePicture: { type: String },

    active: {
      type: Boolean,
      default: true,
    },

    // 🔹 Extended Profile
    location: { type: String },
    specialization: { type: String },
    experience: { type: String },
    bio: { type: String },

    socials: {
      linkedin: String,
      github: String,
      twitter: String,
      website: String,
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model('User', userSchema);

export default User;