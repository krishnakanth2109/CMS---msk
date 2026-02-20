import mongoose from 'mongoose';

const clientSchema = mongoose.Schema({
  clientId: { type: String, unique: true }, // e.g., CL1001
  companyName: { type: String, required: true },
  contactPerson: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String },
  website: { type: String },
  address: { type: String },
  locationLink: { type: String },
  industry: { type: String },
  gstNumber: { type: String },
  
  // Business Terms
  percentage: { type: Number },
  candidatePeriod: { type: Number }, // Months
  replacementPeriod: { type: Number }, // Days
  terms: { type: String },
  notes: { type: String },
  
  active: { type: Boolean, default: true },
  dateAdded: { type: Date, default: Date.now },
}, {
  timestamps: true,
});

const Client = mongoose.model('Client', clientSchema);
export default Client;