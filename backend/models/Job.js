import mongoose from 'mongoose';

const jobSchema = mongoose.Schema({
  jobCode: { 
    type: String, 
    required: true,
    unique: true,
    trim: true
  },
  clientName: { 
    type: String, 
    required: true,
    trim: true
  },
  position: { 
    type: String, 
    required: true,
    trim: true
  },
  skills: { 
    type: String,
    default: ''
  },
  salaryBudget: { 
    type: String,
    default: ''
  },
  location: { 
    type: String,
    default: ''
  },
  experience: { 
    type: String,
    default: ''
  },
  gender: { 
    type: String,
    enum: ['Any', 'Male', 'Female'],
    default: 'Any'
  },
  interviewMode: { 
    type: String,
    enum: ['Virtual', 'In-Person', 'Hybrid'],
    default: 'Virtual'
  },
  tatTime: { 
    type: Date
  },
  jdLink: { 
    type: String,
    default: ''
  },
  comments: { 
    type: String,
    default: ''
  },
  primaryRecruiter: { 
    type: String,
    default: ''
  },
  secondaryRecruiter: { 
    type: String,
    default: ''
  },
  active: { 
    type: Boolean, 
    default: true 
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Index for faster searches
jobSchema.index({ jobCode: 1 });
jobSchema.index({ clientName: 1 });
jobSchema.index({ position: 1 });
jobSchema.index({ primaryRecruiter: 1 });
jobSchema.index({ secondaryRecruiter: 1 });
jobSchema.index({ createdBy: 1 });

const Job = mongoose.model('Job', jobSchema);
export default Job;