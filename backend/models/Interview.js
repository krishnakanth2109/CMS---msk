import mongoose from 'mongoose';

const interviewSchema = mongoose.Schema({
  interviewId: { type: String, unique: true }, // e.g., INT-1699999999
  candidateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate', required: true },
  recruiterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job' }, 
  
  interviewDate: { type: Date, required: true },
  duration: { type: Number, default: 60 },
  type: { 
    type: String, 
    enum: ['Virtual', 'In-person', 'Phone'], 
    default: 'Virtual' 
  },
  location: { type: String, default: 'Remote' },
  meetingLink: { type: String },
  
  status: {
    type: String,
    enum: ['Scheduled', 'Completed', 'Cancelled', 'No Show'],
    default: 'Scheduled'
  },
  round: {
    type: String,
    enum: ['L1 Interview', 'L2 Interview', 'Final Interview', 'Technical Interview', 'HR Interview'],
    default: 'L1 Interview'
  },

  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  notes: { type: String },
  feedback: { type: String },
  rating: { type: Number },

}, {
  timestamps: true,
});

// FIXED: Use timestamp + random string to ensure uniqueness
interviewSchema.pre('save', function (next) {
  if (!this.isNew) return next();
  
  // Generates ID like: INT-1701234567890-AB12
  const uniqueSuffix = Date.now() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
  this.interviewId = `INT-${uniqueSuffix}`;
  
  next();
});

const Interview = mongoose.model('Interview', interviewSchema);
export default Interview;