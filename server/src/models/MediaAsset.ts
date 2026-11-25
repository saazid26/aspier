import { Schema, model } from 'mongoose';

const schema = new Schema({
  url: { type: String, required: true },
  publicId: String,
  filename: { type: String, required: true },
  mimeType: String,
  contentType: String,
  data: Buffer,
  size: Number,
  uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  membershipApplicationId: { type: Schema.Types.ObjectId, ref: 'MembershipApplication', index: true }
}, { timestamps: true });

export default model('MediaAsset', schema);

