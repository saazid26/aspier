import { Schema, model } from 'mongoose';

const schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
  status: { type: String, enum: ['pending', 'stage1_verified', 'final_approved', 'active', 'rejected', 'expired'], default: 'pending', index: true },
  completedLessonIds: [{ type: Schema.Types.ObjectId }],
  progressPercent: { type: Number, default: 0 },
  certificateStatus: { type: String, enum: ['not_claimed', 'claimed', 'issued'], default: 'not_claimed', index: true },
  certificateClaimedAt: { type: Date, default: null },
  credentialId: { type: String, default: null, index: true },
  certificateImage: { type: String, default: null },
  certificateIssuedAt: { type: Date, default: null },
  enrolledAt: { type: Date, default: Date.now },
  expiresAt: Date
}, { timestamps: true });

schema.index({ userId: 1, courseId: 1 }, { unique: true });
export default model('Enrollment', schema);

