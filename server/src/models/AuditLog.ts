import { Schema, model } from 'mongoose';
const schema = new Schema({ actorId: { type: Schema.Types.ObjectId, ref: 'User', index: true }, action: { type: String, required: true }, resource: { type: String, required: true, index: true }, resourceId: String, ip: String, userAgent: String, metadata: Schema.Types.Mixed, createdAt: { type: Date, default: Date.now, index: true } });
export default model('AuditLog', schema);
