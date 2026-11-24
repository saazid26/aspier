import { Schema, model } from 'mongoose';

const schema = new Schema({
  audience: { type: String, enum: ['admin', 'member'], required: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  applicationId: { type: Schema.Types.ObjectId, ref: 'MembershipApplication', index: true },
  title: { type: String, required: true, trim: true, maxlength: 180 },
  body: { type: String, required: true, maxlength: 5000 },
  category: { type: String, required: true, maxlength: 60 },
  link: { type: String, maxlength: 300 },
  applicantName: { type: String, trim: true, maxlength: 120 },
  applicantEmail: { type: String, trim: true, lowercase: true, maxlength: 120 },
  referenceId: { type: String, trim: true, maxlength: 100 },
  secretPayloadEncrypted: { type: String, select: false },
  readAt: Date
}, { timestamps: true });

schema.index({ audience: 1, createdAt: -1 });
schema.index({ userId: 1, createdAt: -1 });
export default model('Notification', schema);
