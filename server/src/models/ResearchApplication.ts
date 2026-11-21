import { Schema, model } from 'mongoose';

const schema = new Schema({
  researchId: { type: Schema.Types.ObjectId, ref: 'Research', required: true, index: true },
  researchTitle: { type: String, required: true },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  email: { type: String, required: true, lowercase: true, trim: true, maxlength: 254 },
  phone: { type: String, required: true, trim: true, maxlength: 30 },
  institution: { type: String, required: true, trim: true, maxlength: 200 },
  academicStatus: { type: String, required: true, trim: true, maxlength: 120 },
  city: { type: String, required: true, trim: true, maxlength: 120 },
  country: { type: String, required: true, trim: true, maxlength: 120 },
  skills: { type: String, required: true, maxlength: 5000 },
  statement: { type: String, maxlength: 5000 },
  googleScholar: { type: String, maxlength: 500 },
  researchGate: { type: String, maxlength: 500 },
  cvStorageKey: { type: String, select: false },
  cvData: { type: Buffer, select: false },
  cvFilename: String,
  cvMimeType: String,
  status: { type: String, enum: ['pending', 'shortlisted', 'approved'], default: 'pending', index: true },
  reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: Date
}, { timestamps: true });

schema.index({ status: 1, createdAt: -1 });
export default model('ResearchApplication', schema);
