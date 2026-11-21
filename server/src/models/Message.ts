import { Schema, model } from 'mongoose';
const schema = new Schema({ type: { type: String, enum: ['contact', 'join'], required: true, index: true }, name: { type: String, required: true }, email: { type: String, required: true }, phone: String, subject: String, wingInterest: String, message: { type: String, required: true }, status: { type: String, enum: ['unread', 'read', 'archived'], default: 'unread', index: true } }, { timestamps: true });
export default model('Message', schema);

