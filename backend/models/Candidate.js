import mongoose from 'mongoose';

const candidateSchema = mongoose.Schema({
  candidateId: { type: String, unique: true, sparse: true },

  // --- Personal Info ---
  firstName: { type: String, required: true },
  lastName:  { type: String, required: true },
  name:      { type: String },

  email:             { type: String, required: true },
  contact:           { type: String, required: true },
  alternateNumber:   { type: String },
  currentLocation:   { type: String },
  preferredLocation: { type: String },
  dateOfBirth:       { type: Date },
  gender:            { type: String },
  linkedin:          { type: String },

  // --- Professional Info ---
  position:           { type: String, default: '' },
  client:             { type: String, default: '' },
  currentCompany:     { type: String },
  industry:           { type: String },
  totalExperience:    { type: String },
  relevantExperience: { type: String },
  reasonForChange:    { type: String },
  education:          { type: String },
  skills:             { type: [String] },

  // --- Financial ---
  ctc:              { type: String },
  currentTakeHome:  { type: String },
  ectc:             { type: String },
  expectedTakeHome: { type: String },

  // --- Availability & Offers ---
  noticePeriod:        { type: String },
  servingNoticePeriod: { type: Boolean, default: false },
  lwd:                 { type: Date },
  offersInHand:        { type: Boolean, default: false },
  offerPackage:        { type: String },

  // --- Recruitment ---
  source:        { type: String, default: 'Portal' },
  recruiterId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  recruiterName: { type: String },
  remarks:       { type: String },
  notes:         { type: String },
  rating:        { type: Number, default: 0 },

  // --- Status ---
  status: {
    type: [String],
    enum: [
      'Submitted', 'Shared Profiles', 'Yet to attend', 'Turnups',
      'No Show', 'Selected', 'Joined', 'Rejected', 'Hold', 'Backout', 'Pipeline'
    ],
    default: ['Submitted']
  },

  // --- System ---
  active:             { type: Boolean, default: true },
  dateAdded:          { type: Date, default: Date.now },
  resumeUrl:          { type: String },
  resumeOriginalName: { type: String },
}, {
  timestamps: true,
});

// ─────────────────────────────────────────────────────────────────────────────
// Pre-save hook
//
// FIX for E11000 duplicate key on candidateId:
//
//   ROOT CAUSE: Two concurrent saves both query for "last VTS record",
//   get the same number back (the other save isn't committed yet),
//   and both try to insert the same VTS ID → duplicate key crash.
//
//   SOLUTION: Use findOneAndUpdate with $inc on a separate counter
//   document (atomic operation) OR use MongoDB aggregation MAX + retry.
//   We use the atomic counter approach — it's race-condition-proof.
//
//   We store a counter in a separate "counters" collection.
//   Each call does: findOneAndUpdate({ _id: 'candidate' }, { $inc: { seq: 1 } }, { upsert: true, new: true })
//   This is atomic in MongoDB — no two calls ever get the same number.
// ─────────────────────────────────────────────────────────────────────────────

// Minimal counter schema (stored in 'counters' collection)
const counterSchema = new mongoose.Schema({
  _id:  { type: String, required: true },
  seq:  { type: Number, default: 0 },
});
// Only register if not already registered
const Counter = mongoose.models.Counter || mongoose.model('Counter', counterSchema);

candidateSchema.pre('save', async function (next) {
  // Always sync name from firstName + lastName
  if (this.firstName || this.lastName) {
    this.name = `${this.firstName || ''} ${this.lastName || ''}`.trim();
  }

  // Only auto-generate candidateId for brand-new records without one
  if (!this.isNew || this.candidateId) return next();

  try {
    // Atomic increment — guaranteed unique, race-condition-proof
    const counter = await Counter.findOneAndUpdate(
      { _id: 'candidate' },
      { $inc: { seq: 1 } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    this.candidateId = `VTS${counter.seq.toString().padStart(7, '0')}`;
    next();
  } catch (error) {
    console.error('Error generating Candidate ID:', error);
    next(error);
  }
});

const Candidate = mongoose.model('Candidate', candidateSchema);
export default Candidate;