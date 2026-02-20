
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = mongoose.Schema({
  recruiterId: { 
    type: String, 
    unique: true, 
    sparse: true, 
    required: false 
  }, 
  name: { type: String, required: true },
  username: { type: String },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String },
  role: { 
    type: String, 
    enum: ['admin', 'recruiter'],
    default: 'recruiter' 
  },
  profilePicture: { type: String },
  active: { type: Boolean, default: true },
  
  // Extended Profile Fields
  location: { type: String },
  specialization: { type: String },
  experience: { type: String },
  bio: { type: String },
  socials: {
    linkedin: String,
    github: String,
    twitter: String,
    website: String
  }
}, {
  timestamps: true,
});

// Match Password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Hash Password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

const User = mongoose.model('User', userSchema);
export default User;