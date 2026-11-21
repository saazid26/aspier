import { Schema, model } from 'mongoose';
const schema = new Schema({ userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true }, courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true }, enrollmentId: { type: Schema.Types.ObjectId, ref: 'Enrollment' }, method: { type: String, enum: ['bKash', 'Nagad'], required: true }, senderNumber: { type: String, required: true }, amount: { type: Number, required: true }, trxId: { type: String, required: true, unique: true, index: true }, status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true }, submittedAt: { type: Date, default: Date.now }, reviewedAt: Date, reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' }, rejectionReason: String }, { timestamps: true });
schema.pre('save', async function enforceUniqueTransaction() {
  if (this.isModified('trxId')) {
    const existing = await (this.constructor as any).findOne({ trxId: this.trxId, _id: { $ne: this._id } }).lean();
    if (existing) throw new Error('Duplicate transaction ID');
  }
});
export default model('Payment', schema);
