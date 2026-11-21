import { Schema, model } from 'mongoose';
const schema = new Schema({ courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true }, title: { type: String, required: true }, description: String, scheduledAt: { type: Date, required: true, index: true }, durationMinutes: { type: Number, default: 60 }, meetLinkEncrypted: { type: String, select: false }, meetLink: { type: String, select: false }, recordingYoutubeId: String, status: { type: String, enum: ['scheduled', 'live', 'completed'], default: 'scheduled', index: true } }, { timestamps: true });
export default model('Class', schema);

