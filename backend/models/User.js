import mongoose from 'mongoose';

// ─────────────────────────────────────────────────────────────────────────────
// User Model — Firebase owns authentication (passwords/tokens).
// MongoDB stores profile data + firebaseUid for lookup.
// We no longer store or hash passwords here.
// ─────────────────────────────────────────────────────────────────────────────
const userSchema = mongoose.Schema({
  // Firebase UID — the critical link between Firebase Auth and MongoDB
  // The protect middleware looks users up by this field on every request
  firebaseUid: {
    type: String,
    unique: true,
    sparse: true, // allow null for legacy records during migration
  },

  recruiterId: {
    type: String,
    unique: true,
    sparse: true,
    required: false
  },

  firstName: { type: String, required: true },
  lastName:  { type: String, required: true },
  
  username: { type: String },
  email:    { type: String, required: true, unique: true },

  // Password field kept ONLY for bcrypt legacy support during migration.
  // New accounts created via Firebase should NOT use this field.
  password: { type: String, required: false },

  phone: { type: String },
  role: {
    type: String,
    enum: ['admin', 'recruiter'],
    default: 'recruiter'
  },
  profilePicture: { type: String },
  active: { type: Boolean, default: true },

  // Extended Profile
  location:       { type: String },
  specialization: { type: String },
  experience:     { type: String },
  bio:            { type: String },
  socials: {
    linkedin: String,
    github:   String,
    twitter:  String,
    website:  String
  }
}, {
  timestamps: true,
});

const User = mongoose.model('User', userSchema);
export default User;