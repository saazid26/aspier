import { Schema, model } from 'mongoose';

const schema = new Schema({
  applicationId: { type: String, unique: true, sparse: true, trim: true, uppercase: true, index: true },
  accessCode: { type: String, trim: true, index: true },
  role: { type: String, default: 'Research Mate', trim: true },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  email: { type: String, required: true, lowercase: true, trim: true, maxlength: 254, index: true },
  phone: { type: String, trim: true, maxlength: 40 },
  university: { type: String, required: true, trim: true, maxlength: 200 },
  department: { type: String, required: true, trim: true, maxlength: 200 },
  occupation: { type: String, required: true, trim: true, maxlength: 300 },
  wingId: { type: Schema.Types.ObjectId, ref: 'Wing', index: true },
  wingName: { type: String, required: true, trim: true },
  wingSlug: { type: String, required: true, trim: true },
  researchId: { type: Schema.Types.ObjectId, ref: 'Research', index: true },
  researchTitle: { type: String, required: true, trim: true },
  researchSlug: { type: String, trim: true },
  skills: { type: String, required: true, maxlength: 5000 },
  statement: { type: String, maxlength: 5000, default: '' },
  cvStorageKey: { type: String, select: false },
  cvData: { type: Buffer, select: false },
  cvFilename: { type: String, default: 'cv.pdf' },
  cvMimeType: { type: String, default: 'application/pdf' },
  status: {
    type: String,
    enum: ['pending', 'stage1_approved', 'payment_submitted', 'approved', 'rejected', 'shortlisted'],
    default: 'pending',
    index: true
  },
  paymentMethod: { type: String, enum: ['bKash', 'Nagad'] },
  paymentSenderPhone: { type: String, trim: true },
  trxId: { type: String, trim: true },
  paymentAmount: { type: Number, default: 1000 },
  whatsAppGroupLink: { type: String, trim: true, default: '' },
  reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: Date
}, { timestamps: true });

schema.index({ status: 1, createdAt: -1 });

export default model('ResearchApplication', schema);
