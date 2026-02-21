import mongoose from 'mongoose';

const candidateSchema = mongoose.Schema({
  candidateId: { type: String, unique: true }, 
  
  // --- Personal Info ---
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  name: { type: String }, // Combined for backward compatibility & easy display
  email: { type: String, required: true },
  contact: { type: String, required: true },
  alternateNumber: { type: String },
  currentLocation: { type: String },
  preferredLocation: { type: String },
  
  // --- Professional Info ---
  position: { type: String, required: true }, // Mapped to 'Role'
  client: { type: String, required: true },
  currentCompany: { type: String },
  totalExperience: { type: String },
  relevantExperience: { type: String },
  reasonForChange: { type: String },
  skills: { type: [String] }, 
  
  // --- Financial ---
  ctc: { type: String },
  currentTakeHome: { type: String },
  ectc: { type: String },
  expectedTakeHome: { type: String },

  // --- Availability & Offers ---
  noticePeriod: { type: String }, 
  servingNoticePeriod: { type: Boolean, default: false }, 
  lwd: { type: Date }, // Last Working Day
  offersInHand: { type: Boolean, default: false },
  offerPackage: { type: String }, 

  // --- Assignment & Tracking ---
  source: { type: String, default: 'Portal' },
  recruiterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  recruiterName: { type: String },
  
  // --- Status ---
  status: { 
    type: [String], 
    enum: [
      'Submitted',        
      'Shared Profiles',  
      'Yet to attend',    
      'Turnups',          
      'No Show',          
      'Selected',         
      'Joined',         
      'Rejected',         
      'Hold',             
      'Backout',
      'Pipeline'
    ],
    default: ['Submitted']
  },
  
  // --- System ---
  active: { type: Boolean, default: true },
  dateAdded: { type: Date, default: Date.now },
  resumeUrl: { type: String },
  resumeOriginalName: { type: String }
}, {
  timestamps: true,
});

// Auto-generate Candidate ID in vts0000001 format and combine Name
candidateSchema.pre('save', async function (next) {
  // Combine First and Last Name
  if (this.firstName || this.lastName) {
    this.name = `${this.firstName || ''} ${this.lastName || ''}`.trim();
  }

  if (!this.isNew) return next();
  
  try {
    const lastCandidate = await mongoose.model('Candidate')
      .findOne({ candidateId: { $regex: /^vts/i } })
      .sort({ createdAt: -1 });

    let nextNumber = 1;

    if (lastCandidate && lastCandidate.candidateId) {
      const lastNumberStr = lastCandidate.candidateId.replace(/^vts/i, '');
      const lastNumber = parseInt(lastNumberStr, 10);
      if (!isNaN(lastNumber)) {
        nextNumber = lastNumber + 1;
      }
    }

    this.candidateId = `vts${nextNumber.toString().padStart(7, '0')}`;
    next();
  } catch (error) {
    console.error("Error generating Candidate ID:", error);
    next(error);
  }
});

const Candidate = mongoose.model('Candidate', candidateSchema);
export default Candidate;