import { Schema, model } from 'mongoose';
const schema = new Schema({ userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true }, courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true }, status: { type: String, enum: ['pending', 'active', 'rejected', 'expired'], default: 'pending', index: true }, completedLessonIds: [{ type: Schema.Types.ObjectId }], enrolledAt: { type: Date, default: Date.now }, expiresAt: Date }, { timestamps: true });
schema.index({ userId: 1, courseId: 1 }, { unique: true });
export default model('Enrollment', schema);

