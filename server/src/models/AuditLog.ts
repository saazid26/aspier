import { Schema, model } from 'mongoose';

const schema = new Schema({
  actorId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  actorName: { type: String, default: 'Anonymous', index: true },
  actorEmail: { type: String, default: '', index: true },
  actorRole: { type: String, default: 'guest', index: true },
  action: { type: String, required: true, index: true },
  description: { type: String, default: '' },
  resource: { type: String, required: true, index: true },
  resourceId: { type: String },
  route: { type: String, default: '' },
  status: { type: String, enum: ['success', 'failure'], default: 'success', index: true },
  ip: { type: String, default: '127.0.0.1' },
  ipAddress: { type: String, default: '127.0.0.1' },
  deviceType: { type: String, enum: ['Mobile', 'Tablet', 'Desktop'], default: 'Desktop' },
  os: { type: String, default: 'Unknown OS' },
  browser: { type: String, default: 'Unknown Browser' },
  userAgent: { type: String, default: '' },
  metadata: { type: Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now, index: true }
}, { timestamps: true });

export default model('AuditLog', schema);
